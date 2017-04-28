const drachtio = require('drachtio') ;
const app = drachtio() ;
const Srf = require('drachtio-srf'); 
const srf = new Srf(app);
const config = require('./config');
const Logger = require('./lib/logger'); 
const logger = new Logger( config.logging ) ;
const MultipartParser = require('./lib/multipart-parser.js');
const forkStreams = require('./lib/fork-streams') ;
const async = require('async') ;

srf.connect( config.drachtio ) 
.on('connect', (err, hostport) => { logger.info(`connected to drachtio listening on ${hostport}`) ;})
.on('error', (err) => { logger.error(`Error connecting to drachtio at ${config.drachtio}`, err) ; }) ;

srf.locals.logger = logger ;

srf.use('invite', (req, res, next) => {
  logger.info(`${req.get('Call-Id')}: received call from ${req.callingNumber}`);
  req.on('cancel', () => { 
    logger.info(`call canceled by caller`);
    req.canceled = true ;
  }) ;
  next() ;
}) ;

srf.invite( (req, res) => {
  let parser = new MultipartParser( req, logger ) ;
  let fsDialogs = [] ;

  function clearFSDialogs() {
    fsDialogs.forEach( (dlg) => {
      dlg.destroy() ;
    }) ;
    fsDialogs = [] ;
  }

  async.waterfall([

    //parse invite body ..
    (callback) => {
      parser.splitPayloads( (err, fullSdp, sdp1, sdp2, recordingData) => {
        if( err ) { return callback(err); }
        let sessionId = recordingData['tns:recording']['tns:session'][0].$.session_id ;
        let part1 = recordingData['tns:recording']['tns:participant'][0].$.participant_id;
        let part2 = recordingData['tns:recording']['tns:participant'][1].$.participant_id ;
        callback( null, sessionId, part1, sdp1, part2, sdp2 ) ;
      }) ;
    },

    // fork streams to freeswitch
    (sessionId, part1, sdp1, part2, sdp2, callback) => {
      forkStreams( logger, srf, sessionId, part1, sdp1, part2, sdp2, (err, dialogs) => {
        if( err ) {
          logger.info(`Error connecting two streams to freeswitch`, err);
          return callback(err) ;
        }
        Array.prototype.push.apply( fsDialogs, [dialogs[0].dlg, dialogs[1].dlg]) ;

        callback(null, sessionId, part1, sdp1, part2, sdp2, dialogs) ;
      });
    },

    // combine payloads and respond to SRC with 200 OK
    (sessionId, part1, sdp1, part2, sdp2, dialogs, callback) => {
      let sdp = parser.combinePayloads( dialogs[0].dlg.remote.sdp, dialogs[1].dlg.remote.sdp ) ;
      srf.createUasDialog( req, res, { localSdp: sdp }, (err, dlg) => {
        if( err ) { return callback(err); }
        callback(null, dlg);
      });
    }
    ], (err, dlg) => {
      if( err ) {
        logger.info(`error establishing SRS call legs`, err);
        clearFSDialogs() ;
        return ;
      }

      logger.info(`${req.get('Call-Id')}: SIPREC call legs established`);


      // all dialogs established...set up cleanup handler when SRC gives us a BYE
      dlg.on('destroy', () => {
        logger.info(`${req.get('Call-Id')}: SIPREC terminated by SRC`);
        clearFSDialogs() ;
      }) ;
    }) ;
  }) ;

'use strict' ;

const async = require('async');
const config = require('../config') ;

module.exports = createRecordingStreams ;

function createRecordingStreams( logger, srf, sessionId, part1, sdp1, part2, sdp2, callback ) {
  let dialogs = [] ;
  async.each( [{sdp: sdp1, part: part1}, {sdp:sdp2, part:part2}], (item, callback) => {
    let sdp = item.sdp, part = item.part ;
    let sipUri = config.freeswitch.url.replace('$1',sessionId).replace('$2',part) ;
    
    srf.createUacDialog( sipUri, { localSdp: sdp }, (err, dlg) => {
      if( err ) { return callback(err); }
      dialogs.push({ dlg, part }); 
      callback(null) ;
    });
  }, (err) => {
    if( err ) { return callback(err); }
    return callback(null, dialogs) ;
  }) ;
}
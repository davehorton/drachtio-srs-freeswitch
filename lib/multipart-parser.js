'use strict';

const xmlParser = require('xml2js').parseString;

class MultipartParser {
  constructor( req, logger ) {
    this._req = req ;
    this._logger = logger ;
  }

  splitPayloads( callback ) {
    let sdp, meta ;
    let req = this._req ;
    for( let i = 0; i < req.payload.length; i++ ) {
      switch( req.payload[i].type ) {
        case 'application/sdp':
          sdp = req.payload[i].content ;
          break ;

        case 'application/rs-metadata+xml':
          meta = req.payload[i].content ;
          break ;
      }
    }

    if( !sdp || !meta ) {
      return callback( new Error('expected multipart SIPREC body'));
    }

    xmlParser( meta, (err, result) => {
      if( err ) { return callback(err); }

      let arr = /^([^]+)(m=[^]+?)(m=[^]+?)$/.exec( sdp ) ;
      let sdp1 = `${arr[1]}${arr[2]}` ;
      let sdp2 = `${arr[1]}${arr[3]}` ;

      callback( err, sdp, sdp1, sdp2, result ) ;
    }) ;
  }

  combinePayloads( sdp1, sdp2 ) {
    let arr1 = /^([^]+)(c=[^]+)t=[^]+(m=[^]+?)(a=[^]+)$/.exec( sdp1 ) ;
    let arr2 = /^([^]+)(c=[^]+)t=[^]+(m=[^]+?)(a=[^]+)$/.exec( sdp2 ) ;

    let common = arr1[1].replace(/FreeSWITCH/g, 'SimpleSRS') ;
    let sdp = `${common}t=0 0\r\n${arr1[3]}${arr1[2]}${arr1[4]}${arr2[3]}${arr2[2]}${arr2[4]}` ;
    return sdp ;
  }
}

module.exports = MultipartParser ;
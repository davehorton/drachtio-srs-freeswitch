'use strict';

const winston = require('winston') ;
const delegate = require('delegates') ;

class Logger {
  constructor(opts) {

    let transports = [] ;
    opts.transports.forEach( (t) => {
      if( t.filename === 'console') {
        delete t.filename ;
      }
      if( !t.filename ) {
        transports.push( new (winston.transports.Console)(t) ) ;
      }
      else {
        transports.push( new (winston.transports.File)(t) ) ;
      }
    }) ;
    this._logger = new (winston.Logger)({ transports }); 
  }
}

delegate( Logger.prototype, '_logger')
  .method('log')
  .method('error')
  .method('warn')
  .method('info')
  .method('verbose')
  .method('debug')
  .method('silly')
  .method('add')
  .method('remove')
  .method('configure')
  .method('profile')
  .method('query')
  .method('stream')
  .access('level') 
  .setter('exitOnError') ;


module.exports = Logger ;
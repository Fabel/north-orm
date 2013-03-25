var pg = require('pg')

var PgAdapter = function(){
  var config = require(APP_PATH+'/config/config').database;
  this.database = config
  this.connections = []
  this.freeConnectins = []
  for(var i=0; i<config.pool; i++){
    this.connections.push(this.connect(config))
    this.freeConnectins.push(i)
  }
  this.ready = true
}

PgAdapter.prototype = new function(){
  this.connect = function(config){
    var client = new pg.Client(config);
    client.connect(function(err) {
      if(err)
        log(err)
    })
    return client
  }

  this.disconnect = function(){
    for(var i=0; i< this.connections.length; i++){
      this.connections[i].end()
    }
    this.freeConnectins = []
  }

  this.getFree = function(){
    return this.freeConnectins.shift()
  }

  this.exec = function(queryStr, params){
    log(queryStr, params || '')
    var index = this.getFree()
    var client = this.connections[index]
    var freeConnectins = this.freeConnectins
    client.query(queryStr, params, function(err, res){
      if(err)
        log(err, this)
      freeConnectins.unshift(index)
    })
  }

  this.syncExec = function(queryStr, params){
    log(queryStr, params || '')
    var data = []
    var fiber = Fiber.current
    var index = this.getFree()
    var client = this.connections[index]
    var query = client.query(queryStr, params, function(err, res){
      data = err || res
      fiber.run()
    })
    Fiber.yield()
    this.freeConnectins.unshift(index)
    return data
  }

  this.select = function(queryStr, params){
    log(queryStr, params || '')
    var data = []
    var fiber = Fiber.current
    var index = this.getFree()
    var client = this.connections[index]
    var query = client.query(queryStr, params)
    query.on('row', function(row){
      data.push(row)
    })
    query.on('end', function(){ fiber.run() })
    Fiber.yield()
    this.freeConnectins.unshift(index)
    return data
  }
}

module.exports = new PgAdapter

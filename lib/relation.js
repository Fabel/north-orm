var Relation = function(model){
  if(typeof model == 'string')
    this.model = global[model]
  else
    this.model = model
  this.whereConditions = []
  this.orderConditions = ['id']
  this._limit = null
}

var stringParams = function(obj){
  if(typeof obj == "string")
    return "'"+obj+"'"
  else
    return obj
}

var joinConditions = function(condition){
  for(var i=condition.length; i--;)
    if(typeof condition[i] == 'string')
      condition[i] = stringParams(condition[i])
  return condition.join(', ')
}

;(function(){
  this.where = function(condition){
    if(typeof condition == 'string'){
      this.whereConditions.push(condition)
    }else{
      var sql = ''
      var conditions = []
      for(var key in condition){
        if(util.isArray(condition[key]))
          conditions.push(key + ' in (' + joinConditions(condition[key]) + ')')
        else
          conditions.push(key + ' = ' + stringParams(condition[key]))
      }
      sql += conditions.join(' AND ')
      this.whereConditions.push(sql)
    }
    return this
  }

  this.order = function(condition){
    if(this.orderConditions.length == 1)
      this.orderConditions = [condition]
    return this
  }

  this.limit = function(count){
    this._limit = count
    return this
  }

  var makeSql = function(){
    var sql = ''
    if(this.whereConditions.length)
      sql += ' WHERE ' + this.whereConditions.join(' AND ')
    if(this.orderConditions.length)
      sql += ' ORDER BY ' + this.orderConditions.join(', ')
    if(this._limit)
      sql += ' LIMIT ' + this._limit
    return sql
  }

  this.exec = function(){
    var objects = []
    var data = this.model.relationSelect(makeSql.call(this))
    var model = this.model
    data.forEach(function(attrs){
      objects.push(new model(attrs))
    })
    return objects
  }

  this.destroyAll = function(){
    this.orderConditions = []
    return this.model.relationDestroy(makeSql.call(this))
  }

  this.forEach = function(callback){
    return this.exec().forEach(callback)
  }

  this.map = function(callback){
    return this.exec().map(callback)
  }
}).call(Relation.prototype)

module.exports = Relation

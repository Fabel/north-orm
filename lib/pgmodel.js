var PgModel = function(){}
/*
  prortype of model
*/
PgModel.table_columns = null
PgModel.defaultScope = null
PgModel.associationList = null
PgModel.validationList = null
PgModel.protectedAttributes = null
PgModel.className = null
PgModel.isModel = true

;(function(){

  var destroyDependents = function(object){
    if(!this.associationList)
      return
    this.associationList.forEach(function(association){
      object[association]().destroyAll()
    })
  }

  /*
    create new object withot saving in base
    params attributes object
    example: {name: 'Fedor', age: 22}
  */

  this.new = function(attributes){
    var attrs = {}
    extend(attrs, attributes || {})
    for(var key in attrs){
      if(!this.isValidColumn(key))
        delete attrs[key]
    }
    var obj = new this(attrs)
    obj.newRecord = true
    return obj
  }

  //create method, params object with keys as columns

  this.create = function(data){
    if(data.isModel)
      data = data.attributes
    else if(!(new this(data).validate()))
      return false

    for(var key in data){
      if(!this.isValidColumn(key))
        delete data[key]
    }
    var sql = 'INSERT INTO '+this.tableName()+'('
    var attrs = []
    var columns = []
    var params = []
    var i
    if(this.hasTimestamps()){
      columns = columns.concat(['created_at', 'updated_at'])
      attrs = attrs.concat([new Date/1000, new Date/1000])
      params = params.concat(['to_timestamp($1)', 'to_timestamp($2)'])
      i = 3
    }
    if(!i)
      i = 1
    for(var key in data){
      columns.push('' + key)
      params.push('$'+i)
      attrs.push(data[key])
      i++
    }
    sql += columns.join(', ')
    sql += ') VALUES(' + params.join(', ') + ')'
    var result = dbConnection.syncExec(sql, attrs)
    if(result.rowCount)
      return true
    else{
      console.log(result.toString())
      return result
    }
  }

  //update method, params object with keys as columns
  this.update = function(id, data){
    var sql = 'UPDATE '+this.tableName()+' SET '
    var params = []
    var attrs = []
    var i = 1
    if(this.hasTimestamps()){
      delete data.created_at
      delete data.updated_at
      params.push(' updated_at = to_timestamp($'+i+')')
      attrs.push(new Date/1000)
      i++
    }
    for(var key in data){
      params.push(' ' + key + ' = $' + i)
      attrs.push(data[key])
      i++
    }
    sql += params.join(', ')
    sql += ' WHERE id = ' + id
    return dbConnection.syncExec(sql, attrs)
  }

  /*
    destroy for model
    params id and object
    example
    User.destroy(3)  => destrrou user with id 3
    User.destroy([5,7,9]) => destroy 3 users with id 5, 7, 9
    if call from object second param object for destroy dependencies
  */

  this.destroy = function(id, object){
    var sql = 'DELETE FROM '+this.tableName()
    sql += ' WHERE id '
    if(util.isArray(id))
      sql += ' in (' + id.join(', ')+')'
    else
      sql += '= '+id
    if(object)
      destroyDependents.call(this, object)
    return dbConnection.syncExec(sql)
  }

  /*
    destroy all records from table with dependencies
  */
  this.destroyAll = function(){
    var model = this
    this.all().forEach(function(obj){
      destroyDependents.call(model, obj)
    })
    ;(new Relation(this)).destroyAll()
  }

  var selectFrom = function(){
    return 'SELECT * FROM '+this.tableName()
  }

  /*
    records count
  */

  this.count = function(){
    var sql = 'SELECT COUNT(*) FROM '+this.tableName()
    return dbConnection.select(sql)[0].count
  }

  /*
    return first n record from table
    params count - limit of count
  */
  this.first = function(count){
    var sql = selectFrom.call(this)+' LIMIT $1'
    if(!count)
      count = 1
    var data = []
    var model = this
    dbConnection.select(sql, [count]).forEach(function(attrs){
      data.push(new model(attrs))
    })
    return count == 1 ? data[0] : data
  }
  /*
    return last n record from table
    params count - limit of count
  */
  this.last = function(count){
    var sql = selectFrom.call(this)+' ORDER BY id DESC LIMIT $1'
    if(!count)
      count = 1
    var data = []
    var model = this
    dbConnection.select(sql, [count]).forEach(function(attrs){
      data.push(new model(attrs))
    })
    return count == 1 ? data[0] : data
  }

  /*
    return all records from table
  */

  this.all = function(){
    var sql = selectFrom.call(this)
    var data = []
    var model = this
    dbConnection.select(sql).forEach(function(attrs){
      data.push(new model(attrs))
    })
    return data
  }

  /*
    add scope where and return object relation
  */
  this.where = function(condition){
    var relation = new Relation(this)
    relation.where(condition)
    return relation
  }
  /*
    add scope order and return object relation
  */
  this.order = function(condition){
    var relation = new Relation(this)
    relation.order(condition)
    return relation
  }
  /*
    return scope from default relation
  */
  this.scoped = function(){
    if(!this.defaultScope)
      return this.defaultScope = new Relation(this)
    else
      return this.defaultScope
  }
  /*
    return clered relation
  */
  this.unscoped = function(){
    return new Relation(this)
  }

  /*
    return record with id
  */
  this.find = function(id){
    var attrs = dbConnection.select(selectFrom.call(this)+' WHERE id = $1', [id])
    if(attrs.length)
      return new this(attrs[0])
    else
      return null
  }

  /*
    utils query for relation
  */

  this.relationSelect = function(sql){
    return dbConnection.select(selectFrom.call(this)+sql)
  }
  /*
    utils query for relation
  */
  this.relationDestroy = function(sql){
    return dbConnection.syncExec('DELETE FROM '+this.tableName()+sql)
  }
  /*
    return table name for model
  */
  this.tableName = function(){
    return this.table_name
  }
  /*
    return table columns
    and generate methods find_by_[column]
  */
  this.tableColumns = function(){
    if(this.table_columns)
      return this.table_columns
    this.table_columns = dbConnection.select("SELECT column_name FROM information_schema.columns WHERE table_name='"+this.tableName()+"'")
    this.table_columns.forEach(function(column){
      this['find_by_'+column.column_name] = function(value){
        var attrs = dbConnection.select(selectFrom.call(this)+' WHERE '+column.column_name+' = $1', [value])[0]
        if(attrs)
          return new this(attrs)
      }
    }, this)
    return this.table_columns
  }
  /*
    check colum on valid key
  */
  this.isValidColumn = function(column){
    var columns = this.tableColumns().map(function(e){ return e.column_name })
    if(Utils.exclude(this.protectedAttributes, column) && Utils.include(columns, column))
      return true
    return false
  }
  /*
    check has timeshtamp
  */
  this.hasTimestamps = function(){
    return this.isValidColumn('created_at')
  }
  /*
    define has many association
  */
  this.hasMany = function(scopeName, options){
    if(options.dependentDestroy)
      if(this.associationList)
        this.associationList.push(scopeName)
      else
        this.associationList = [scopeName]
    this.prototype[scopeName] = function(){
      if(this.newRecord)
        return null
      var relation = new Relation(options.className)
      var obj = {}
      obj[options.foreignKey] = this.attributes.id || 0
      relation.where(obj)
      return relation
    }
  }
  /*
    define has one association
    options = {
      foreignKey: 'field', //set foreign key for association
      dependentDestroy: true // add destroy dependencies
    }
  */
  this.hasOne = function(scopeName, options){
    if(options.dependetDestroy)
      if(this.associationList)
        this.associationList.push(scopeName)
      else
        this.associationList = [scopeName]
    this.prototype[scopeName] = function(){
      if(this.newRecord)
        return null
      var relation = new Relation(options.className)
      var obj = {}
      obj[options.foreignKey] = this.attributes.id || 0
      return relation.where(obj).limit(1).exec()[0] || null
    }
  }
  /*
    define belongs to association
  */
  this.belongsTo = function(scopeName, options){
    options = options || {}
    options.foreignKey = options.foreignKey || scopeName+'_id'
    options.className = options.className || scopeName
    this.prototype[scopeName] = function(){
      if(!this.attributes[options.foreignKey])
        return null
      var relation = new Relation(options.className)
      var obj = {id: this.attributes[options.foreignKey]}
      return relation.where(obj).limit(1).exec()[0] || null
    }
  }

  /*
    add validation for field
  */
  this.addValidation = function(field, func){
    if(!this.validationList)
      this.validationList = []
    if(typeof func == 'string'){
      func = Validation[func]
      if(!func){
        console.log('validation function does exist')
        return false
      }
    }
    if(typeof field == 'function'){
      this.validationList.push({func: field, attrs: []})
    }else{
      this.validationList.push({func: func, args: arguments})
    }
  }
  /*
    add validate, check validations for object
  */
  this.prototype.validate = function(){
    this.errors = []
    var obj = this
    this.class.validationList.forEach(function(validation){
      validation.func.apply(obj, validation.args)
    })
    return this.errors.length ? false : true
  }
  /*
    save object in base
  */
  this.prototype.save = function(options){
    if(!options) options = {validation: true}
    if(!options.validation || this.validate()){
      this.newRecord ? this.class.create(this.attributes) : this.update(this.attributes)
      this.newRecord = false
      this.oldAttributeValues = {}
    }
    return this
  }
  /*
    update record
  */
  this.prototype.update = function(){
    var id = this.attributes.id
    var data
    if(data = this.cleanData(this.attributes))
      this.class.update(id, data)
  }

  /*
    destroy object with dependencies
  */
  this.prototype.destroy = function(){
    this.class.destroy(this.attributes.id, this)
  }

  this.toString = function(){
    return this.className+" model"
  }
  /*
    inspect object
  */
  this.prototype.inspect = function(){
    var attrs = []
    for(var key in this.attributes){
      attrs.push(''+key + ': ' + this.attributes[key])
    }
    return '{'+ attrs.join(', ') +'}'
  }

  //remove not changed fields
  this.prototype.cleanData = function(data){
    if(!this.oldAttributeValues)
      return false
    var safeData = {}
    extend(safeData, data)
    var columns = Object.getOwnPropertyNames(safeData)
    for(var i=0;i<columns.length;i++){
      if(safeData[columns[i]] == this.oldAttributeValues[columns[i]] || this.oldAttributeValues[columns[i]] === undefined)
        delete safeData[columns[i]]
    }
    return safeData
  }

  this.prototype.toString = function(){
    return this.inspect()
  }
  /*
    protect attributes
  */
  this.protectAttributes = function(attributes){
    if(!this.protectedAttributes){
      this.protectedAttributes = []
      this.protectedAttributes = this.protectedAttributes.concat(attributes)
    }else
      this.protectedAttributes = this.protectedAttributes.concat(attributes)
  }
  /*
    define all setters for attributes except protected attributes
  */
  this.defineSetters = function(){
    var columns = this.tableColumns()
    var model = this
    columns.forEach(function(column){
      model.prototype.__defineSetter__(column.column_name, function(val){
        if(Utils.exclude(model.protectedAttributes, column.column_name)){
          if(!this.oldAttributeValues)
            this.oldAttributeValues = {}
          if(!this.oldAttributeValues[column.column_name])
            this.oldAttributeValues[column.column_name] = this.attributes[column.column_name]
          this.attributes[column.column_name] = val
        }else
          console.log('cant assign protected attribute')
      })
    })
  }
  /*
    define getters for attributes
  */
  this.defineGetters = function(){
    var columns = this.tableColumns()
    var model = this.prototype
    columns.forEach(function(column){
      model.__defineGetter__(column.column_name, function(){
        return this.attributes[column.column_name]
      })
    })
  }

}).call(PgModel)

module.exports = PgModel

var Migration = function(){}

Migration.prototype = new function(){
  this.tableName = ''
  this.queryList = []

  //generate up migration query for run_migrations task
  this.up = function(){ }

  //generate rollback migration query for rollback_migrations task
  this.down = function(){ }

  //runing after run()
  this.afterMigration = function(){ }

  //runing before run()
  this.beforeMigration = function(){ }

  //runing after rollback()
  this.afterRollback = function(){ }

  //runing before rollback()
  this.beforeRollback = function(){ }

  //run migrations IO
  this.run = function(number){
    var queryList = this.queryList
    if(this.upgrade)
      this.beforeMigration()
    else
      this.beforeRollback()

    var fail = false
    queryList.forEach(function(query){
      var res = dbConnection.syncExec(query)
      if(res.name == 'error'){
        console.log(res.toString())
        fail = true
      }
    })
    if(fail)
      return false
    if(this.upgrade){
      dbConnection.syncExec("INSERT INTO schema_migrations(version) VALUES($1)", [number.toString()])
      this.afterMigration()
    }else{
      dbConnection.syncExec("DELETE FROM schema_migrations WHERE version = $1", [number.toString()])
      this.afterRollback()
    }
    return true
  }

  //Table object generate query for CREATE TABLE
  var Table = function(tableName){
    this.tableName = tableName
    this.columns = ["id serial NOT NULL"]
    this.addColumn = function(column, type, defaultValue){
      var column = column+" "+getType(type)
      if(typeof defaultValue != 'undefined')
        column += ' DEFAULT '+defaultValue
      this.columns.push(column)
    }

    this.addTimestamps = function(){
      this.columns.push('created_at'+getType('timedate'))
      this.columns.push('updated_at'+getType('timedate'))
    }

    this.addPrimaryKey = function(){
      this.columns.push("CONSTRAINT "+this.tableName+"_pkey PRIMARY KEY (id )")
    }
  }

  //create table method
  this.createTable = function(tableName, callback){
    this.tableName = tableName
    var sql = 'CREATE TABLE '+ tableName + ' ('
    var table = new Table(tableName)
    callback.call(table)
    table.addPrimaryKey()
    sql+= table.columns.join(", ")
    sql+= ");"
    this.queryList.push(sql)
  }

  //drop table method
  this.dropTable = function(tableName){
    var sql = 'DROP TABLE ' + tableName + ';'
    this.queryList.push(sql)
  }

  //return sql types for aliases
  var getType = function(type){
    switch(type){
      case 'integer':
        return ' integer'
      case 'string':
        return ' character varying(255)'
      case 'text':
        return ' text'
      case 'timedate':
        return ' timestamp without time zone NOT NULL'
    }
  }

  //add column to table method
  this.addColumn = function(tableName, column, type, defaultValue){
    sql = 'ALTER TABLE ' + tableName + ' ADD COLUMN ' + column
    sql += getType(type)
    if(defaultValue)
      sql += " DEFAULT " + defaultValue
    this.queryList.push(sql)
  }
  //add index to column
  this.addIndex = function(tableName, column){
    var sql = 'CREATE UNIQUE INDEX index_'+tableName+'_on_'+column
    sql+= ' ON '+tableName+' USING btree ('+column+')'
    this.queryList.push(sql)
  }
  //remove column from table
  this.removeColumn = function(tableName, column){
    var sql = 'ALTER TABLE ' + tableName + ' DROP COLUMN ' + column
    this.queryList.push(sql)
  }

  //change column name
  this.renameColumn = function(tableName, column, newname){
    var sql = 'ALTER TABLE ' + tableName + ' RENAME COLUMN ' + column + ' TO ' + newname
    this.queryList.push(sql)
  }

  //change column name
  this.changeColumn = function(tableName, column, type){
    var sql = 'ALTER TABLE ' + tableName + ' ALTER COLUMN ' + column + ' TYPE ' + getType(type)
    this.queryList.push(sql)
  }

  //add sql query to query list
  this.exec = function(sql){
    this.queryList.push(sql)
  }
}

module.exports = Migration

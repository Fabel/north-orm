var fs = require('fs')

module.exports = function(){
  var modelsDir = APP_PATH + '/app/models/'

  var modelFiles = fs.readdirSync(modelsDir)
  var models = []

  modelFiles.forEach(function(model){
    var fileName = model.match(/(.+).js/)[1]
    var modelName = Utils.Constantize(fileName)
    var model = require(modelsDir+fileName)
    var modelClass = model[modelName]

    models.push({model: model, modelClass: modelClass})

    extend(modelClass, PgModel)
    extend(modelClass.prototype, PgModel.prototype)
    Fiber(function(){
      modelClass.defineGetters()
      modelClass.defineSetters()
    }).run()

    modelClass.prototype.class = modelClass
    modelClass.className = modelName
    global[modelName] = modelClass
  })

  models.forEach(function(file){
    file.modelClass.protectAttributes('id')
    file.modelClass.validationList = []
    file.model.classMethods.call(file.modelClass)
    file.model.objectMethods.call(file.modelClass.prototype)
  })
}

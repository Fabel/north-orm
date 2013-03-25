var Validation = {
  /*
    validation arguments
    first - filed
    second - callback name
    next.. - validation params
    example:  see greater_than
  */
  presence: function(field){
    if(typeof this.attributes[field] == 'number' || this.attributes[field])
      return true
    else
      this.errors.push(field + " can't be null!")
  },
  greater_than: function(field){
    var num = arguments[2]
    if(!this.attributes[field] || this.attributes[field] <= num )
      this.errors.push(field + " should be greater than " + num + "!")
    else
      return true
  },
  min_length:  function(field){
    var len = arguments[2]
    if(!this.attributes[field] || this.attributes[field].length < len )
      this.errors.push(field + " length should be greater than " + len + "!")
    else
      return true
  },
  email: function(field){
    if(this.attributes[field] && this.attributes[field].match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/))
      return true
    else
      this.errors.push(field + " invalid email")
  },
  uniqueness: function(field){
    if(!this.newRecord)
      return true
    var param = this.attributes[field]
    if(typeof this.attributes[field] == 'string')
      param = "'"+this.attributes[field]+"'"
    if(this.attributes[field] && this.class.where(field + " =" + param).exec().length)
      this.errors.push(field + ' should be uniq')
    else
      return true
  }
}


module.exports = Validation

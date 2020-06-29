// External Dependancies
const mongoose = require('mongoose')

const feedSchema = new mongoose.Schema({
  name: String,
  url: String
})

module.exports = mongoose.model('Feed', feedSchema)
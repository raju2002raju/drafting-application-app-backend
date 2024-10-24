const mongoose = require('mongoose')

const dynamicSchema = new mongoose.Schema({
  Sheet1: [{
    'Name of Fields': String,
    'Example Content': String
  }]
}, { strict: false });

const DynamicModel = mongoose.model('DynamicData', dynamicSchema, 'sectiondatas');

module.exports= DynamicModel;
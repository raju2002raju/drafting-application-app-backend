const mongoose = require('mongoose')

const dynamicSchema = new mongoose.Schema({
  Sheet1: [{
    'NameofFields': String,
    'ExampleContent': String
  }]
}, { strict: false });

const DynamicModel = mongoose.model('DynamicData', dynamicSchema, 'sectiondatas');

module.exports= DynamicModel;
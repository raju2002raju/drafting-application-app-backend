// dbConnection.js

const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://royr55601:royr55601@cluster0.xra8inl.mongodb.net/legalDrafting/draftingdata', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

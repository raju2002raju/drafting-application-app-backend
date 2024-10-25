const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define MongoDB Schema with exact field names
const sectionDataSchema = new mongoose.Schema({
  Sheet1: [{
    'NameofFields': {  // Changed to match the frontend
      type: String,
      required: true
    },
    'ExampleContent': {  // Changed to match the frontend
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Create MongoDB Model
const SectionData = mongoose.model('SectionData', sectionDataSchema, 'sectiondatas');

// POST endpoint to create new section data
router.post('/court-document', async (req, res) => {
  try {
    const { Sheet1 } = req.body;

    // Validate request body
    if (!Sheet1 || !Array.isArray(Sheet1)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Sheet1 must be an array.'
      });
    }

    // Create new document with exact field names
    const newSectionData = new SectionData({
      Sheet1: Sheet1.map(item => ({
        NameofFields: item.NameofFields,
        ExampleContent: item.ExampleContent
      }))
    });

    // Save to database
    await newSectionData.save();

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: newSectionData
    });

  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document',
      error: error.message
    });
  }
});

// Rest of the routes remain the same...

module.exports = router;
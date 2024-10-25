const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Function to format field name for environment variable
function formatFieldName(fieldName) {
  return fieldName
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

// Function to remove quotes from prompt
function removeQuotes(prompt) {
  return prompt.replace(/['"`]/g, '');
}

router.post('/update-env', async (req, res) => {
  try {
    const { prompts } = req.body;

    if (!prompts || Object.keys(prompts).length === 0) {
      return res.status(400).json({ error: 'No prompts provided' });
    }

    const envPath = path.resolve(__dirname, '../.env');
    let envContent = await fs.readFile(envPath, 'utf8');

    // Remove all existing prompt entries
    envContent = envContent.split('\n')
      .filter(line => !line.startsWith('PROMPT_'))
      .join('\n');

    // Add new prompt entries
    for (const [fieldName, prompt] of Object.entries(prompts)) {
      const formattedFieldName = formatFieldName(fieldName);
      const cleanedPrompt = removeQuotes(prompt);
      envContent += `\nPROMPT_${formattedFieldName}=${cleanedPrompt}`;
    }

    // Remove any trailing newlines
    envContent = envContent.trim();

    await fs.writeFile(envPath, envContent);

    console.log('Updated .env file with new prompts');
    res.json({ 
      message: 'Environment file updated successfully', 
      updatedPrompts: Object.keys(prompts).map(fieldName => ({
        original: fieldName,
        formatted: formatFieldName(fieldName)
      }))
    });
  } catch (error) {
    console.error('Error updating .env file:', error);
    res.status(500).json({ error: 'Error updating environment file' });
  }
});

module.exports = router;
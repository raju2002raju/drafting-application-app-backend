require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// CORS configuration
app.use(cors({
  origin: '*' , // Specify your frontend origin
  credentials: true // Allow cookies and other credentials to be sent
}));


app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://royr55601:royr55601@cluster0.xra8inl.mongodb.net/legaldrafting', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    }); 
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

// Routes
const transcriptionRoutes = require('./Routes/transcription');
const promptRoutes = require('./Routes/promptRoutes');
const apiRoutes = require('./Routes/sectionRoutes');
const backendRoutes = require('./Routes/Backendaudiioprocessing');
const updateprompts = require('./Routes/updateprompts');
const aiBot = require('./Routes/aiChatBot');
const exportFile = require('./Routes/exportFiles');
const aiAudioChat = require('./Routes/aiAudioChat');
const courtDocumentRoutes = require('./Routes/courtDocumentRoutes');
const pdfExport = require('./Routes/pdfExtract');

// API routes
app.use('/api', apiRoutes);
app.use('/api', transcriptionRoutes);
app.use('/api', promptRoutes); 
app.use('/api', backendRoutes); 
app.use('/api', aiBot);
app.use('/api', exportFile);
app.use('/api', aiAudioChat);
app.use('/api', courtDocumentRoutes);
app.use('/api', pdfExport);
app.use('/updateprompt', updateprompts);

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something broke!' });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).send({ error: 'Route not found' });
});
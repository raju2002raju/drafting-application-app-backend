// Required dependencies
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
require('dotenv').config();
const router = express.Router();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Store OTPs in memory (use a proper database in production)
const otpStore = new Map();

// Send OTP route
router.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        // Validate phone number
        if (!phoneNumber || phoneNumber.length !== 10) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid 10-digit phone number'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with phone number (with 5-minute expiry)
        otpStore.set(phoneNumber, {
            otp,
            expiry: Date.now() + 5 * 60 * 1000 // 5 minutes expiry
        });

        // Send OTP via Twilio
        await client.messages.create({
            body: `Your FirstDRAFT verification code is: ${otp}`,
            to: `+91${phoneNumber}`,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
});

// Verify OTP route
router.post('/verify-otp', (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        // Validate input
        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        // Get stored OTP data
        const storedData = otpStore.get(phoneNumber);

        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not found'
            });
        }

        // Check OTP expiry
        if (Date.now() > storedData.expiry) {
            otpStore.delete(phoneNumber);
            return res.status(400).json({
                success: false,
                message: 'OTP has expired'
            });
        }

        // Verify OTP
        if (storedData.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

   
        otpStore.delete(phoneNumber);

   

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
            // token: 'your-jwt-token'  // Add this in production
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
});


router.post((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

module.exports=router;

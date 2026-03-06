const twilio = require('twilio');
const User = require('../models/userModel');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const VERIFY_SID = process.env.TWILIO_VERIFY_SID;

// @desc    Send OTP via SMS or Email
// @route   POST /api/otp/send
// @access  Public
const sendOtp = async (req, res) => {
    try {
        const { to, channel } = req.body;
        // channel: 'sms' for phone, 'email' for email

        if (!to || !channel) {
            return res.status(400).json({ success: false, message: 'Recipient and channel are required' });
        }

        if (!['sms', 'email'].includes(channel)) {
            return res.status(400).json({ success: false, message: 'Channel must be sms or email' });
        }

        // Validate recipient format before calling Twilio.
        if (channel === 'sms') {
            // Twilio Verify expects E.164 format, e.g. +14155552671.
            const e164Pattern = /^\+[1-9]\d{7,14}$/;
            if (!e164Pattern.test(to)) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number must be in E.164 format (example: +14155552671)',
                });
            }
        }

        if (channel === 'email') {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(to)) {
                return res.status(400).json({ success: false, message: 'Invalid email address format' });
            }
        }

        // If email, check if already registered
        if (channel === 'email') {
            const existingUser = await User.findOne({ email: to });
            if (existingUser) {
                return res.status(409).json({ success: false, message: 'Email is already registered' });
            }
        }

        const verification = await client.verify.v2
            .services(VERIFY_SID)
            .verifications.create({ to, channel });

        res.status(200).json({
            success: true,
            message: `OTP sent via ${channel}`,
            status: verification.status,
        });
    } catch (error) {
        console.error('OTP send error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to send OTP: ' + error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/otp/verify
// @access  Public
const verifyOtp = async (req, res) => {
    try {
        const { to, code } = req.body;

        if (!to || !code) {
            return res.status(400).json({ success: false, message: 'Recipient and code are required' });
        }

        const check = await client.verify.v2
            .services(VERIFY_SID)
            .verificationChecks.create({ to, code });

        if (check.status === 'approved') {
            res.status(200).json({ success: true, message: 'Verification successful' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        console.error('OTP verify error:', error.message);
        res.status(500).json({ success: false, message: 'Verification failed: ' + error.message });
    }
};

module.exports = { sendOtp, verifyOtp };

const nodemailer = require('nodemailer');
const User = require('../models/userModel');

// In-memory OTP store: { email: { code, expiresAt } }
const otpStore = {};

// Educational email domain validation
const EDUCATIONAL_DOMAINS = ['.edu', '.ac.in', '.edu.in', '.ac.uk', '.edu.au'];

function isEducationalEmail(email) {
    const lower = email.toLowerCase();
    return EDUCATIONAL_DOMAINS.some((domain) => lower.endsWith(domain));
}

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Generate 6-digit OTP
function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// @desc    Send OTP via Email
// @route   POST /api/otp/send-email
// @access  Public
const sendEmailOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email address format' });
        }

        // Validate educational email
        if (!isEducationalEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Only educational email addresses are allowed (e.g., .edu, .ac.in)',
            });
        }

        // Check if already registered
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email is already registered' });
        }

        // Generate and store OTP (5 minute expiry)
        const code = generateOtp();
        otpStore[email.toLowerCase()] = {
            code,
            expiresAt: Date.now() + 5 * 60 * 1000,
        };

        // Send email
        await transporter.sendMail({
            from: `"CRISMATECH Portal" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your CRISMATECH Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                    <h2 style="color: #0056D2; margin-bottom: 16px;">Email Verification</h2>
                    <p>Your verification code is:</p>
                    <div style="background: #f0f4ff; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0056D2;">${code}</span>
                    </div>
                    <p style="color: #666; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
                </div>
            `,
        });

        res.status(200).json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
        console.error('OTP send error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to send OTP: ' + error.message });
    }
};

// @desc    Verify Email OTP
// @route   POST /api/otp/verify-email
// @access  Public
const verifyEmailOtp = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and code are required' });
        }

        const stored = otpStore[email.toLowerCase()];
        if (!stored) {
            return res.status(400).json({ success: false, message: 'No OTP found for this email. Please request a new one.' });
        }

        if (Date.now() > stored.expiresAt) {
            delete otpStore[email.toLowerCase()];
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        if (stored.code !== code) {
            return res.status(400).json({ success: false, message: 'Invalid OTP code' });
        }

        // OTP valid — remove from store
        delete otpStore[email.toLowerCase()];

        res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.error('OTP verify error:', error.message);
        res.status(500).json({ success: false, message: 'Verification failed: ' + error.message });
    }
};

module.exports = { sendEmailOtp, verifyEmailOtp };

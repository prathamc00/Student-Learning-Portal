const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const path = require('path');

// Helper: generate signed JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, college, branch, semester, phone, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email is already registered' });
        }

        const user = await User.create({ name, email, password, college, branch, semester, phone, role });
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                college: user.college,
                branch: user.branch,
                semester: user.semester,
                phone: user.phone,
                role: user.role,
                aadhaarVerified: user.aadhaarVerified,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                college: user.college,
                branch: user.branch,
                semester: user.semester,
                phone: user.phone,
                role: user.role,
                aadhaarVerified: user.aadhaarVerified,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get current logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('enrolledCourses', 'title category level');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                college: user.college,
                branch: user.branch,
                semester: user.semester,
                phone: user.phone,
                role: user.role,
                aadhaarCardPath: user.aadhaarCardPath,
                aadhaarVerified: user.aadhaarVerified,
                enrolledCourses: user.enrolledCourses,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const allowedFields = ['name', 'phone', 'college', 'branch', 'semester'];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                college: user.college,
                branch: user.branch,
                semester: user.semester,
                phone: user.phone,
                role: user.role,
                aadhaarVerified: user.aadhaarVerified,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Upload Aadhaar card
// @route   POST /api/auth/me/aadhaar
// @access  Private
const uploadAadhaar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an Aadhaar card file' });
        }

        const filePath = req.file.path.replace(/\\/g, '/');
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { aadhaarCardPath: filePath, aadhaarVerified: false },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Aadhaar card uploaded successfully. Verification pending.',
            aadhaarCardPath: filePath,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Enroll in a course
// @route   POST /api/auth/me/enroll/:courseId
// @access  Private
const enrollCourse = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.enrolledCourses.includes(req.params.courseId)) {
            return res.status(409).json({ success: false, message: 'Already enrolled in this course' });
        }

        user.enrolledCourses.push(req.params.courseId);
        await user.save();

        res.status(200).json({ success: true, message: 'Enrolled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email address' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists with that email, a password reset link has been sent.',
            });
        }

        const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const resetLink = `http://localhost:5501/password/reset.html?token=${resetToken}`;
        console.log(`[Password Reset] Reset link for ${email}: ${resetLink}`);

        res.status(200).json({
            success: true,
            message: 'Password reset link has been sent to your email. Link expires in 15 minutes.',
            resetLink,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = { register, login, getMe, updateProfile, uploadAadhaar, enrollCourse, forgotPassword, resetPassword };

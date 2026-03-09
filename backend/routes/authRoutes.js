const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { register, login, getMe, updateProfile, uploadAadhaar, enrollCourse, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Aadhaar upload config
const aadhaarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'aadhaar')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `aadhaar_${req.user.id}_${Date.now()}${ext}`);
    },
});
const aadhaarUpload = multer({
    storage: aadhaarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only PDF, JPG, or PNG files are allowed'));
    },
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.post('/me/aadhaar', protect, aadhaarUpload.single('aadhaarCard'), uploadAadhaar);
router.post('/me/enroll/:courseId', protect, enrollCourse);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
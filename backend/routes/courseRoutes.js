const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { getCourses, getCourseById, createCourse, updateCourse, deleteCourse, getModules, addModule, updateModule, deleteModule, reorderModules } = require('../controllers/courseController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Video upload config
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'videos')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `video_${Date.now()}${ext}`);
    },
});
const videoUpload = multer({
    storage: videoStorage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
    fileFilter: (req, file, cb) => {
        const allowed = ['.mp4', '.mkv', '.avi', '.webm', '.mov'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only video files are allowed'));
    },
});

// Course CRUD
router.get('/', getCourses);
router.get('/:id', getCourseById);
router.post('/', protect, adminOnly, createCourse);
router.put('/:id', protect, adminOnly, updateCourse);
router.delete('/:id', protect, adminOnly, deleteCourse);

// Module / Video management
router.get('/:id/modules', getModules);
router.post('/:id/modules', protect, adminOnly, videoUpload.single('video'), addModule);
router.put('/:id/modules/reorder', protect, adminOnly, reorderModules);
router.put('/:id/modules/:moduleId', protect, adminOnly, videoUpload.single('video'), updateModule);
router.delete('/:id/modules/:moduleId', protect, adminOnly, deleteModule);

module.exports = router;

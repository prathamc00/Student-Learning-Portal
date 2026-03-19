const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { protect, staffOnly, optionalAuth } = require('../../middlewares/auth.middleware');
const { getCourses, getManagedCourses, getCourseById, createCourse, updateCourse, deleteCourse, getModules, addModule, updateModule, deleteModule, reorderModules, enrollCourse, unenrollCourse, getMyEnrollments } = require('./course.controller');

// Media upload config
const mediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'video') {
            cb(null, path.join(__dirname, '..', '..', 'uploads', 'videos'));
        } else if (file.fieldname === 'notes') {
            cb(null, path.join(__dirname, '..', '..', 'uploads', 'notes'));
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}_${Date.now()}${ext}`);
    },
});
const mediaUpload = multer({
    storage: mediaStorage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (file.fieldname === 'video') {
            const allowed = ['.mp4', '.mkv', '.avi', '.webm', '.mov'];
            if (allowed.includes(ext)) cb(null, true);
            else cb(new Error('Only video files are allowed'));
        } else if (file.fieldname === 'notes') {
            const allowed = ['.pdf'];
            if (allowed.includes(ext)) cb(null, true);
            else cb(new Error('Only PDF files are allowed for notes'));
        } else {
            cb(new Error('Invalid field name'));
        }
    },
});

// Course CRUD
router.get('/', getCourses);
router.get('/manage', protect, staffOnly, getManagedCourses);
router.get('/my-enrollments', protect, getMyEnrollments);
router.get('/:id', optionalAuth, getCourseById);
router.post('/', protect, staffOnly, createCourse);
router.put('/:id', protect, staffOnly, updateCourse);
router.delete('/:id', protect, staffOnly, deleteCourse);

// Enrollment
router.post('/:id/enroll', protect, enrollCourse);
router.delete('/:id/enroll', protect, unenrollCourse);

// Module / Video management
router.get('/:id/modules', getModules);
router.post('/:id/modules', protect, staffOnly, mediaUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'notes', maxCount: 1 }]), addModule);
router.put('/:id/modules/reorder', protect, staffOnly, reorderModules);
router.put('/:id/modules/:moduleId', protect, staffOnly, mediaUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'notes', maxCount: 1 }]), updateModule);
router.delete('/:id/modules/:moduleId', protect, staffOnly, deleteModule);

module.exports = router;

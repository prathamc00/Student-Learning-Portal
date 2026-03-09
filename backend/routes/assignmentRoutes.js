const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const {
    getAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    submitAssignment,
    getSubmissions,
    getMySubmissions,
    gradeSubmission,
} = require('../controllers/assignmentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Assignment file upload config
const assignmentStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'assignments')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `submission_${req.user.id}_${Date.now()}${ext}`);
    },
});
const assignmentUpload = multer({
    storage: assignmentStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.py', '.js', '.java', '.cpp', '.c'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('File type not allowed'));
    },
});

router.get('/', getAssignments);
router.get('/my-submissions', protect, getMySubmissions);
router.get('/:id', getAssignmentById);
router.post('/', protect, adminOnly, createAssignment);
router.put('/:id', protect, adminOnly, updateAssignment);
router.delete('/:id', protect, adminOnly, deleteAssignment);
router.post('/:id/submit', protect, assignmentUpload.single('file'), submitAssignment);
router.get('/:id/submissions', protect, adminOnly, getSubmissions);
router.put('/submissions/:id/grade', protect, adminOnly, gradeSubmission);

module.exports = router;

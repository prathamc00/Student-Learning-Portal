const express = require('express');
const router = express.Router();
const {
    getTests,
    getTestById,
    createTest,
    updateTest,
    deleteTest,
    startQuiz,
    submitQuiz,
    getMyAttempts,
    getQuizResults,
} = require('../controllers/testController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getTests);
router.get('/my-attempts', protect, getMyAttempts);
router.get('/:id', getTestById);
router.post('/', protect, adminOnly, createTest);
router.put('/:id', protect, adminOnly, updateTest);
router.delete('/:id', protect, adminOnly, deleteTest);
router.post('/:id/start', protect, startQuiz);
router.post('/:id/submit', protect, submitQuiz);
router.get('/:id/results', protect, adminOnly, getQuizResults);

module.exports = router;

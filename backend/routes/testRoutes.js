const express = require('express');
const {
    getTests,
    getTestById,
    createTest,
    updateTest,
    deleteTest,
} = require('../controllers/testController');

const router = express.Router();

router.route('/').get(getTests).post(createTest);
router.route('/:id').get(getTestById).put(updateTest).delete(deleteTest);

module.exports = router;

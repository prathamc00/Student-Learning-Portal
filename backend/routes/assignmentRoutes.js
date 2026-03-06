const express = require('express');
const {
    getAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
} = require('../controllers/assignmentController');

const router = express.Router();

router.route('/').get(getAssignments).post(createAssignment);
router.route('/:id').get(getAssignmentById).put(updateAssignment).delete(deleteAssignment);

module.exports = router;

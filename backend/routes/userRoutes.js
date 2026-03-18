const express = require('express');
const { getUsers, deleteUser, updateInstructorStatus } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, adminOnly, getUsers);
router.patch('/:id/approval-status', protect, adminOnly, updateInstructorStatus);
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;

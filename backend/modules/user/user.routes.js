const express = require('express');
const { getUsers, deleteUser, updateInstructorStatus, exportUsersCSV } = require('./user.controller');
const { protect, adminOnly } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.get('/export', protect, adminOnly, exportUsersCSV);
router.get('/', protect, adminOnly, getUsers);
router.patch('/:id/approval-status', protect, adminOnly, updateInstructorStatus);
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;

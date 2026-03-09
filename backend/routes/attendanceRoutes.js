const express = require('express');
const router = express.Router();
const { trackActivity, getMyAttendance, getCourseAttendance, getAllAttendance } = require('../controllers/attendanceController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/', protect, trackActivity);
router.get('/my', protect, getMyAttendance);
router.get('/course/:courseId', protect, adminOnly, getCourseAttendance);
router.get('/', protect, adminOnly, getAllAttendance);

module.exports = router;

const express = require('express');
const {
    getAttendanceRecords,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance,
} = require('../controllers/attendanceController');

const router = express.Router();

router.route('/').get(getAttendanceRecords).post(createAttendance);
router.route('/:id').get(getAttendanceById).put(updateAttendance).delete(deleteAttendance);

module.exports = router;

const Attendance = require('../models/attendanceModel');

// @desc    Track a student activity (auto-attendance)
// @route   POST /api/attendance
// @access  Private
const trackActivity = async (req, res) => {
    try {
        const { courseId, activityType, details } = req.body;

        if (!activityType) {
            return res.status(400).json({ success: false, message: 'Activity type is required' });
        }

        const record = await Attendance.create({
            student: req.user._id,
            course: courseId || null,
            activityType,
            details: details || '',
        });

        res.status(201).json({ success: true, message: 'Activity tracked', record });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to track activity', error: error.message });
    }
};

// @desc    Get logged-in student's attendance
// @route   GET /api/attendance/my
// @access  Private
const getMyAttendance = async (req, res) => {
    try {
        const records = await Attendance.find({ student: req.user._id })
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: records.length, records });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
    }
};

// @desc    Get attendance records for a course (admin)
// @route   GET /api/attendance/course/:courseId
// @access  Private (admin)
const getCourseAttendance = async (req, res) => {
    try {
        const records = await Attendance.find({ course: req.params.courseId })
            .populate('student', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: records.length, records });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch course attendance', error: error.message });
    }
};

// @desc    Get all attendance records (admin)
// @route   GET /api/attendance
// @access  Private (admin)
const getAllAttendance = async (req, res) => {
    try {
        const records = await Attendance.find({})
            .populate('student', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: records.length, records });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
    }
};

module.exports = { trackActivity, getMyAttendance, getCourseAttendance, getAllAttendance };

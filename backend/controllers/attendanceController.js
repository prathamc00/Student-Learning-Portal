const Attendance = require('../models/attendanceModel');

const getAttendanceRecords = async (req, res) => {
    try {
        const records = await Attendance.find({}).sort({ date: -1, createdAt: -1 });
        res.status(200).json({ success: true, count: records.length, records });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance records', error: error.message });
    }
};

const getAttendanceById = async (req, res) => {
    try {
        const record = await Attendance.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }
        res.status(200).json({ success: true, record });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance record', error: error.message });
    }
};

const createAttendance = async (req, res) => {
    try {
        const record = await Attendance.create(req.body);
        res.status(201).json({ success: true, message: 'Attendance record created', record });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to create attendance record', error: error.message });
    }
};

const updateAttendance = async (req, res) => {
    try {
        const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!record) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }

        res.status(200).json({ success: true, message: 'Attendance record updated', record });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to update attendance record', error: error.message });
    }
};

const deleteAttendance = async (req, res) => {
    try {
        const record = await Attendance.findByIdAndDelete(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }

        res.status(200).json({ success: true, message: 'Attendance record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete attendance record', error: error.message });
    }
};

module.exports = {
    getAttendanceRecords,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance,
};

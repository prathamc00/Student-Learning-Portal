const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        studentName: {
            type: String,
            required: [true, 'Student name is required'],
            trim: true,
        },
        course: {
            type: String,
            required: [true, 'Course is required'],
            trim: true,
        },
        date: {
            type: Date,
            required: [true, 'Attendance date is required'],
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'late'],
            default: 'present',
        },
        remarks: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Attendance', attendanceSchema);

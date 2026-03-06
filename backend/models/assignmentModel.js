const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Assignment title is required'],
            trim: true,
        },
        course: {
            type: String,
            required: [true, 'Course is required'],
            trim: true,
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },
        status: {
            type: String,
            enum: ['pending', 'submitted', 'overdue'],
            default: 'pending',
        },
        maxMarks: {
            type: Number,
            min: 1,
            default: 100,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);

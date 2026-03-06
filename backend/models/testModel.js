const mongoose = require('mongoose');

const testSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Test title is required'],
            trim: true,
        },
        course: {
            type: String,
            required: [true, 'Course is required'],
            trim: true,
        },
        totalQuestions: {
            type: Number,
            min: 1,
            required: true,
        },
        durationMinutes: {
            type: Number,
            min: 1,
            required: true,
        },
        status: {
            type: String,
            enum: ['upcoming', 'completed'],
            default: 'upcoming',
        },
        scheduledDate: Date,
        score: {
            type: Number,
            min: 0,
            max: 100,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Test', testSchema);

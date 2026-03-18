const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Certificate title is required'],
            trim: true,
        },
        course: {
            type: String,
            required: [true, 'Course is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: ['earned', 'inProgress', 'pending', 'locked'],
            default: 'pending',
        },
        earnedDate: Date,
        progressPercent: {
            type: Number,
            min: 0,
            max: 100,
        },
        completionRequirement: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);

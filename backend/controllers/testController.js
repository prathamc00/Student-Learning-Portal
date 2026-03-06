const Test = require('../models/testModel');

const getTests = async (req, res) => {
    try {
        const tests = await Test.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: tests.length, tests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tests', error: error.message });
    }
};

const getTestById = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }
        res.status(200).json({ success: true, test });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch test', error: error.message });
    }
};

const createTest = async (req, res) => {
    try {
        const test = await Test.create(req.body);
        res.status(201).json({ success: true, message: 'Test created', test });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to create test', error: error.message });
    }
};

const updateTest = async (req, res) => {
    try {
        const test = await Test.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }
        res.status(200).json({ success: true, message: 'Test updated', test });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to update test', error: error.message });
    }
};

const deleteTest = async (req, res) => {
    try {
        const test = await Test.findByIdAndDelete(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }
        res.status(200).json({ success: true, message: 'Test deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete test', error: error.message });
    }
};

module.exports = {
    getTests,
    getTestById,
    createTest,
    updateTest,
    deleteTest,
};

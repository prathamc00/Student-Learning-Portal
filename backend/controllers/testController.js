const Test = require('../models/testModel');
const Course = require('../models/courseModel');
const QuizAttempt = require('../models/quizAttemptModel');

const canManageTest = (test, user) => user.role === 'admin' || String(test.createdBy) === String(user._id);

const ensureTestAccess = (test, user) => {
    if (!canManageTest(test, user)) {
        const error = new Error('You can only manage quizzes that you created');
        error.statusCode = 403;
        throw error;
    }
};

const ensureCourseOwnership = (course, user) => {
    if (user.role === 'admin') {
        return;
    }

    if (String(course.createdBy) !== String(user._id)) {
        const error = new Error('You can only create quizzes for your own courses');
        error.statusCode = 403;
        throw error;
    }
};

const getManagedTests = async (req, res) => {
    try {
        const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
        const tests = await Test.find(filter).populate('course', 'title').sort({ startTime: -1 });
        res.status(200).json({ success: true, count: tests.length, tests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch managed quizzes', error: error.message });
    }
};

// @desc    Get all tests
// @route   GET /api/tests
// @access  Public
const getTests = async (req, res) => {
    try {
        const tests = await Test.find({}).populate('course', 'title').sort({ startTime: -1 });
        // Strip correct answers for non-admin
        const isAdmin = req.user && req.user.role === 'admin';
        const sanitized = tests.map((t) => {
            const obj = t.toObject();
            if (!isAdmin) {
                obj.questions = obj.questions.map(({ question, options }) => ({ question, options }));
            }
            return obj;
        });
        res.status(200).json({ success: true, count: sanitized.length, tests: sanitized });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tests', error: error.message });
    }
};

// @desc    Get test by ID
// @route   GET /api/tests/:id
// @access  Public
const getTestById = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id).populate('course', 'title');
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }
        const obj = test.toObject();
        const isAdmin = req.user && req.user.role === 'admin';
        if (!isAdmin) {
            obj.questions = obj.questions.map(({ question, options }) => ({ question, options }));
        }
        res.status(200).json({ success: true, test: obj });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch test', error: error.message });
    }
};

// @desc    Create test (admin)
// @route   POST /api/tests
// @access  Private (admin)
const createTest = async (req, res) => {
    try {
        const data = { ...req.body };
        const course = await Course.findById(data.course);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseOwnership(course, req.user);
        if (req.user) data.createdBy = req.user._id;
        const test = await Test.create(data);
        res.status(201).json({ success: true, message: 'Test created', test });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to create test', error: error.message });
    }
};

// @desc    Update test (admin)
// @route   PUT /api/tests/:id
// @access  Private (admin)
const updateTest = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        ensureTestAccess(test, req.user);

        if (req.body.course && String(req.body.course) !== String(test.course)) {
            const course = await Course.findById(req.body.course);
            if (!course) {
                return res.status(404).json({ success: false, message: 'Course not found' });
            }
            ensureCourseOwnership(course, req.user);
        }

        Object.assign(test, req.body);
        await test.save();
        res.status(200).json({ success: true, message: 'Test updated', test });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to update test', error: error.message });
    }
};

// @desc    Delete test (admin)
// @route   DELETE /api/tests/:id
// @access  Private (admin)
const deleteTest = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, message: 'Test not found' });
        }

        ensureTestAccess(test, req.user);
        await test.deleteOne();
        await QuizAttempt.deleteMany({ quiz: req.params.id });
        res.status(200).json({ success: true, message: 'Test deleted' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to delete test', error: error.message });
    }
};

// @desc    Start quiz attempt (student)
// @route   POST /api/tests/:id/start
// @access  Private
const startQuiz = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id).populate('course', 'title');
        if (!test) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        const now = new Date();
        if (now < new Date(test.startTime)) {
            return res.status(400).json({ success: false, message: 'Quiz has not started yet' });
        }
        if (now > new Date(test.endTime)) {
            return res.status(400).json({ success: false, message: 'Quiz has ended' });
        }

        // Check if already attempted
        const existing = await QuizAttempt.findOne({ quiz: req.params.id, student: req.user._id });
        if (existing) {
            return res.status(409).json({ success: false, message: 'You have already attempted this quiz', attempt: existing });
        }

        // Create attempt record
        const attempt = await QuizAttempt.create({
            quiz: req.params.id,
            student: req.user._id,
            startedAt: new Date(),
        });

        // Send questions without correct answers
        const questions = test.questions.map((q, i) => ({
            index: i,
            question: q.question,
            options: q.options,
        }));

        res.status(200).json({
            success: true,
            message: 'Quiz started',
            attemptId: attempt._id,
            quizTitle: test.title,
            courseName: test.course ? test.course.title : '',
            durationMinutes: test.durationMinutes,
            endTime: test.endTime,
            questions,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to start quiz', error: error.message });
    }
};

// @desc    Submit quiz (student)
// @route   POST /api/tests/:id/submit
// @access  Private
const submitQuiz = async (req, res) => {
    try {
        const { answers, tabSwitchCount } = req.body;

        const test = await Test.findById(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        const attempt = await QuizAttempt.findOne({ quiz: req.params.id, student: req.user._id });
        if (!attempt) {
            return res.status(400).json({ success: false, message: 'No active attempt found. Start the quiz first.' });
        }

        if (attempt.completedAt) {
            return res.status(409).json({ success: false, message: 'Quiz already submitted' });
        }

        // Auto-grade
        let score = 0;
        const totalMarks = test.questions.length;
        if (Array.isArray(answers)) {
            answers.forEach((ans) => {
                const q = test.questions[ans.questionIndex];
                if (q && ans.selectedAnswer === q.correctAnswer) {
                    score++;
                }
            });
        }

        attempt.answers = answers || [];
        attempt.score = score;
        attempt.totalMarks = totalMarks;
        attempt.tabSwitchCount = tabSwitchCount || 0;
        attempt.completedAt = new Date();
        await attempt.save();

        res.status(200).json({
            success: true,
            message: 'Quiz submitted successfully',
            score,
            totalMarks,
            percentage: totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0,
            tabSwitchCount: attempt.tabSwitchCount,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to submit quiz', error: error.message });
    }
};

// @desc    Get my quiz attempts (student)
// @route   GET /api/tests/my-attempts
// @access  Private
const getMyAttempts = async (req, res) => {
    try {
        const attempts = await QuizAttempt.find({ student: req.user._id })
            .populate({
                path: 'quiz',
                select: 'title course durationMinutes startTime endTime totalQuestions',
                populate: { path: 'course', select: 'title' },
            })
            .sort({ completedAt: -1 });

        res.status(200).json({ success: true, count: attempts.length, attempts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch attempts', error: error.message });
    }
};

// @desc    Get all attempts for a quiz (admin)
// @route   GET /api/tests/:id/results
// @access  Private (admin)
const getQuizResults = async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        ensureTestAccess(test, req.user);

        const attempts = await QuizAttempt.find({ quiz: req.params.id })
            .populate('student', 'name email')
            .sort({ score: -1 });

        res.status(200).json({ success: true, count: attempts.length, attempts });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch results', error: error.message });
    }
};

module.exports = {
    getTests,
    getManagedTests,
    getTestById,
    createTest,
    updateTest,
    deleteTest,
    startQuiz,
    submitQuiz,
    getMyAttempts,
    getQuizResults,
};

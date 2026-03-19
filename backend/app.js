const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const { errorHandler } = require('./middlewares/error.middleware');

// Module routes
const authRoutes = require('./modules/auth/auth.routes');
const otpRoutes = require('./modules/otp/otp.routes');
const courseRoutes = require('./modules/course/course.routes');
const assignmentRoutes = require('./modules/assignment/assignment.routes');
const submissionRoutes = require('./modules/assignment/submission.routes');
const testRoutes = require('./modules/test/test.routes');
const quizAttemptRoutes = require('./modules/test/quizAttempt.routes');
const certificateRoutes = require('./modules/certificate/certificate.routes');
const userRoutes = require('./modules/user/user.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');

const app = express();
const frontendDir = path.join(__dirname, '..', 'frontend');

// --- Middleware ---
app.use(helmet({
    crossOriginResourcePolicy: false, // Allow serving uploads cross-origin
}));
app.use(mongoSanitize());
app.use(compression());

const allowedOrigins = process.env.FRONTEND_URL && process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL.split(',') 
    : '*';
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API Routes ---
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/otp', authLimiter, otpRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);

// --- Static Pages ---
app.get('/password/forgot.html', (req, res) => {
    res.sendFile(path.join(frontendDir, 'password', 'forgot.html'));
});

app.get('/password/reset.html', (req, res) => {
    res.sendFile(path.join(frontendDir, 'password', 'reset.html'));
});

app.get('/', (req, res) => {
    res.json({ message: 'Student Learning Portal API is running' });
});

app.use('/frontend', express.static(frontendDir));
app.use(express.static(frontendDir));

// --- Error Handling ---
app.use(errorHandler);

module.exports = app;

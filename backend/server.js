const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const otpRoutes = require('./routes/otpRoutes');
const courseRoutes = require('./routes/courseRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const testRoutes = require('./routes/testRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');

connectDB();

const app = express();
const frontendDir = path.join(__dirname, '..', 'frontend');

const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*';
app.use(cors({ origin: allowedOrigins }));
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

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/otp', authLimiter, otpRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);

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

// Error Handling Middleware
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });

    // Allow large uploads to complete without timing out
    server.timeout = 10 * 60 * 1000;          // 10 min overall
    server.headersTimeout = 10 * 60 * 1000;   // 10 min for headers
    server.requestTimeout = 10 * 60 * 1000;   // 10 min for request
    server.keepAliveTimeout = 10 * 60 * 1000; // 10 min keep-alive

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            const nextPort = port + 1;
            console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
            startServer(nextPort);
            return;
        }

        console.error('Failed to start server:', error.message);
        process.exit(1);
    });
}

startServer(PORT);

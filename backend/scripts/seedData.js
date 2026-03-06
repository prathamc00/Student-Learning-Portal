const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const Assignment = require('../models/assignmentModel');
const Test = require('../models/testModel');
const Certificate = require('../models/certificateModel');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('Missing MONGO_URI in environment variables.');
    process.exit(1);
}

const sampleUsers = [
    {
        name: 'Admin User',
        email: 'admin@crismatech.com',
        password: 'Admin@123',
        role: 'admin',
        college: 'CRISMATECH Institute',
        branch: 'Administration',
        semester: 1,
        phone: '+919100000001',
    },
    {
        name: 'Priya Sharma',
        email: 'priya.sharma@student.com',
        password: 'Student@123',
        role: 'student',
        college: 'CRISMATECH Institute',
        branch: 'Computer Science',
        semester: 5,
        phone: '+919100000002',
    },
    {
        name: 'Rahul Verma',
        email: 'rahul.verma@student.com',
        password: 'Student@123',
        role: 'student',
        college: 'CRISMATECH Institute',
        branch: 'Information Technology',
        semester: 4,
        phone: '+919100000003',
    },
    {
        name: 'Neha Rao',
        email: 'neha.rao@faculty.com',
        password: 'Faculty@123',
        role: 'instructor',
        college: 'CRISMATECH Institute',    
        branch: 'Data Science',
        semester: 1,
        phone: '+919100000004',
    },
];

const sampleCourses = [
    {
        title: 'Web Development Masterclass',
        instructor: 'Neha Rao',
        category: 'Development',
        level: 'Intermediate',
        lessons: 22,
        durationHours: 16,
        isActive: true,
    },
    {
        title: 'Python for Data Science',
        instructor: 'Neha Rao',
        category: 'Data Science',
        level: 'Advanced',
        lessons: 18,
        durationHours: 14,
        isActive: true,
    },
    {
        title: 'Cloud Computing Fundamentals',
        instructor: 'Rahul Verma',
        category: 'Cloud',
        level: 'Intermediate',
        lessons: 16,
        durationHours: 12,
        isActive: true,
    },
];

const sampleAssignments = [
    {
        title: 'HTML Layout Challenge',
        course: 'Web Development Masterclass',
        dueDate: new Date('2026-03-15T23:59:00Z'),
        status: 'pending',
        maxMarks: 100,
    },
    {
        title: 'Python Data Cleaning Task',
        course: 'Python for Data Science',
        dueDate: new Date('2026-03-20T23:59:00Z'),
        status: 'pending',
        maxMarks: 100,
    },
];

const sampleTests = [
    {
        title: 'Web Development Mid-Term',
        course: 'Web Development Masterclass',
        totalQuestions: 50,
        durationMinutes: 90,
        status: 'upcoming',
        scheduledDate: new Date('2026-03-18T10:00:00Z'),
    },
    {
        title: 'Data Science Quiz 1',
        course: 'Python for Data Science',
        totalQuestions: 30,
        durationMinutes: 60,
        status: 'completed',
        score: 88,
    },
];

const sampleCertificates = [
    {
        title: 'Python Programming Certificate',
        course: 'Python for Data Science',
        status: 'earned',
        earnedDate: new Date('2026-03-01T12:00:00Z'),
    },
    {
        title: 'Web Development Certificate',
        course: 'Web Development Masterclass',
        status: 'inProgress',
        progressPercent: 65,
    },
];

async function connectDB() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding');
}

async function clearData() {
    await Promise.all([
        User.deleteMany({}),
        Course.deleteMany({}),
        Assignment.deleteMany({}),
        Test.deleteMany({}),
        Certificate.deleteMany({}),
    ]);

    console.log('Existing seed collections cleared');
}

async function seedData() {
    // Users use Mongoose model so passwords are hashed via pre-save hook.
    for (const user of sampleUsers) {
        await User.create(user);
    }

    await Course.insertMany(sampleCourses);
    await Assignment.insertMany(sampleAssignments);
    await Test.insertMany(sampleTests);
    await Certificate.insertMany(sampleCertificates);

    console.log('Seed data inserted successfully');
    console.log(`Users: ${sampleUsers.length}`);
    console.log(`Courses: ${sampleCourses.length}`);
    console.log(`Assignments: ${sampleAssignments.length}`);
    console.log(`Tests: ${sampleTests.length}`);
    console.log(`Certificates: ${sampleCertificates.length}`);
}

(async function run() {
    const shouldClearOnly = process.argv.includes('--clear');

    try {
        await connectDB();
        await clearData();

        if (shouldClearOnly) {
            console.log('Database clear completed.');
        } else {
            await seedData();
            console.log('Database created and data stored successfully.');
        }
    } catch (error) {
        console.error('Seed script failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
    }
})();

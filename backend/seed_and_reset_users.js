const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./modules/auth/auth.model');
const Course = require('./modules/course/course.model');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/student-learning-portal';

async function seedAndResetUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Sample accounts to ensure present with fixed passwords
        const usersToSetup = [
            {
                name: 'Admin User',
                email: 'admin@crismatech.com',
                password: 'Admin@123',
                role: 'admin',
                approvalStatus: 'approved',
                college: 'CRISMATECH Institute',
                branch: 'Administration',
                semester: 1
            },
            {
                name: 'Priya Sharma',
                email: 'priya.sharma@student.com',
                password: 'Student@123',
                role: 'student',
                approvalStatus: 'approved',
                college: 'CRISMATECH Institute',
                branch: 'Computer Science',
                semester: 5
            },
            {
                name: 'Rahul Verma',
                email: 'rahul.verma@student.com',
                password: 'Student@123',
                role: 'student',
                approvalStatus: 'approved',
                college: 'CRISMATECH Institute',
                branch: 'Information Technology',
                semester: 4
            },
            {
                name: 'Neha Rao',
                email: 'neha.rao@faculty.com',
                password: 'Faculty@123',
                role: 'instructor',
                approvalStatus: 'approved',
                college: 'CRISMATECH Institute',
                branch: 'Data Science',
                semester: 1
            }
        ];

        // Fetch or create courses to enroll students into
        let webCourse = await Course.findOne({ title: /Web Development/i });
        let pythonCourse = await Course.findOne({ title: /Python/i });

        if (!webCourse) {
            webCourse = await Course.create({
                title: 'Web Development Masterclass',
                description: 'Full-stack web development with HTML, CSS, JS, and React.',
                instructor: 'Neha Rao',
                category: 'Development',
                level: 'Intermediate',
                lessons: 5,
                durationHours: 20,
                isActive: true,
                modules: [
                    { title: 'HTML & CSS Fundamentals', description: 'Modern responsive layouts', duration: '20 min' },
                    { title: 'JavaScript & DOM Manipulation', description: 'Interactive web applications', duration: '30 min' },
                    { title: 'React & Component Architecture', description: 'State, props, and hooks', duration: '40 min' }
                ]
            });
        }

        if (!pythonCourse) {
            pythonCourse = await Course.create({
                title: 'Python for Data Science',
                description: 'Core Python, NumPy, pandas, and data visualization.',
                instructor: 'Neha Rao',
                category: 'Data Science',
                level: 'Beginner',
                lessons: 4,
                durationHours: 15,
                isActive: true,
                modules: [
                    { title: 'Python Basics & Control Flow', description: 'Variables, loops, and functions', duration: '25 min' },
                    { title: 'Data Structures & Algorithms', description: 'Lists, dicts, and sorting algorithms', duration: '35 min' }
                ]
            });
        }

        console.log('\n=============================================');
        console.log('🔄 SETTING UP SAMPLE ACCOUNTS...');
        console.log('=============================================');

        for (const uData of usersToSetup) {
            let user = await User.findOne({ email: uData.email });
            if (!user) {
                user = new User({
                    ...uData,
                    enrolledCourses: uData.role === 'student' ? [webCourse._id, pythonCourse._id] : []
                });
            } else {
                user.name = uData.name;
                user.password = uData.password; // Triggers pre('save') bcrypt hash
                user.role = uData.role;
                user.approvalStatus = uData.approvalStatus;
                if (uData.role === 'student' && (!user.enrolledCourses || user.enrolledCourses.length === 0)) {
                    user.enrolledCourses = [webCourse._id, pythonCourse._id];
                }
            }

            // Also update course enrolledStudents array
            if (uData.role === 'student') {
                if (!webCourse.enrolledStudents.includes(user._id)) webCourse.enrolledStudents.push(user._id);
                if (!pythonCourse.enrolledStudents.includes(user._id)) pythonCourse.enrolledStudents.push(user._id);
            }

            await user.save();
            console.log(`✅ User set up: ${uData.email} | Role: ${uData.role} | Pass: ${uData.password}`);
        }

        await webCourse.save();
        await pythonCourse.save();

        console.log('\n=============================================');
        console.log('🎉 ALL SAMPLE ACCOUNTS READY & ENROLLED!');
        console.log('=============================================\n');

    } catch (err) {
        console.error('Error seeding/resetting users:', err);
    } finally {
        await mongoose.disconnect();
    }
}

seedAndResetUsers();

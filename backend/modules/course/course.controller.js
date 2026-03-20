const Course = require('./course.model');
const CourseProgress = require('./courseProgress.model');
const path = require('path');
const Attendance = require('../attendance/attendance.model');

const canManageCourse = (course, user) => user.role === 'admin' || String(course.createdBy) === String(user._id);

const ensureCourseAccess = (course, user) => {
    if (!canManageCourse(course, user)) {
        const error = new Error('You can only manage courses that you created');
        error.statusCode = 403;
        throw error;
    }
};

const getManagedCourses = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const skip = (page - 1) * limit;

        const filter = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
        const courses = await Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
        res.status(200).json({ success: true, count: courses.length, page, limit, courses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch managed courses', error: error.message });
    }
};

const getCourses = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const skip = (page - 1) * limit;

        const courses = await Course.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
        res.status(200).json({ success: true, count: courses.length, page, limit, courses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch courses', error: error.message });
    }
};

const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        const obj = course.toObject();
        const isStaff = req.user && (req.user.role === 'admin' || req.user.role === 'instructor');
        const isEnrolled = req.user ? course.enrolledStudents.some(sid => String(sid) === String(req.user._id)) : false;

        // Attach isEnrolled flag for authenticated students
        if (req.user) {
            obj.isEnrolled = isEnrolled;
            obj.enrolledCount = course.enrolledStudents.length;
        }

        // Strip video/notes URLs for non-enrolled, non-staff users
        if (!isStaff && !isEnrolled) {
            obj.modules = obj.modules.map(m => ({
                _id: m._id,
                title: m.title,
                description: m.description,
                duration: m.duration,
                order: m.order,
                // videoUrl and notesUrl intentionally omitted
            }));
        }                                                 

        res.status(200).json({ success: true, course: obj });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch course', error: error.message });
    }
};

const createCourse = async (req, res) => {
    try {
        const data = { ...req.body };
        if (req.user) {
            data.createdBy = req.user._id;
            if (req.user.role === 'instructor') {
                data.instructor = req.user.name;
            }
        }
        const course = await Course.create(data);
        res.status(201).json({ success: true, message: 'Course created', course });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to create course', error: error.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseAccess(course, req.user);

        Object.assign(course, req.body);
        if (req.user.role === 'instructor') {
            course.instructor = req.user.name;
        }

        await course.save();
        res.status(200).json({ success: true, message: 'Course updated', course });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Failed to update course', error: error.message });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseAccess(course, req.user);
        await course.deleteOne();
        res.status(200).json({ success: true, message: 'Course deleted' });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to delete course', error: error.message });
    }
};

const getModules = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).select('title modules');
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        const sorted = [...course.modules].sort((a, b) => a.order - b.order);
        res.status(200).json({ success: true, courseTitle: course.title, count: sorted.length, modules: sorted });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch modules', error: error.message });
    }
};

const addModule = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseAccess(course, req.user);

        const moduleData = {
            title: req.body.title,
            description: req.body.description || '',
            duration: req.body.duration || '',
            order: req.body.order !== undefined ? Number(req.body.order) : course.modules.length,
        };

        if (req.files && req.files.video && req.files.video[0]) {
            moduleData.videoUrl = 'uploads/videos/' + req.files.video[0].filename;
        }

        if (req.files && req.files.notes && req.files.notes[0]) {
            moduleData.notesUrl = 'uploads/notes/' + req.files.notes[0].filename;
        }

        course.modules.push(moduleData);
        course.lessons = course.modules.length;
        await course.save();

        res.status(201).json({ success: true, message: 'Lesson added', course });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to add lesson', error: error.message });
    }
};

const updateModule = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseAccess(course, req.user);

        const mod = course.modules.id(req.params.moduleId);
        if (!mod) {
            return res.status(404).json({ success: false, message: 'Module not found' });
        }

        if (req.body.title !== undefined) mod.title = req.body.title;
        if (req.body.description !== undefined) mod.description = req.body.description;
        if (req.body.duration !== undefined) mod.duration = req.body.duration;
        if (req.body.order !== undefined) mod.order = Number(req.body.order);

        if (req.files && req.files.video && req.files.video[0]) {
            mod.videoUrl = 'uploads/videos/' + req.files.video[0].filename;
        }

        if (req.files && req.files.notes && req.files.notes[0]) {
            mod.notesUrl = 'uploads/notes/' + req.files.notes[0].filename;
        }

        await course.save();
        res.status(200).json({ success: true, message: 'Lesson updated', course });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to update lesson', error: error.message });
    }
};

const deleteModule = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseAccess(course, req.user);

        course.modules = course.modules.filter((m) => m._id.toString() !== req.params.moduleId);
        course.modules.forEach((m, i) => { m.order = i; });
        course.lessons = course.modules.length || 0;
        await course.save();

        res.status(200).json({ success: true, message: 'Lesson deleted', course });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to delete lesson', error: error.message });
    }
};

const reorderModules = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseAccess(course, req.user);

        const { moduleOrder } = req.body;
        if (!Array.isArray(moduleOrder)) {
            return res.status(400).json({ success: false, message: 'moduleOrder must be an array of module IDs' });
        }

        moduleOrder.forEach((id, idx) => {
            const mod = course.modules.id(id);
            if (mod) mod.order = idx;
        });

        await course.save();
        const sorted = [...course.modules].sort((a, b) => a.order - b.order);
        res.status(200).json({ success: true, message: 'Lessons reordered', modules: sorted });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Failed to reorder lessons', error: error.message });
    }
};

const enrollCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        const alreadyEnrolled = course.enrolledStudents.some(s => String(s) === String(req.user._id));
        if (alreadyEnrolled) {
            return res.status(409).json({ success: false, message: 'Already enrolled in this course' });
        }
        course.enrolledStudents.push(req.user._id);
        await course.save();

        // Track attendance for this enrollment event
        await Attendance.create({
            student: req.user._id,
            course: course._id,
            activityType: 'login',
            details: `Enrolled in course: ${course.title}`,
        });

        // Fire Real-Time Notification via WebSockets
        const { createNotification } = require('../notification/notification.controller');
        await createNotification(
            req.user._id, 
            'Course Enrolled 🎉', 
            `You have successfully enrolled in ${course.title}. Start learning now!`,
            'success',
            `/courses/${course._id}`
        );

        res.status(200).json({ success: true, message: 'Enrolled successfully', enrolledCount: course.enrolledStudents.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to enroll', error: error.message });
    }
};

const unenrollCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        course.enrolledStudents = course.enrolledStudents.filter(s => String(s) !== String(req.user._id));
        await course.save();
        res.status(200).json({ success: true, message: 'Unenrolled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to unenroll', error: error.message });
    }
};

const getMyEnrollments = async (req, res) => {
    try {
        const courses = await Course.find({ enrolledStudents: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: courses.length, courses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch enrollments', error: error.message });
    }
};
const getCourseProgress = async (req, res) => {
    try {
        const progress = await CourseProgress.findOne({ student: req.user._id, course: req.params.id });
        res.status(200).json({ success: true, completedModules: progress ? progress.completedModules : [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch progress', error: error.message });
    }
};

const markModuleComplete = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        const mod = course.modules.id(req.params.moduleId);
        if (!mod) {
            return res.status(404).json({ success: false, message: 'Module not found' });
        }

        let progress = await CourseProgress.findOne({ student: req.user._id, course: req.params.id });
        if (!progress) {
            progress = await CourseProgress.create({ student: req.user._id, course: req.params.id, completedModules: [] });
        }

        const alreadyDone = progress.completedModules.some(mid => String(mid) === String(req.params.moduleId));
        if (!alreadyDone) {
            progress.completedModules.push(req.params.moduleId);
            await progress.save();
        }

        res.status(200).json({ success: true, message: 'Module marked as complete', completedModules: progress.completedModules });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to mark module complete', error: error.message });
    }
};

module.exports = { getCourses, getManagedCourses, getCourseById, createCourse, updateCourse, deleteCourse, getModules, addModule, updateModule, deleteModule, reorderModules, enrollCourse, unenrollCourse, getMyEnrollments, getCourseProgress, markModuleComplete };

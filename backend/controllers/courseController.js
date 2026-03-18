const Course = require('../models/courseModel');
const path = require('path');

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
        res.status(200).json({ success: true, course });
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

// @desc    Get all modules for a course
// @route   GET /api/courses/:id/modules
// @access  Public
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

// @desc    Add module (with optional video) to course
// @route   POST /api/courses/:id/modules
// @access  Private (admin)
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

        if (req.file) {
            moduleData.videoUrl = 'uploads/videos/' + req.file.filename;
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

// @desc    Update a module (edit details, optionally replace video)
// @route   PUT /api/courses/:id/modules/:moduleId
// @access  Private (admin)
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

        if (req.file) {
            mod.videoUrl = 'uploads/videos/' + req.file.filename;
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

// @desc    Delete module from course
// @route   DELETE /api/courses/:id/modules/:moduleId
// @access  Private (admin)
const deleteModule = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseAccess(course, req.user);

        course.modules = course.modules.filter((m) => m._id.toString() !== req.params.moduleId);
        // Re-number orders
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

// @desc    Reorder modules inside a course
// @route   PUT /api/courses/:id/modules/reorder
// @access  Private (admin)
const reorderModules = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        ensureCourseAccess(course, req.user);

        const { moduleOrder } = req.body; // array of moduleId strings in desired order
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

module.exports = { getCourses, getManagedCourses, getCourseById, createCourse, updateCourse, deleteCourse, getModules, addModule, updateModule, deleteModule, reorderModules };

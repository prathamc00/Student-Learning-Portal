const User = require('../auth/auth.model');

const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const skip = (page - 1) * limit;

        const users = await User.find({}).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
        res.status(200).json({ success: true, count: users.length, page, limit, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
    }
};

const updateInstructorStatus = async (req, res) => {
    try {
        const { approvalStatus } = req.body;

        if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid approval status' });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.role !== 'instructor') {
            return res.status(400).json({ success: false, message: 'Only instructor accounts can be approved or rejected' });
        }

        user.approvalStatus = approvalStatus;
        await user.save();

        res.status(200).json({ success: true, message: `Instructor ${approvalStatus} successfully`, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update instructor status', error: error.message });
    }
};

const exportUsersCSV = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });

        let csv = 'Name,Email,Role,College,Branch,Semester,Phone,Status,Joined Date\n';

        users.forEach((u) => {
            const name = `"${(u.name || '').replace(/"/g, '""')}"`;
            const email = `"${(u.email || '').replace(/"/g, '""')}"`;
            const role = `"${(u.role || '').replace(/"/g, '""')}"`;
            const college = `"${(u.college || '').replace(/"/g, '""')}"`;
            const branch = `"${(u.branch || '').replace(/"/g, '""')}"`;
            const semester = `"${(u.semester || '').replace(/"/g, '""')}"`;
            const phone = `"${(u.phone || '').replace(/"/g, '""')}"`;
            const status = `"${(u.approvalStatus || '').replace(/"/g, '""')}"`;
            const date = u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '';

            csv += `${name},${email},${role},${college},${branch},${semester},${phone},${status},${date}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to export users', error: error.message });
    }
};

module.exports = { getUsers, deleteUser, updateInstructorStatus, exportUsersCSV };


const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('./modules/auth/auth.model');

dotenv.config();

async function resetAdminPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student-learning-portal');
        console.log('Connected to MongoDB');

        const adminEmail = 'admin@crismatech.com';
        const newPassword = 'Admin@123';

        let admin = await User.findOne({ role: 'admin' });
        
        if (!admin) {
            admin = await User.findOne({ email: adminEmail });
        }

        if (!admin) {
            console.log('No admin user found. Creating a new admin user...');
            admin = new User({
                name: 'Admin User',
                email: adminEmail,
                password: newPassword,
                role: 'admin',
                approvalStatus: 'approved',
                college: 'CRISMATECH Institute',
                branch: 'Administration',
                semester: 1,
                phone: '+919100000001'
            });
        } else {
            console.log(`Found existing admin user: ${admin.email}`);
            admin.password = newPassword;
            admin.approvalStatus = 'approved';
        }

        await admin.save();

        console.log('\n=============================================');
        console.log('✅ ADMIN CREDENTIALS RESET SUCCESSFUL');
        console.log(`   Email:    ${admin.email}`);
        console.log(`   Password: ${newPassword}`);
        console.log(`   Role:     ${admin.role}`);
        console.log('=============================================\n');
    } catch (err) {
        console.error('Error resetting admin credentials:', err);
    } finally {
        await mongoose.disconnect();
    }
}

resetAdminPassword();

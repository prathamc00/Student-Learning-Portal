const http = require('http');

const BASE = 'http://localhost:5000';

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (arguments[3]) options.headers['Authorization'] = `Bearer ${arguments[3]}`;
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log('=== ADMIN LOGIN ===');
    const adminLogin = await request('POST', '/api/auth/login', { email: 'admin@crismatech.com', password: 'Admin@123' });
    console.log(`Status: ${adminLogin.status}`);
    console.log(`Success: ${adminLogin.body.success}`);
    console.log(`Message: ${adminLogin.body.message}`);
    const adminToken = adminLogin.body.token;
    const adminUser = adminLogin.body.user;
    console.log(`Role: ${adminUser?.role}, Name: ${adminUser?.name}`);
    
    console.log('\n=== USER LOGIN ===');
    const userLogin = await request('POST', '/api/auth/login', { email: '22btai204@gcu.edu.in', password: '111222333' });
    console.log(`Status: ${userLogin.status}`);
    console.log(`Success: ${userLogin.body.success}`);
    console.log(`Message: ${userLogin.body.message}`);
    const userToken = userLogin.body.token;
    const normalUser = userLogin.body.user;
    console.log(`Role: ${normalUser?.role}, Name: ${normalUser?.name}`);
    
    console.log('\n=== ADMIN: GET /api/auth/me ===');
    const me = await request('GET', '/api/auth/me', null, adminToken);
    console.log(`Status: ${me.status}, Success: ${me.body.success}`);
    console.log(`Enrolled Courses: ${me.body.user?.enrolledCourses?.length || 0}`);
    
    console.log('\n=== GET COURSES (public) ===');
    const courses = await request('GET', '/api/courses');
    console.log(`Status: ${courses.status}, Count: ${courses.body.count}`);
    courses.body.courses?.forEach(c => console.log(`  - ${c.title} (${c.modules?.length || 0} modules, by ${c.instructor})`));
    
    console.log('\n=== GET ASSIGNMENTS (public) ===');
    const assignments = await request('GET', '/api/assignments');
    console.log(`Status: ${assignments.status}, Count: ${assignments.body.count}`);
    assignments.body.assignments?.forEach(a => console.log(`  - ${a.title} (type: ${a.type}, due: ${a.dueDate})`));
    
    console.log('\n=== GET TESTS (public, no auth) ===');
    const tests = await request('GET', '/api/tests');
    console.log(`Status: ${tests.status}, Count: ${tests.body.count}`);
    tests.body.tests?.forEach(t => {
        console.log(`  - ${t.title} (questions: ${t.questions?.length})`);
        // Check if correct answers are leaked
        const hasCorrectAnswer = t.questions?.some(q => q.correctAnswer !== undefined);
        console.log(`    ⚠ Correct answers exposed to public: ${hasCorrectAnswer}`);
    });
    
    console.log('\n=== GET TESTS (with admin auth) ===');
    const testsAdmin = await request('GET', '/api/tests', null, adminToken);
    testsAdmin.body.tests?.forEach(t => {
        const hasCorrectAnswer = t.questions?.some(q => q.correctAnswer !== undefined);
        console.log(`  - ${t.title}: correctAnswer visible = ${hasCorrectAnswer}`);
    });

    console.log('\n=== GET CERTIFICATES (public, NO AUTH!) ===');
    const certs = await request('GET', '/api/certificates');
    console.log(`Status: ${certs.status}, Count: ${certs.body.count}`);
    certs.body.certificates?.forEach(c => console.log(`  - ${c.title} (status: ${c.status})`));
    
    console.log('\n=== CREATE CERTIFICATE (NO AUTH - should fail!) ===');
    const createCert = await request('POST', '/api/certificates', { title: 'Hacked Cert', course: 'Fake Course', status: 'earned' });
    console.log(`Status: ${createCert.status}, Success: ${createCert.body.success}`);
    console.log(`Message: ${createCert.body.message}`);
    
    console.log('\n=== DELETE CERTIFICATE (NO AUTH - should fail!) ===');
    if (certs.body.certificates?.length) {
        const delCert = await request('DELETE', `/api/certificates/${certs.body.certificates[0]._id}`);
        console.log(`Status: ${delCert.status}, Success: ${delCert.body.success}`);
        console.log(`Message: ${delCert.body.message}`);
    }
    
    console.log('\n=== GET USERS (admin) ===');
    const users = await request('GET', '/api/users', null, adminToken);
    console.log(`Status: ${users.status}, Count: ${users.body.count}`);
    users.body.users?.forEach(u => console.log(`  - ${u.name} (${u.email}, role: ${u.role}, status: ${u.approvalStatus})`));
    
    console.log('\n=== GET USERS (no auth - should fail) ===');
    const usersNoAuth = await request('GET', '/api/users');
    console.log(`Status: ${usersNoAuth.status}, Message: ${usersNoAuth.body.message}`);
    
    console.log('\n=== GET ATTENDANCE (admin) ===');
    const attendance = await request('GET', '/api/attendance', null, adminToken);
    console.log(`Status: ${attendance.status}, Count: ${attendance.body.count}`);
    
    if (userToken) {
        console.log('\n=== USER: GET /api/auth/me ===');
        const userMe = await request('GET', '/api/auth/me', null, userToken);
        console.log(`Status: ${userMe.status}, Success: ${userMe.body.success}`);
        console.log(`Name: ${userMe.body.user?.name}, Enrolled: ${userMe.body.user?.enrolledCourses?.length || 0}`);
        
        console.log('\n=== USER: GET MY SUBMISSIONS ===');
        const mySubs = await request('GET', '/api/assignments/my-submissions', null, userToken);
        console.log(`Status: ${mySubs.status}, Count: ${mySubs.body.count}`);
        
        console.log('\n=== USER: GET MY ATTENDANCE ===');
        const myAtt = await request('GET', '/api/attendance/my', null, userToken);
        console.log(`Status: ${myAtt.status}, Count: ${myAtt.body.count}`);
        
        console.log('\n=== USER: GET MY QUIZ ATTEMPTS ===');
        const myAttempts = await request('GET', '/api/tests/my-attempts', null, userToken);
        console.log(`Status: ${myAttempts.status}, Count: ${myAttempts.body.count}`);
    }
    
    // Test mass assignment vulnerability
    console.log('\n=== SECURITY: Mass assignment via register (try role=admin) ===');
    const hackReg = await request('POST', '/api/auth/register', {
        name: 'Hacker', email: 'hack_test_' + Date.now() + '@test.edu.in',
        password: 'Hack@123', role: 'admin'
    });
    console.log(`Status: ${hackReg.status}, Role assigned: ${hackReg.body.user?.role}`);
    
    // Test forgot password with non-existent email  
    console.log('\n=== EDGE CASE: Forgot password with non-existent email ===');
    const forgotBad = await request('POST', '/api/auth/forgot-password', { email: 'nonexistent@test.com' });
    console.log(`Status: ${forgotBad.status}, Message: ${forgotBad.body.message}`);
    
    // Test forgot password with empty body
    console.log('\n=== EDGE CASE: Forgot password with empty body ===');
    const forgotEmpty = await request('POST', '/api/auth/forgot-password', {});
    console.log(`Status: ${forgotEmpty.status}, Message: ${forgotEmpty.body.message}`);
    
    // Test login with empty credentials
    console.log('\n=== EDGE CASE: Login with empty body ===');
    const loginEmpty = await request('POST', '/api/auth/login', {});
    console.log(`Status: ${loginEmpty.status}, Message: ${loginEmpty.body.message}`);
    
    // Test invalid ObjectId
    console.log('\n=== EDGE CASE: Get course with invalid ID ===');
    const badId = await request('GET', '/api/courses/not-a-valid-id');
    console.log(`Status: ${badId.status}, Message: ${badId.body.message}`);
    
    // Test OTP endpoint
    console.log('\n=== OTP: Send to non-educational email ===');
    const otpBad = await request('POST', '/api/otp/send-email', { email: 'test@gmail.com' });
    console.log(`Status: ${otpBad.status}, Message: ${otpBad.body.message}`);
    
    // Test accessing admin routes as regular user
    if (userToken) {
        console.log('\n=== AUTHZ: User trying admin-only route ===');
        const userAdmin = await request('GET', '/api/users', null, userToken);
        console.log(`Status: ${userAdmin.status}, Message: ${userAdmin.body.message}`);
        
        console.log('\n=== AUTHZ: User trying to delete another user ===');
        const userDel = await request('DELETE', '/api/users/000000000000000000000000', null, userToken);
        console.log(`Status: ${userDel.status}, Message: ${userDel.body.message}`);
    }
    
    console.log('\n=== DONE ===');
}

run().catch(e => console.error('Test failed:', e));

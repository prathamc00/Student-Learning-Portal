const User = require('../auth/auth.model');
const Course = require('../course/course.model');
const Assignment = require('../assignment/assignment.model');
const Submission = require('../assignment/submission.model');
const Test = require('../test/test.model');
const QuizAttempt = require('../test/quizAttempt.model');
const Attendance = require('../attendance/attendance.model');

/**
 * Retrieve comprehensive real-time database context tailored to user role
 */
async function retrieveStudentContext(userId, role = 'student') {
    try {
        const user = await User.findById(userId).select('-password');
        if (!user) return null;

        // Platform-wide Statistics (ONLY for Admin & Instructor roles)
        let platformStats = null;
        if (role === 'admin' || role === 'instructor') {
            const totalUsers = await User.countDocuments({});
            const totalStudents = await User.countDocuments({ role: 'student' });
            const totalInstructors = await User.countDocuments({ role: 'instructor' });
            const totalAdmins = await User.countDocuments({ role: 'admin' });
            const allActiveCourses = await Course.find({ isActive: true }).select('enrolledStudents').lean();
            const totalEnrollmentsCount = allActiveCourses.reduce((acc, c) => acc + (c.enrolledStudents ? c.enrolledStudents.length : 0), 0);

            platformStats = {
                totalUsers,
                totalStudents,
                totalInstructors,
                totalAdmins,
                totalActiveCourses: allActiveCourses.length,
                totalEnrollmentsCount
            };
        }

        // Fetch courses based on role
        let courses = [];
        if (role === 'admin' || role === 'instructor') {
            courses = await Course.find({ isActive: true })
                .select('title description category level lessons durationHours modules enrolledStudents')
                .lean();
        } else {
            // Student role: ONLY enrolled courses
            courses = await Course.find({
                $or: [
                    { enrolledStudents: userId },
                    { _id: { $in: user.enrolledCourses || [] } }
                ],
                isActive: true
            }).select('title description category level lessons durationHours modules enrolledStudents').lean();
        }

        const courseIds = courses.map(c => c._id);

        // Fetch assignments for accessible courses
        const assignments = await Assignment.find({ courseId: { $in: courseIds } })
            .select('title description dueDate totalPoints courseId')
            .sort({ dueDate: 1 })
            .lean();

        // Fetch student's submissions
        let submissions = [];
        if (role === 'student') {
            submissions = await Submission.find({ studentId: userId }).select('assignmentId status marksObtained submittedAt feedback').lean();
        }

        // Fetch tests/quizzes
        const tests = await Test.find({ courseId: { $in: courseIds }, isPublished: true })
            .select('title description totalMarks durationMinutes passingMarks startTime endTime')
            .sort({ createdAt: -1 })
            .lean();

        // Fetch quiz attempts
        let attempts = [];
        if (role === 'student') {
            attempts = await QuizAttempt.find({ studentId: userId }).select('testId score percentage passed completedAt').lean();
        }

        // Fetch attendance records
        let attendance = [];
        if (role === 'student') {
            attendance = await Attendance.find({ studentId: userId }).sort({ date: -1 }).limit(10).lean();
        }

        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || role,
                college: user.college || 'N/A',
                branch: user.branch || 'N/A',
                semester: user.semester || 'N/A'
            },
            platformStats, // null for students!
            courses,
            assignments: assignments.map(a => {
                const sub = submissions.find(s => s.assignmentId.toString() === a._id.toString());
                return {
                    id: a._id,
                    title: a.title,
                    description: a.description,
                    dueDate: a.dueDate,
                    totalPoints: a.totalPoints,
                    status: sub ? sub.status : 'Pending',
                    marksObtained: sub ? sub.marksObtained : null,
                    feedback: sub ? sub.feedback : null
                };
            }),
            tests: tests.map(t => {
                const att = attempts.find(a => a.testId.toString() === t._id.toString());
                return {
                    id: t._id,
                    title: t.title,
                    description: t.description,
                    durationMinutes: t.durationMinutes,
                    totalMarks: t.totalMarks,
                    attempted: !!att,
                    score: att ? att.score : null,
                    passed: att ? att.passed : null
                };
            }),
            attendanceSummary: {
                totalRecords: attendance.length,
                presentCount: attendance.filter(a => a.status === 'present').length,
                absentCount: attendance.filter(a => a.status === 'absent').length,
                lateCount: attendance.filter(a => a.status === 'late').length
            }
        };
    } catch (error) {
        console.error('RAG Context Retrieval Error:', error);
        return null;
    }
}

/**
 * Top-K Keyword & Semantic Match Retrieval for Knowledge Snippets
 */
function retrieveRelevantKnowledge(query, context, selectedCourseId = null) {
    if (!context) return { snippets: [], sources: [] };

    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const snippets = [];
    const sources = [];

    // Filter courses
    let coursesToSearch = context.courses;
    if (selectedCourseId) {
        coursesToSearch = coursesToSearch.filter(c => c._id.toString() === selectedCourseId.toString());
    }

    coursesToSearch.forEach(c => {
        const matchesQuery = keywords.some(k => 
            c.title.toLowerCase().includes(k) || 
            (c.description && c.description.toLowerCase().includes(k)) ||
            (c.category && c.category.toLowerCase().includes(k))
        );

        if (matchesQuery || keywords.length === 0 || selectedCourseId) {
            snippets.push(`[Course: ${c.title}] Category: ${c.category || 'Development'}, Level: ${c.level || 'Beginner'}. Description: ${c.description || 'N/A'}.`);
            sources.push({ type: 'Course', name: c.title });

            if (c.modules && c.modules.length > 0) {
                c.modules.forEach(m => {
                    if (keywords.some(k => m.title.toLowerCase().includes(k) || (m.description && m.description.toLowerCase().includes(k)))) {
                        snippets.push(`  └ Module Topic: ${m.title} — ${m.description || 'No description'}`);
                    }
                });
            }
        }
    });

    // Search Assignments
    context.assignments.forEach(a => {
        const matchesAssignment = keywords.some(k => 
            a.title.toLowerCase().includes(k) || 
            (a.description && a.description.toLowerCase().includes(k)) ||
            k.includes('assign') || k.includes('homework') || k.includes('due') || k.includes('subm')
        );

        if (matchesAssignment) {
            snippets.push(`[Assignment: ${a.title}] Due Date: ${new Date(a.dueDate).toLocaleDateString()}, Points: ${a.totalPoints}, Status: ${a.status}. Description: ${a.description || 'N/A'}`);
            sources.push({ type: 'Assignment', name: a.title });
        }
    });

    // Search Tests
    context.tests.forEach(t => {
        const matchesTest = keywords.some(k => 
            t.title.toLowerCase().includes(k) || 
            k.includes('test') || k.includes('quiz') || k.includes('exam') || k.includes('score') || k.includes('grade')
        );

        if (matchesTest) {
            snippets.push(`[Quiz/Test: ${t.title}] Duration: ${t.durationMinutes} mins, Marks: ${t.totalMarks}, Attempted: ${t.attempted ? 'Yes' : 'No'}${t.score !== null ? `, Score: ${t.score}` : ''}`);
            sources.push({ type: 'Test', name: t.title });
        }
    });

    return { snippets: snippets.slice(0, 8), sources: sources.slice(0, 5) };
}

/**
 * Build RAG Augmented Prompt with Strict Role-Based Security Rules & No Emojis Rule
 */
function buildAugmentedPrompt(userPrompt, studentContext, knowledge, history = []) {
    const { user, platformStats, courses, assignments, tests, attendanceSummary } = studentContext;

    const historyFormatted = history.slice(-4).map(h => `${h.sender === 'user' ? 'User' : 'AI'}: ${h.text}`).join('\n');

    let roleSystemInstructions = '';

    if (user.role === 'student') {
        roleSystemInstructions = `ROLE: STUDENT STUDY ASSISTANT & TUTOR
STRICT ROLE-BASED ACCESS RULES FOR STUDENT USER:
1. You are strictly an Academic AI Tutor for this student.
2. You MUST ONLY answer questions about the student's enrolled courses, course module contents, lecture notes, assignment requirements, quiz/test practice, study concepts, code debugging, and personal attendance.
3. ABSOLUTE RESTRICTION: If the student asks for platform-wide user counts, student lists, user emails, instructor stats, or system administration data, you MUST politely refuse. State that as a student assistant, you only answer course & academic learning questions, and administrative metrics are restricted to faculty and platform administrators.`;
    } else if (user.role === 'instructor') {
        roleSystemInstructions = `ROLE: INSTRUCTOR & FACULTY ASSISTANT
ROLE RULES FOR INSTRUCTOR:
1. You assist the instructor with course syllabus management, student assignment tracking, quiz performance summaries, and teaching guidance for their courses.`;
    } else {
        roleSystemInstructions = `ROLE: PLATFORM ADMINISTRATOR ASSISTANT
ROLE RULES FOR ADMIN:
1. You have full access to platform-wide statistics, total user & student counts, course availability, and system metrics.`;
    }

    const platformStatsContext = platformStats ? `
RETRIEVED PLATFORM STATISTICS (ADMIN/INSTRUCTOR ONLY):
- Total Registered Users: ${platformStats.totalUsers} (Students: ${platformStats.totalStudents}, Instructors: ${platformStats.totalInstructors}, Admins: ${platformStats.totalAdmins})
- Total Course Enrollments across Platform: ${platformStats.totalEnrollmentsCount}
- Active Courses Available: ${platformStats.totalActiveCourses}` : '';

    return `You are Crismatech AI — the official AI Assistant for the Student Learning Portal.

${roleSystemInstructions}

AUTHENTICATED USER:
- Name: ${user.name} (${user.role.toUpperCase()})
- Branch & Semester: ${user.branch}, Sem ${user.semester}
- Enrolled/Active Courses (${courses.length}): ${courses.map(c => c.title).join(', ') || 'None'}
- Pending Assignments (${assignments.filter(a => a.status === 'Pending').length}): ${assignments.filter(a => a.status === 'Pending').map(a => `${a.title} (Due: ${new Date(a.dueDate).toLocaleDateString()})`).join(', ') || 'None'}
- Quiz Attempts: ${tests.filter(t => t.attempted).length} completed out of ${tests.length} available quizzes
- Attendance Record: ${attendanceSummary.presentCount} present, ${attendanceSummary.absentCount} absent out of ${attendanceSummary.totalRecords} sessions
${platformStatsContext}

RETRIEVED KNOWLEDGE BASE SNIPPETS:
${knowledge.snippets.join('\n') || 'No specific course snippets matched.'}

CONVERSATION HISTORY:
${historyFormatted || 'None'}

USER QUESTION:
"${userPrompt}"

INSTRUCTIONS:
1. Adhere strictly to the ROLE-BASED ACCESS RULES specified above.
2. STRICT FORMATTING RULE: Do NOT include any emojis in your response under any circumstances. Keep text clean, formal, and professional.
3. Provide a clear, beautifully formatted markdown response with bolding, headings, bullet points, and code blocks where helpful.
4. Be concise, professional, and accurate.`;
}

/**
 * Fallback response generator enforcing Role-Based Access Rules (Emoji-Free)
 */
function generateOfflineRAGResponse(userPrompt, studentContext, knowledge) {
    const p = userPrompt.toLowerCase();
    const { user, platformStats, courses, assignments, tests, attendanceSummary } = studentContext;

    // Detect Admin/Platform Statistics Queries
    const isStatsQuery = 
        p.includes('how many user') || 
        p.includes('user count') || 
        p.includes('total user') ||
        p.includes('how many student') ||
        p.includes('student count') ||
        p.includes('total student') ||
        p.includes('how many enrolled') ||
        p.includes('how many users enrolled') ||
        p.includes('enrollment count') ||
        p.includes('platform stat') ||
        p.includes('system stat') ||
        p.includes('all user');

    // Rule 1: Student Role Privacy Restriction
    if (isStatsQuery && user.role === 'student') {
        return `[Role Restriction]: Hello **${user.name}**! As a student AI assistant, I am designed to help you strictly with your **enrolled courses, lecture topics, assignment guidelines, quizzes, code debugging, and personal attendance**.

Platform-wide administrative statistics (such as total registered users or user rosters) are restricted to faculty and platform administrators.

Is there a specific course topic, assignment, or quiz question I can help you with today?`;
    }

    // Rule 2: Admin & Instructor Statistics Query
    if (isStatsQuery && (user.role === 'admin' || user.role === 'instructor')) {
        return `### Platform User & Enrollment Statistics (${user.role.toUpperCase()} ACCESS)

Hello **${user.name}**! Here is the real-time platform breakdown:

* **Total Registered Users**: **${platformStats.totalUsers}**
  * **Students**: **${platformStats.totalStudents}**
  * **Instructors / Faculty**: **${platformStats.totalInstructors}**
  * **Administrators**: **${platformStats.totalAdmins}**
* **Active Courses**: **${platformStats.totalActiveCourses}**
* **Total Course Enrollments**: **${platformStats.totalEnrollmentsCount}** student course enrollments

---
*You can manage accounts in detail under the Admin Panel.*`;
    }

    // Rule 3: Enrolled Courses & Learning Content
    if (p.includes('my course') || p.includes('what courses am i') || p.includes('enrolled course') || (p.includes('course') && !p.includes('how many'))) {
        if (courses.length === 0) {
            return `Hello **${user.name}**! You are not currently enrolled in any active courses. Visit the **Courses** section to explore and enroll in available learning tracks!`;
        }
        const courseList = courses.map(c => `* **${c.title}** (${c.category || 'Development'}) — *${c.level || 'Beginner'} level* (${c.lessons || 1} lessons)`).join('\n');
        return `Hello **${user.name}**! Here are your active enrolled courses:\n\n${courseList}\n\nNeed detailed syllabus breakdown or assignment help for any of these? Just ask!`;
    }

    // Rule 4: Assignments & Homework
    if (p.includes('assignment') || p.includes('homework') || p.includes('due') || p.includes('pending')) {
        const pending = assignments.filter(a => a.status === 'Pending');
        if (pending.length === 0) {
            return `Good job, **${user.name}**! You have no pending assignments right now. All submissions are up to date!`;
        }
        const list = pending.map(a => `* **${a.title}** — Due: **${new Date(a.dueDate).toLocaleDateString()}** (${a.totalPoints} pts)`).join('\n');
        return `Here are your pending assignments:\n\n${list}\n\nYou can upload completed files directly in the **Assignments** tab!`;
    }

    // Rule 5: Quizzes & Tests
    if (p.includes('test') || p.includes('quiz') || p.includes('exam') || p.includes('score')) {
        if (tests.length === 0) {
            return `No scheduled quizzes or tests found right now. Check back later in the **Tests** tab!`;
        }
        const testList = tests.map(t => `* **${t.title}** — ${t.durationMinutes} mins | ${t.totalMarks} marks (${t.attempted ? `Attempted — Score: ${t.score}/${t.totalMarks}` : 'Not yet attempted'})`).join('\n');
        return `Here is your current Quiz & Test overview:\n\n${testList}`;
    }

    // Rule 6: Attendance
    if (p.includes('attend') || p.includes('present') || p.includes('absent')) {
        const total = attendanceSummary.totalRecords;
        const pct = total > 0 ? Math.round((attendanceSummary.presentCount / total) * 100) : 100;
        return `### Attendance Report for ${user.name}\n\n* **Overall Attendance**: **${pct}%**\n* **Present**: ${attendanceSummary.presentCount} sessions\n* **Absent**: ${attendanceSummary.absentCount} sessions\n* **Late**: ${attendanceSummary.lateCount} sessions\n\n${pct >= 75 ? '[Passed] Attendance is above the required 75% threshold.' : '[Attention] Try to attend upcoming classes to boost your percentage above 75%.'}`;
    }

    // Rule 7: Greetings
    if (p.includes('hello') || p.includes('hi') || p.includes('hey') || p.includes('who are you')) {
        return `Hello **${user.name}**! I am your **Crismatech AI Assistant**.

${user.role === 'student' ? `As a student, I am here to help you with:
* **Course Assistance**: Summarizing lessons, explaining complex concepts, and syllabus breakdowns.
* **Assignment Guidance**: Code debugging, homework outlines, and tracking due dates.
* **Quiz & Exam Prep**: Practice questions and performance reviews.
* **Personal Attendance & Grades**: Tracking your academic progress.` : `As an ${user.role}, I can help you with course management, student statistics, grading overview, and platform analytics.`}

How can I assist you today?`;
    }

    // Default RAG fallback with retrieved knowledge
    if (knowledge.snippets.length > 0) {
        return `### Information & Learning Guidance for ${user.name}

Here is what I retrieved from your portal context regarding **"${userPrompt}"**:

${knowledge.snippets.map(s => `* ${s}`).join('\n')}

---
*Tip: Feel free to ask specific questions about your courses, assignments, quizzes, or code!*`;
    }

    return `I evaluated your query: **"${userPrompt}"** against your portal records.

Here is a quick summary of your active portal data:
* **Enrolled Courses**: ${courses.length} active courses
* **Pending Assignments**: ${assignments.filter(a => a.status === 'Pending').length} assignments
* **Attendance**: ${attendanceSummary.totalRecords > 0 ? Math.round((attendanceSummary.presentCount / attendanceSummary.totalRecords) * 100) : 100}%

Feel free to ask specific questions about your courses, assignments, quiz prep, or code debugging!`;
}

/**
 * Main RAG Query Processor
 */
async function processRAGQuery({ prompt, userId, role = 'student', courseId = null, history = [] }) {
    // Step 1: Retrieval
    const studentContext = await retrieveStudentContext(userId, role);
    if (!studentContext) {
        throw new Error('Failed to retrieve student context');
    }

    const knowledge = retrieveRelevantKnowledge(prompt, studentContext, courseId);

    // Step 2: Augmentation
    const augmentedPrompt = buildAugmentedPrompt(prompt, studentContext, knowledge, history);

    // Step 3: Generation (Gemini API or Fallback)
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim() !== '' && apiKey !== 'your-gemini-api-key-here') {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: augmentedPrompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    return {
                        answer: text,
                        citedSources: knowledge.sources,
                        ragEngine: 'Google Gemini 1.5 Flash (RAG Grounded)'
                    };
                }
            }
            console.warn('Gemini API call returned invalid payload or status:', response.status);
        } catch (err) {
            console.error('Gemini API Fetch Error:', err.message);
        }
    }

    // Fallback offline RAG response enforcing role-based rules
    const offlineAnswer = generateOfflineRAGResponse(prompt, studentContext, knowledge);
    return {
        answer: offlineAnswer,
        citedSources: knowledge.sources,
        ragEngine: 'Crismatech RAG Engine (Role Grounded)'
    };
}

module.exports = {
    retrieveStudentContext,
    retrieveRelevantKnowledge,
    buildAugmentedPrompt,
    processRAGQuery
};

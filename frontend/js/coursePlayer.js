/**
 * coursePlayer.js — Course Video Player Engine
 * Manages lesson navigation, progress tracking, and localStorage persistence.
 */

const CoursePlayer = (() => {

    // ─── Course Data ────────────────────────────────────────────────────────────
    const COURSES = {
        'web-development': {
            title: 'Web Development',
            sections: [
                {
                    title: 'Getting Started',
                    lessons: [
                        { id: 'wd-1', title: 'Introduction to Web Development', duration: '14 min', videoId: 'qz0aGYrrlhU', desc: 'Overview of web development, tools, and the course structure. Understand the difference between frontend and backend development.' },
                        { id: 'wd-2', title: 'Setting Up Your Environment', duration: '10 min', videoId: 'PlxWf493en4', desc: 'Install VS Code, browser dev tools, and set up your first project folder.' },
                        { id: 'wd-3', title: 'How the Web Works', duration: '12 min', videoId: 'zN8YNNHcaZc', desc: 'DNS, HTTP requests, servers, and how your browser renders a page.' },
                    ]
                },
                {
                    title: 'HTML Fundamentals',
                    lessons: [
                        { id: 'wd-4', title: 'HTML Structure & Tags', duration: '18 min', videoId: 'pQN-pnXPaVg', desc: 'Learn the building blocks of HTML — tags, attributes, and document structure.' },
                        { id: 'wd-5', title: 'Forms & Input Elements', duration: '16 min', videoId: 'fNcJuPIZ2WE', desc: 'Build interactive forms with inputs, labels, buttons, and validation.' },
                        { id: 'wd-6', title: 'Semantic HTML', duration: '11 min', videoId: 'kGW8Al_dXOc', desc: 'Use semantic tags like header, nav, section, article, aside for better accessibility.' },
                    ]
                },
                {
                    title: 'CSS Styling',
                    lessons: [
                        { id: 'wd-7', title: 'CSS Selectors & Properties', duration: '20 min', videoId: 'OXGznpKZ_sA', desc: 'Master CSS selectors, the box model, and essential properties.' },
                        { id: 'wd-8', title: 'Flexbox Layout', duration: '22 min', videoId: 'fYq5PXgSsbE', desc: 'Build responsive one-dimensional layouts with CSS Flexbox.' },
                        { id: 'wd-9', title: 'CSS Grid', duration: '25 min', videoId: 'EFafSYg-PkI', desc: 'Create complex two-dimensional layouts using CSS Grid.' },
                        { id: 'wd-10', title: 'Responsive Design', duration: '18 min', videoId: 'srvUrASNj0s', desc: 'Media queries, mobile-first design, and responsive best practices.' },
                    ]
                },
                {
                    title: 'JavaScript Basics',
                    lessons: [
                        { id: 'wd-11', title: 'JavaScript Introduction', duration: '15 min', videoId: 'W6NZfCO5SIk', desc: 'Variables, data types, operators, and the JS runtime.' },
                        { id: 'wd-12', title: 'Functions & Control Flow', duration: '20 min', videoId: 'PkZNo7MFNFg', desc: 'Functions, if/else, loops, and writing reusable code.' },
                        { id: 'wd-13', title: 'DOM Manipulation', duration: '24 min', videoId: '5fb2aPlgoys', desc: 'Select, create, update, and delete HTML elements using JavaScript.' },
                        { id: 'wd-14', title: 'Events & Interaction', duration: '18 min', videoId: 'XF1_MlZ5l6M', desc: 'Add interactivity with click, submit, keyboard, and custom events.' },
                        { id: 'wd-15', title: 'Fetch & APIs', duration: '22 min', videoId: 'cuEtnrL9-H0', desc: 'Make HTTP requests, handle JSON, and build data-driven UIs.' },
                        { id: 'wd-16', title: 'Final Project', duration: '30 min', videoId: 'G3e-cpL7ofc', desc: 'Build a complete responsive portfolio page using all skills learned.' },
                    ]
                }
            ]
        },
        'iot-fundamentals': {
            title: 'IoT Fundamentals',
            sections: [
                {
                    title: 'IoT Concepts',
                    lessons: [
                        { id: 'iot-1', title: 'What is IoT?', duration: '12 min', videoId: 'LlhmzVL5bm8', desc: 'Introduction to the Internet of Things ecosystem.' },
                        { id: 'iot-2', title: 'IoT Architecture', duration: '15 min', videoId: '5RJoF1H7TGk', desc: 'Sensors, actuators, gateways, cloud, and applications.' },
                    ]
                }
            ]
        },
        'python-programming': {
            title: 'Python Programming',
            sections: [
                {
                    title: 'Python Basics',
                    lessons: [
                        { id: 'py-1', title: 'Python Introduction', duration: '10 min', videoId: '_uQrJ0TkZlc', desc: 'Getting started with Python — installation and first program.' },
                        { id: 'py-2', title: 'Variables & Data Types', duration: '14 min', videoId: 'kqtD5dpn9C8', desc: 'Integers, strings, floats, lists, dicts, and type conversion.' },
                    ]
                }
            ]
        }
    };

    // ─── State ───────────────────────────────────────────────────────────────────
    let courseKey = 'web-development';
    let courseData = null;
    let allLessons = [];       // flat array of all lessons
    let currentIdx = 0;

    function getProgressKey() { return 'progress_' + courseKey; }
    function getProgress() { return JSON.parse(localStorage.getItem(getProgressKey()) || '{}'); }
    function saveProgress(p) { localStorage.setItem(getProgressKey(), JSON.stringify(p)); }

    // ─── Init ────────────────────────────────────────────────────────────────────
    function init() {
        const params = new URLSearchParams(location.search);
        courseKey = params.get('course') || 'web-development';
        courseData = COURSES[courseKey] || COURSES['web-development'];

        // Flatten lessons
        allLessons = [];
        courseData.sections.forEach(sec => sec.lessons.forEach(l => allLessons.push(l)));

        // Restore last position
        const savedIdx = parseInt(localStorage.getItem('lastLesson_' + courseKey) || '0');
        currentIdx = Math.min(savedIdx, allLessons.length - 1);

        document.getElementById('sidebarCourseTitle').textContent = courseData.title;
        renderSidebar();
        loadLesson(currentIdx);
    }

    // ─── Sidebar Render ──────────────────────────────────────────────────────────
    function renderSidebar() {
        const progress = getProgress();
        const completedCount = allLessons.filter(l => progress[l.id]).length;

        // Progress
        const pct = Math.round((completedCount / allLessons.length) * 100);
        document.getElementById('progressFill').style.width = pct + '%';
        document.getElementById('progressText').textContent = pct + '%';

        // Lessons
        const container = document.getElementById('lessonList');
        let html = '';
        let globalIdx = 0;

        courseData.sections.forEach(sec => {
            html += `<div class="section-title-bar">${sec.title}</div>`;
            sec.lessons.forEach(lesson => {
                const isCompleted = !!progress[lesson.id];
                const isActive = globalIdx === currentIdx;
                // Lock lessons after first uncompleted (allow 1 ahead)
                const isLocked = !isCompleted && globalIdx > completedCount + 1;
                const icon = isCompleted ? '✅' : (isLocked ? '🔒' : '▶️');
                const idx = globalIdx;

                html += `
          <div class="lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}"
               id="lesson-item-${idx}"
               onclick="${isLocked ? '' : `CoursePlayer.loadLesson(${idx})`}">
            <span class="lesson-icon">${icon}</span>
            <div class="lesson-info">
              <div class="lesson-title">${lesson.title}</div>
              <div class="lesson-meta">Lesson ${idx + 1}</div>
            </div>
            <span class="lesson-duration">${lesson.duration}</span>
          </div>`;
                globalIdx++;
            });
        });

        container.innerHTML = html;
    }

    // ─── Load Lesson ─────────────────────────────────────────────────────────────
    function loadLesson(idx) {
        if (idx < 0 || idx >= allLessons.length) return;
        currentIdx = idx;
        localStorage.setItem('lastLesson_' + courseKey, idx);

        const lesson = allLessons[idx];
        const progress = getProgress();

        // Update video
        document.getElementById('videoPlayer').src =
            `https://www.youtube.com/embed/${lesson.videoId}?autoplay=1&rel=0`;

        // Update bar
        document.getElementById('lessonCounter').textContent = `Lesson ${idx + 1} of ${allLessons.length}`;
        document.getElementById('videoTitle').textContent = lesson.title;

        // Update description
        document.getElementById('descTitle').textContent = lesson.title;
        document.getElementById('descText').textContent = lesson.desc;
        document.getElementById('descDuration').textContent = lesson.duration;

        // Mark button
        const btn = document.getElementById('markBtn');
        if (progress[lesson.id]) {
            btn.textContent = '✅ Completed';
            btn.classList.add('done');
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-success');
        } else {
            btn.textContent = '✅ Mark Complete';
            btn.classList.remove('done');
            btn.classList.remove('btn-success');
            btn.classList.add('btn-primary');
        }

        renderSidebar();
    }

    // ─── Mark Complete ───────────────────────────────────────────────────────────
    function markComplete() {
        const lesson = allLessons[currentIdx];
        const progress = getProgress();
        progress[lesson.id] = true;
        saveProgress(progress);

        // Show toast
        showToast('🎉 Lesson marked as complete!', 'success');

        // Auto-advance
        renderSidebar();
        loadLesson(currentIdx);     // refresh button state

        setTimeout(() => {
            if (currentIdx + 1 < allLessons.length) loadLesson(currentIdx + 1);
        }, 800);
    }

    function nextLesson() {
        if (currentIdx + 1 < allLessons.length) loadLesson(currentIdx + 1);
    }

    function prevLesson() {
        if (currentIdx > 0) loadLesson(currentIdx - 1);
    }

    // ─── Toast Utility ───────────────────────────────────────────────────────────
    function showToast(msg, type = 'primary') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;';
            document.body.appendChild(container);
        }
        const t = document.createElement('div');
        t.className = `toast align-items-center text-white bg-${type} border-0 show mb-2`;
        t.setAttribute('role', 'alert');
        t.innerHTML = `<div class="d-flex"><div class="toast-body fw-semibold">${msg}</div></div>`;
        container.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    return { init, loadLesson, markComplete, nextLesson, prevLesson };
})();

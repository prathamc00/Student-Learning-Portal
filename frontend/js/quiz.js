/**
 * quiz.js — Online Quiz Engine
 * Full JS quiz engine with countdown timer, navigation grid, auto-grading, and review mode.
 */

const QuizEngine = (() => {

    // ── Quiz Data Bank ───────────────────────────────────────────────────────────
    const QUIZ_BANK = {
        'web-dev-midterm': {
            title: '🌐 Web Dev Mid-Term Test',
            course: 'Web Development',
            duration: 30 * 60,   // seconds
            questions: [
                { q: 'Which HTML tag is used to define an internal style sheet?', options: ['<script>', '<style>', '<css>', '<link>'], correct: 1 },
                { q: 'Which attribute specifies a placeholder text in an input field?', options: ['value', 'name', 'placeholder', 'tooltip'], correct: 2 },
                { q: 'Which CSS property controls the text size?', options: ['font-style', 'text-size', 'font-size', 'text-style'], correct: 2 },
                { q: 'How do you select an element with the id "header" in CSS?', options: ['.header', '#header', '*header', 'header'], correct: 1 },
                { q: 'Which JavaScript method is used to select an element by its ID?', options: ['querySelector()', 'getElementById()', 'getElement()', 'selectElement()'], correct: 1 },
                { q: 'What does CSS stand for?', options: ['Creative Style Sheets', 'Computer Style Sheets', 'Cascading Style Sheets', 'Colorful Style Sheets'], correct: 2 },
                { q: 'Which HTML attribute is used to define inline styles?', options: ['class', 'style', 'font', 'styles'], correct: 1 },
                { q: 'Which CSS property is used to change the background color?', options: ['color', 'bgcolor', 'background-color', 'background'], correct: 2 },
                { q: 'How do you write a comment in JavaScript?', options: ['<!-- comment -->', '// comment', '** comment **', '## comment'], correct: 1 },
                { q: 'Which HTML element is used to specify a footer for a document?', options: ['<bottom>', '<section>', '<footer>', '<div>'], correct: 2 },
                { q: 'Which CSS property sets the space between elements?', options: ['spacing', 'margin', 'padding', 'border'], correct: 1 },
                { q: 'What is the correct syntax for adding a background image in CSS?', options: ['background-image: url()', 'background: url()', 'bg-image: url()', 'img: url()'], correct: 0 },
                { q: 'Which event fires when a user clicks an element?', options: ['onmouseover', 'onchange', 'onclick', 'onpress'], correct: 2 },
                { q: 'What is the default display value for a <div> element?', options: ['inline', 'inline-block', 'block', 'flex'], correct: 2 },
                { q: 'Which CSS value makes an element invisible but keeps its space?', options: ['display:none', 'visibility:hidden', 'opacity:0', 'Both B and C'], correct: 3 },
                { q: 'How are JavaScript variables declared?', options: ['dim', 'declare', 'int', 'let / var / const'], correct: 3 },
                { q: 'Which CSS layout model allows items to be in a row or column?', options: ['Grid', 'Flexbox', 'Float', 'Table'], correct: 1 },
                { q: 'What does the fetch() API do?', options: ['Selects DOM elements', 'Makes HTTP requests', 'Adds event listeners', 'Creates animations'], correct: 1 },
                { q: 'Which tag creates a hyperlink in HTML?', options: ['<link>', '<href>', '<a>', '<url>'], correct: 2 },
                { q: 'What does "responsive design" mean?', options: ['Design that loads fast', 'Design that adapts to screen sizes', 'Design with animations', 'Design with dark mode'], correct: 1 },
            ]
        },
        'iot-midterm': {
            title: '📡 IoT Mid-Term Test',
            course: 'IoT Fundamentals',
            duration: 45 * 60,
            questions: [
                { q: 'What does IoT stand for?', options: ['Internet of Technology', 'Internet of Things', 'Integrated Object Technology', 'Internet of Trade'], correct: 1 },
                { q: 'Which protocol is commonly used in IoT for lightweight messaging?', options: ['HTTP', 'FTP', 'MQTT', 'SMTP'], correct: 2 },
                { q: 'What is a sensor in an IoT system?', options: ['A device that processes data', 'A device that detects physical events and converts to signals', 'A cloud service', 'A network router'], correct: 1 },
                { q: 'Which component acts as a bridge between IoT devices and the internet?', options: ['Sensor', 'Actuator', 'Gateway', 'Cloud'], correct: 2 },
                { q: 'What is an actuator in IoT?', options: ['A device that receives signals and converts to physical action', 'A data sensor', 'A cloud platform', 'A wireless protocol'], correct: 0 },
            ]
        }
    };

    // ── State ────────────────────────────────────────────────────────────────────
    let currentQuiz = null;
    let answers = [];
    let currentQ = 0;
    let timerInterval = null;
    let timeLeft = 0;
    let submitted = false;
    let reviewMode = false;

    // ── Start Quiz ───────────────────────────────────────────────────────────────
    function start(quizId) {
        currentQuiz = QUIZ_BANK[quizId];
        if (!currentQuiz) return;

        answers = new Array(currentQuiz.questions.length).fill(null);
        currentQ = 0;
        submitted = false;
        reviewMode = false;
        timeLeft = currentQuiz.duration;

        // Update modal header title
        document.getElementById('quizModalTitle').textContent = currentQuiz.title;

        renderQuestion();
        startTimer();

        const modal = new bootstrap.Modal(document.getElementById('quizModal'));
        modal.show();
    }

    // ── Render Question ──────────────────────────────────────────────────────────
    function renderQuestion() {
        const q = currentQuiz.questions[currentQ];
        const total = currentQuiz.questions.length;

        document.getElementById('quizProgress').style.width = ((currentQ + 1) / total * 100) + '%';
        document.getElementById('qCounter').textContent = `Question ${currentQ + 1} of ${total}`;

        const answered = answers.filter(a => a !== null).length;
        document.getElementById('answeredCount').textContent = `${answered} answered`;

        // Question
        document.getElementById('questionText').textContent = `Q${currentQ + 1}. ${q.q}`;

        // Options
        const container = document.getElementById('optionsContainer');
        const letters = ['A', 'B', 'C', 'D'];
        container.innerHTML = q.options.map((opt, i) => {
            let cls = 'option-btn';
            if (answers[currentQ] === i) cls += ' selected';
            if (reviewMode) {
                if (i === q.correct) cls += ' correct';
                else if (answers[currentQ] === i && i !== q.correct) cls += ' incorrect';
                cls += ' disabled';
            }
            return `<button class="${cls}" onclick="QuizEngine.selectAnswer(${i})">${letters[i]}. ${opt}</button>`;
        }).join('');

        // Nav buttons
        document.getElementById('prevQBtn').disabled = currentQ === 0;
        document.getElementById('nextQBtn').style.display = currentQ < total - 1 ? 'inline-block' : 'none';
        document.getElementById('submitQuizBtn').style.display = currentQ === total - 1 && !submitted ? 'inline-block' : 'none';

        // Render nav grid
        renderNavGrid();
    }

    function renderNavGrid() {
        const grid = document.getElementById('navGrid');
        grid.innerHTML = currentQuiz.questions.map((_, i) => {
            let cls = 'nav-dot';
            if (i === currentQ) cls += ' active';
            else if (answers[i] !== null) cls += ' done';
            return `<span class="${cls}" onclick="QuizEngine.goTo(${i})">${i + 1}</span>`;
        }).join('');
    }

    function selectAnswer(idx) {
        if (submitted) return;
        answers[currentQ] = idx;
        renderQuestion();
    }

    function goTo(idx) {
        currentQ = idx;
        renderQuestion();
    }

    function next() { if (currentQ < currentQuiz.questions.length - 1) { currentQ++; renderQuestion(); } }
    function prev() { if (currentQ > 0) { currentQ--; renderQuestion(); } }

    // ── Timer ────────────────────────────────────────────────────────────────────
    function startTimer() {
        clearInterval(timerInterval);
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) { clearInterval(timerInterval); autoSubmit(); }
        }, 1000);
    }

    function updateTimerDisplay() {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        const el = document.getElementById('quizTimer');
        el.textContent = `⏱ ${m}:${s}`;
        el.style.color = timeLeft <= 60 ? '#ef4444' : 'white';
        if (timeLeft <= 60) el.style.animation = 'pulse 1s infinite';
        else el.style.animation = '';
    }

    function autoSubmit() {
        if (!submitted) { submitQuiz(true); }
    }

    // ── Submit & Grade ───────────────────────────────────────────────────────────
    function submitQuiz(auto = false) {
        clearInterval(timerInterval);
        submitted = true;

        const questions = currentQuiz.questions;
        let correct = 0, wrong = 0, skipped = 0;
        const timeTaken = currentQuiz.duration - timeLeft;

        questions.forEach((q, i) => {
            if (answers[i] === null) skipped++;
            else if (answers[i] === q.correct) correct++;
            else wrong++;
        });

        const score = Math.round((correct / questions.length) * 100);
        const timeFmt = `${Math.floor(timeTaken / 60)} min ${timeTaken % 60} sec`;

        // Show result panel
        document.getElementById('quizPanel').style.display = 'none';
        document.getElementById('resultPanel').style.display = 'block';

        document.getElementById('scoreValue').textContent = score + '%';
        const scoreEl = document.getElementById('scoreValue');
        if (score >= 80) { scoreEl.style.color = '#22c55e'; document.getElementById('resultMsg').textContent = '🎉 Excellent work! You passed!'; }
        else if (score >= 60) { scoreEl.style.color = '#f59e0b'; document.getElementById('resultMsg').textContent = '👍 Good attempt! Keep practicing.'; }
        else { scoreEl.style.color = '#ef4444'; document.getElementById('resultMsg').textContent = '📚 Keep studying — you can do better!'; }

        document.getElementById('rCorrect').textContent = correct;
        document.getElementById('rWrong').textContent = wrong;
        document.getElementById('rSkipped').textContent = skipped;
        document.getElementById('rTime').textContent = timeFmt;

        if (auto) {
            const note = document.createElement('p');
            note.className = 'text-danger small fw-semibold mt-2';
            note.textContent = '⏰ Time expired — auto submitted.';
            document.getElementById('resultMsg').after(note);
        }
    }

    // ── Review Mode ──────────────────────────────────────────────────────────────
    function reviewAnswers() {
        reviewMode = true;
        currentQ = 0;
        document.getElementById('resultPanel').style.display = 'none';
        document.getElementById('quizPanel').style.display = 'block';
        document.getElementById('submitQuizBtn').style.display = 'none';
        renderQuestion();

        // Add review indicator
        document.getElementById('qCounter').innerHTML += ' <span class="badge bg-info text-dark ms-2">Review Mode</span>';
    }

    function closeQuiz() {
        clearInterval(timerInterval);
        submitted = false;
        document.getElementById('quizPanel').style.display = 'block';
        document.getElementById('resultPanel').style.display = 'none';
    }

    return { start, selectAnswer, goTo, next, prev, submitQuiz, reviewAnswers, closeQuiz };
})();

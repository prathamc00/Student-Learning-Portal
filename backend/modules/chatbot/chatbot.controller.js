const { processRAGQuery, retrieveStudentContext } = require('./ragService');

/**
 * @desc    Process chatbot prompt with RAG
 * @route   POST /api/chatbot/query
 * @access  Private
 */
exports.queryChatbot = async (req, res, next) => {
    try {
        const { prompt, courseId, conversationHistory } = req.body;
        const userId = req.user._id;
        const role = req.user.role || 'student';

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ success: false, message: 'Prompt is required' });
        }

        const result = await processRAGQuery({
            prompt: prompt.trim(),
            userId,
            role,
            courseId: courseId || null,
            history: Array.isArray(conversationHistory) ? conversationHistory : []
        });

        return res.status(200).json({
            success: true,
            answer: result.answer,
            citedSources: result.citedSources || [],
            ragEngine: result.ragEngine,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Chatbot Controller Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process AI query',
            error: error.message
        });
    }
};

/**
 * @desc    Get page-aware RAG suggestion prompts
 * @route   GET /api/chatbot/suggestions
 * @access  Private
 */
exports.getSuggestions = async (req, res, next) => {
    try {
        const { currentPath } = req.query;
        const userId = req.user._id;
        const role = req.user.role || 'student';

        let defaultSuggestions = role === 'admin' ? [
            'How many users are enrolled?',
            'Show total students and instructors',
            'Summarize overall course enrollments',
            'Show active courses on platform'
        ] : [
            'What courses am I currently enrolled in?',
            'Do I have any pending assignments due soon?',
            'What is my overall attendance percentage?',
            'How can I improve my quiz scores?'
        ];

        if (currentPath) {
            const p = currentPath.toLowerCase();
            if (p.includes('/admin')) {
                defaultSuggestions = [
                    'How many users are enrolled?',
                    'Show total students and instructors',
                    'Summarize active course statistics',
                    'What assignments are active across portal?'
                ];
            } else if (p.includes('/assignments')) {
                defaultSuggestions = [
                    'Show my pending homework assignments',
                    'How do I submit an assignment upload?',
                    'Explain the requirements for my latest assignment',
                    'Give me debugging tips for my code submission'
                ];
            } else if (p.includes('/courses')) {
                defaultSuggestions = [
                    'Summarize the syllabus for my active courses',
                    'Recommend beginner topics to focus on',
                    'What modules are included in Web Development?',
                    'Where can I download course lecture notes?'
                ];
            } else if (p.includes('/attendance')) {
                defaultSuggestions = [
                    'Calculate my attendance percentage',
                    'How many more classes do I need to reach 75%?',
                    'What happens if I miss a lecture?',
                    'Show my recent attendance history'
                ];
            } else if (p.includes('/test') || p.includes('/quiz')) {
                defaultSuggestions = [
                    'List all upcoming quizzes and tests',
                    'Give me sample practice questions for my test',
                    'How is the test score calculated?',
                    'What topics are covered in the latest quiz?'
                ];
            } else if (p.includes('/certificate')) {
                defaultSuggestions = [
                    'How do I earn a course completion certificate?',
                    'What are the minimum passing criteria?',
                    'Can I download my certificate as PDF?',
                    'Verify certificate authenticity'
                ];
            }
        }

        return res.status(200).json({
            success: true,
            suggestions: defaultSuggestions
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch chatbot suggestions',
            error: error.message
        });
    }
};

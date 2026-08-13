const express = require('express');
const router = express.Router();
const { protect } = require('../../middlewares/auth.middleware');
const { queryChatbot, getSuggestions } = require('./chatbot.controller');

router.post('/query', protect, queryChatbot);
router.get('/suggestions', protect, getSuggestions);

module.exports = router;

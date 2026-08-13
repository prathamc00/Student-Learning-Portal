# 🤖 Chatbot Module (RAG Engine)

For full architecture diagrams, API specifications, and RBAC rules, see the root documentation:
📄 **[CHATBOT_README.md](../../../CHATBOT_README.md)**

## Quick Reference
- **Engine**: `ragService.js` (MongoDB Context Retrieval ➔ Prompt Augmentation ➔ Gemini 1.5 Flash / Grounded Fallback)
- **Controller**: `chatbot.controller.js`
- **Routes**: `chatbot.routes.js` (`POST /api/chatbot/query`, `GET /api/chatbot/suggestions`)

const express = require('express');
const router = express.Router();
const { uploadChatDocument, getChatHistory, sendChatText } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.array('files', 10), uploadChatDocument);
router.post('/text', protect, sendChatText);
router.get('/history', protect, getChatHistory);

module.exports = router;

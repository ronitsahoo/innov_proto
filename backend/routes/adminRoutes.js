const express = require('express');
const router = express.Router();
const {
    getStudents,
    getAnalytics
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.route('/students').get(protect, adminOnly, getStudents);
router.route('/analytics').get(protect, adminOnly, getAnalytics);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    getPendingDocuments,
    verifyDocument
} = require('../controllers/staffController');
const { protect, staffOnly } = require('../middleware/authMiddleware');

router.route('/pending-documents').get(protect, staffOnly, getPendingDocuments);
router.route('/verify-document').put(protect, staffOnly, verifyDocument);

module.exports = router;

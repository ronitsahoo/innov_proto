const express = require('express');
const router = express.Router();
const {
    getAllStudentsWithDocs,
    getPendingDocuments,
    getVerificationHistory,
    verifyDocument
} = require('../controllers/staffController');
const { protect, staffOnly } = require('../middleware/authMiddleware');

router.get('/all-students', protect, staffOnly, getAllStudentsWithDocs);
router.get('/pending-documents', protect, staffOnly, getPendingDocuments);
router.get('/verification-history', protect, staffOnly, getVerificationHistory);
router.put('/verify-document', protect, staffOnly, verifyDocument);

module.exports = router;

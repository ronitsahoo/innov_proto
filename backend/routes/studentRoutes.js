const express = require('express');
const router = express.Router();
const {
    getProfile,
    uploadDocument,
    deleteDocument,
    submitDocuments,
    applyHostel,
    activateLMS,
    getSubjects,
    registerSubject,
    getRegisteredSubjects,
    getRequiredDocuments,
    getHostelAvailability
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/required-documents', protect, getRequiredDocuments);
router.get('/hostel-availability', protect, getHostelAvailability);
router.route('/profile').get(protect, getProfile);
router.route('/upload-document').post(protect, upload.single('file'), uploadDocument);
router.route('/document/:docId').delete(protect, deleteDocument);
router.route('/submit-documents').post(protect, submitDocuments);
router.route('/apply-hostel').post(protect, applyHostel);
router.route('/activate-lms').post(protect, activateLMS);
router.route('/subjects').get(protect, getSubjects);
router.route('/register-subject').post(protect, registerSubject);
router.route('/registered-subjects').get(protect, getRegisteredSubjects);

module.exports = router;

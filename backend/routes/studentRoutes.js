const express = require('express');
const router = express.Router();
const {
    getProfile,
    uploadDocument,
    applyHostel,
    activateLMS
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/profile').get(protect, getProfile);
router.route('/upload-document').post(protect, upload.single('file'), uploadDocument);
router.route('/apply-hostel').post(protect, applyHostel);
router.route('/activate-lms').post(protect, activateLMS);

module.exports = router;

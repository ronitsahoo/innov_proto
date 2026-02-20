const express = require('express');
const router = express.Router();
const {
    getStudents,
    getAnalytics,
    getHostelApplications,
    approveRejectHostel,
    getAllPayments,
    getAdminSettings,
    updateRequiredDocuments,
    updateHostelRooms,
    getHostelAvailability,
    addStaff,
    deleteStudent
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.route('/students').get(protect, adminOnly, getStudents);
router.route('/students/:id').delete(protect, adminOnly, deleteStudent); // Add delete route
router.route('/add-staff').post(protect, adminOnly, addStaff); // Add staff route
router.route('/analytics').get(protect, adminOnly, getAnalytics);
router.route('/hostel-applications').get(protect, adminOnly, getHostelApplications);
router.route('/hostel-applications/:studentId').put(protect, adminOnly, approveRejectHostel);
router.route('/payments').get(protect, adminOnly, getAllPayments);

// Admin settings routes
router.route('/settings').get(protect, adminOnly, getAdminSettings);
router.route('/settings/documents').put(protect, adminOnly, updateRequiredDocuments);
router.route('/settings/hostel-rooms').put(protect, adminOnly, updateHostelRooms);

// Accessible by all logged-in users (students need to check availability)
router.route('/hostel-availability').get(protect, getHostelAvailability);

module.exports = router;



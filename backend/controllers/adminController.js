const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private (Admin)
const getStudents = asyncHandler(async (req, res) => {
    const students = await StudentProfile.find({})
        .populate('userId', 'name email branch year role')
        .sort({ createdAt: -1 });
    res.json(students);
});

// @desc    Get analytics
// @route   GET /api/admin/analytics
// @access  Private (Admin)
const getAnalytics = asyncHandler(async (req, res) => {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const students = await StudentProfile.find({});

    const completedOnboarding = students.filter(s => s.progressPercentage === 100).length;
    const pendingDocuments = students.reduce((acc, curr) => {
        const pending = curr.documents.filter(d => d.status === 'pending').length;
        return acc + pending;
    }, 0);
    const feePendingCount = students.filter(s => s.fee.status === 'pending').length;

    res.json({
        totalStudents,
        completedOnboarding,
        pendingDocuments,
        feePendingCount
    });
});

module.exports = {
    getStudents,
    getAnalytics
};

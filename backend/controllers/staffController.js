const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/StudentProfile');

// @desc    Get pending documents
// @route   GET /api/staff/pending-documents
// @access  Private (Staff/Admin)
const getPendingDocuments = asyncHandler(async (req, res) => {
    // Find profiles with at least one pending document
    const students = await StudentProfile.find({ 'documents.status': 'pending' })
        .populate('userId', 'name email branch year');

    // Extract only the pending documents with user info
    // Or just return the student profiles and let frontend filter
    res.json(students);
});


// @desc    Verify document
// @route   PUT /api/staff/verify-document
// @access  Private (Staff/Admin)
const verifyDocument = asyncHandler(async (req, res) => {
    const { studentId, documentId, status, rejectionReason } = req.body;

    const student = await StudentProfile.findOne({ userId: studentId });

    if (student) {
        const doc = student.documents.id(documentId);

        if (doc) {
            doc.status = status;
            if (status === 'rejected') {
                doc.rejectionReason = rejectionReason;
                // Add notification
                student.notifications.push({
                    message: `Your document (${doc.type}) was rejected: ${rejectionReason}`,
                    date: Date.now()
                });
            } else if (status === 'approved') {
                student.notifications.push({
                    message: `Your document (${doc.type}) was approved.`,
                    date: Date.now()
                });
            }

            await student.save();
            res.json(student);
        } else {
            res.status(404);
            throw new Error('Document not found');
        }
    } else {
        res.status(404);
        throw new Error('Student not found');
    }
});

module.exports = {
    getPendingDocuments,
    verifyDocument
};

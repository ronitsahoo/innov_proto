const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');

// @desc    Get all students with their documents (for Verifications search page)
// @route   GET /api/staff/all-students
// @access  Private (Staff/Admin)
const getAllStudentsWithDocs = asyncHandler(async (req, res) => {
    const { search } = req.query;

    let userQuery = { role: 'student' };
    if (search) {
        userQuery = {
            role: 'student',
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { branch: { $regex: search, $options: 'i' } },
                { rollNumber: { $regex: search, $options: 'i' } }
            ]
        };
    }

    const users = await User.find(userQuery).select('name email branch year rollNumber');
    const userIds = users.map(u => u._id);

    const profiles = await StudentProfile.find({ userId: { $in: userIds } });

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.userId.toString()] = p; });

    const result = users.map(u => {
        const profile = profileMap[u._id.toString()];
        return {
            _id: u._id,
            name: u.name,
            email: u.email,
            branch: u.branch,
            year: u.year,
            rollNumber: u.rollNumber,
            documents: profile?.documents || [],
            progressPercentage: profile?.progressPercentage || 0,
            fee: profile?.fee || null,
            hostel: profile?.hostel || null
        };
    });

    res.json(result);
});


// @desc    Get pending documents (for verification queue)
// @route   GET /api/staff/pending-documents
// @access  Private (Staff/Admin)
const getPendingDocuments = asyncHandler(async (req, res) => {
    const profiles = await StudentProfile.find({ 'documents.status': 'submitted' })
        .populate('userId', 'name email branch year rollNumber');

    const result = profiles.map(p => ({
        _id: p.userId?._id,
        name: p.userId?.name,
        email: p.userId?.email,
        branch: p.userId?.branch,
        year: p.userId?.year,
        rollNumber: p.userId?.rollNumber,
        profileId: p._id,
        documents: p.documents.filter(d => d.status === 'submitted')
    }));

    res.json(result);
});


// @desc    Get verification history (all approved/rejected docs across all students)
// @route   GET /api/staff/verification-history
// @access  Private (Staff/Admin)
const getVerificationHistory = asyncHandler(async (req, res) => {
    const profiles = await StudentProfile.find({
        'documents.status': { $in: ['approved', 'rejected'] }
    }).populate('userId', 'name email branch year rollNumber');

    const history = [];

    profiles.forEach(profile => {
        const student = profile.userId;
        profile.documents
            .filter(d => d.status === 'approved' || d.status === 'rejected')
            .forEach(doc => {
                history.push({
                    studentId: student?._id,
                    studentName: student?.name || 'Unknown',
                    studentEmail: student?.email || '',
                    studentBranch: student?.branch || '',
                    studentYear: student?.year || '',
                    docId: doc._id,
                    docType: doc.type,
                    originalName: doc.originalName,
                    fileUrl: doc.fileUrl,
                    status: doc.status,
                    rejectionReason: doc.rejectionReason || null,
                    updatedAt: doc.updatedAt || doc.createdAt
                });
            });
    });

    history.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(history);
});


// @desc    Verify document (approve/reject)
// @route   PUT /api/staff/verify-document
// @access  Private (Staff/Admin)
const verifyDocument = asyncHandler(async (req, res) => {
    const { studentId, documentId, status, rejectionReason } = req.body;

    const student = await StudentProfile.findOne({ userId: studentId });

    if (!student) {
        res.status(404);
        throw new Error('Student not found');
    }

    const doc = student.documents.id(documentId);

    if (!doc) {
        res.status(404);
        throw new Error('Document not found');
    }

    doc.status = status;
    if (status === 'rejected') {
        doc.rejectionReason = rejectionReason || 'No reason provided';
        student.notifications.push({
            message: `Your document "${doc.type}" was rejected. Reason: ${rejectionReason || 'No reason provided'}`,
            date: Date.now()
        });
    } else if (status === 'approved') {
        doc.rejectionReason = undefined;
        student.notifications.push({
            message: `Your document "${doc.type}" has been approved! ✅`,
            date: Date.now()
        });
    }

    await student.save();
    res.json({ success: true, document: doc });
});


module.exports = {
    getAllStudentsWithDocs,
    getPendingDocuments,
    getVerificationHistory,
    verifyDocument
};

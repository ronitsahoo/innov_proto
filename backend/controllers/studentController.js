const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/StudentProfile');

// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Private (Student)
const getProfile = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ userId: req.user._id }).populate('userId', 'name email branch year');
    if (profile) {
        res.json(profile);
    } else {
        res.status(404);
        throw new Error('Profile not found');
    }
});

// @desc    Upload document
// @route   POST /api/student/upload-document
// @access  Private (Student)
const uploadDocument = asyncHandler(async (req, res) => {
    const { type } = req.body;

    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });

    if (profile) {
        const newDoc = {
            fileUrl: `/uploads/${req.file.filename}`,
            type,
            status: 'pending'
        };

        profile.documents.push(newDoc);
        await profile.save();

        res.status(201).json(profile);
    } else {
        res.status(404);
        throw new Error('Profile not found');
    }
});

const applyHostel = asyncHandler(async (req, res) => {
    const { roomType } = req.body;
    const profile = await StudentProfile.findOne({ userId: req.user._id });

    if (profile) {
        // Simple allocation logic
        const block = roomType === 'Male' ? 'B' : 'G';
        const floor = Math.floor(Math.random() * 4) + 1;
        const roomNo = Math.floor(Math.random() * 20) + 1;

        profile.hostel.roomType = roomType;
        profile.hostel.status = 'approved';
        // We can store exact room in another field if schema allows, or just assume type for now since roomType in schema matches string
        // Schema: roomType: String
        // Let's store "Boys Hostel - B-101"
        profile.hostel.roomType = `${roomType === 'Male' ? 'Boys' : 'Girls'} Hostel - ${block}-${floor}0${roomNo}`;

        await profile.save();
        res.json(profile);
    } else {
        res.status(404);
        throw new Error('Profile not found');
    }
});

const activateLMS = asyncHandler(async (req, res) => {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (profile) {
        profile.lmsActivated = true;
        await profile.save();
        res.json(profile);
    } else {
        res.status(404);
        throw new Error('Profile not found');
    }
});

module.exports = {
    getProfile,
    uploadDocument,
    applyHostel,
    activateLMS
};

const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const AdminSettings = require('../models/AdminSettings');

// Helper to get or create singleton settings doc
const getSettings = async () => {
    let settings = await AdminSettings.findOne();
    if (!settings) {
        settings = await AdminSettings.create({ requiredDocuments: [], hostelRooms: [] });
    }
    return settings;
};

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

// @desc    Get all hostel applications (pending, approved, rejected)
// @route   GET /api/admin/hostel-applications
// @access  Private (Admin)
const getHostelApplications = asyncHandler(async (req, res) => {
    const profiles = await StudentProfile.find({
        'hostel.status': { $ne: 'not_applied' }
    }).populate('userId', 'name email branch year');

    const applications = profiles.map(profile => ({
        studentId: profile.userId._id,
        name: profile.userId.name,
        email: profile.userId.email,
        branch: profile.userId.branch,
        year: profile.userId.year,
        hostel: profile.hostel
    }));

    res.json(applications);
});

// @desc    Approve or reject a hostel application
// @route   PUT /api/admin/hostel-applications/:studentId
// @access  Private (Admin)
const approveRejectHostel = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        res.status(400);
        throw new Error('Status must be approved or rejected');
    }

    const profile = await StudentProfile.findOne({ userId: studentId });

    if (!profile) {
        res.status(404);
        throw new Error('Student profile not found');
    }

    // Only decrement room count when approving a pending application
    if (status === 'approved' && profile.hostel.status === 'pending') {
        const settings = await getSettings();
        const roomEntry = settings.hostelRooms.find(
            r => r.gender === profile.hostel.gender && r.roomType === profile.hostel.roomType
        );
        if (roomEntry) {
            if (roomEntry.available <= 0) {
                res.status(400);
                throw new Error('No rooms available for this type — cannot approve');
            }
            roomEntry.available = Math.max(0, roomEntry.available - 1);
            await settings.save();
        }
    }

    profile.hostel.status = status;
    if (status === 'rejected') {
        profile.hostel.rejectionReason = rejectionReason || 'Application rejected by admin';
    } else {
        profile.hostel.rejectionReason = undefined;
    }

    await profile.save();
    res.json({ message: `Hostel application ${status}`, hostel: profile.hostel });
});

// @desc    Get all payment transactions
// @route   GET /api/admin/payments
// @access  Private (Admin)
const getAllPayments = asyncHandler(async (req, res) => {
    const students = await StudentProfile.find({})
        .populate('userId', 'name email branch year')
        .sort({ createdAt: -1 });

    const allTransactions = [];

    students.forEach(student => {
        if (student.fee && student.fee.history && student.fee.history.length > 0) {
            student.fee.history.forEach(payment => {
                allTransactions.push({
                    studentId: student.userId._id,
                    studentName: student.userId.name,
                    email: student.userId.email,
                    branch: student.userId.branch,
                    year: student.userId.year,
                    amount: payment.amount,
                    date: payment.date,
                    transactionId: payment.transactionId,
                    orderId: payment.orderId,
                    totalAmount: student.fee.totalAmount,
                    paidAmount: student.fee.paidAmount,
                    status: student.fee.status
                });
            });
        }
    });

    // Sort by date (most recent first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(allTransactions);
});
// @desc    Get admin settings (required docs + hostel rooms)
// @route   GET /api/admin/settings
// @access  Private (Admin)
const getAdminSettings = asyncHandler(async (req, res) => {
    const settings = await getSettings();
    res.json(settings);
});

// @desc    Update required documents list
// @route   PUT /api/admin/settings/documents
// @access  Private (Admin)
const updateRequiredDocuments = asyncHandler(async (req, res) => {
    const { documents } = req.body; // Array of { name, type, description }

    if (!Array.isArray(documents)) {
        res.status(400);
        throw new Error('documents must be an array');
    }

    // Validate each doc
    for (const doc of documents) {
        if (!doc.name || !doc.type) {
            res.status(400);
            throw new Error('Each document must have a name and type');
        }
    }

    const settings = await getSettings();
    settings.requiredDocuments = documents;
    await settings.save();

    res.json(settings.requiredDocuments);
});

// @desc    Update hostel room inventory
// @route   PUT /api/admin/settings/hostel-rooms
// @access  Private (Admin)
const updateHostelRooms = asyncHandler(async (req, res) => {
    const { rooms } = req.body; // Array of { gender, roomType, total, available }

    if (!Array.isArray(rooms)) {
        res.status(400);
        throw new Error('rooms must be an array');
    }

    const validGenders = ['Male', 'Female'];
    const validRoomTypes = ['single', 'double', 'triple'];

    for (const room of rooms) {
        if (!validGenders.includes(room.gender) || !validRoomTypes.includes(room.roomType)) {
            res.status(400);
            throw new Error(`Invalid gender or roomType in room entry`);
        }
        if (room.total < 0 || room.available < 0) {
            res.status(400);
            throw new Error('Room counts cannot be negative');
        }
    }

    const settings = await getSettings();

    // For each new room entry, preserve existing available count if total hasn't changed
    // to avoid resetting availability when admin just adds a new type
    const updatedRooms = rooms.map(newRoom => {
        const existing = settings.hostelRooms.find(
            r => r.gender === newRoom.gender && r.roomType === newRoom.roomType
        );
        // If total increases, increase available proportionally
        if (existing && newRoom.total > existing.total) {
            const added = newRoom.total - existing.total;
            return { ...newRoom, available: Math.min(existing.available + added, newRoom.total) };
        }
        return newRoom;
    });

    settings.hostelRooms = updatedRooms;
    await settings.save();

    res.json(settings.hostelRooms);
});

// @desc    Get hostel room availability (for students)
// @route   GET /api/admin/hostel-availability
// @access  Private
const getHostelAvailability = asyncHandler(async (req, res) => {
    const settings = await getSettings();
    const availability = settings.hostelRooms.map(r => ({
        gender: r.gender,
        roomType: r.roomType,
        available: r.available
    }));
    res.json(availability);
});

// @desc    Add a new staff member
// @route   POST /api/admin/add-staff
// @access  Private (Admin)
const addStaff = asyncHandler(async (req, res) => {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !role) {
        res.status(400);
        throw new Error('Please provide all required fields');
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Hash password handled in User model pre-save? 
    // Usually yes, but let's assume User.create handles it via model hooks if setup.
    // Checking User model if needed, but standard practice is model hook.
    // If not, we might need bcrypt here. Assuming model handles it for now.

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        role,
        department // Assuming User model has department field or it's ignored
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Delete a student
// @route   DELETE /api/admin/students/:id
// @access  Private (Admin)
const deleteStudent = asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.id);

    if (!student) {
        res.status(404);
        throw new Error('Student not found');
    }

    if (student.role !== 'student') {
        res.status(400);
        throw new Error('Can only delete students via this route');
    }

    await StudentProfile.deleteOne({ userId: student._id });
    await User.deleteOne({ _id: student._id });

    res.json({ message: 'Student removed' });
});

module.exports = {
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
};



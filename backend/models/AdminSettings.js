const mongoose = require('mongoose');

const requiredDocumentSchema = new mongoose.Schema({
    name: { type: String, required: true },       // Display name e.g. "10th Marksheet"
    type: { type: String, required: true },       // Unique key e.g. "10th_marksheet"
    description: { type: String, default: '' }   // Optional hint shown to student
}, { _id: true });

const hostelRoomSchema = new mongoose.Schema({
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    roomType: { type: String, enum: ['single', 'double', 'triple'], required: true },
    total: { type: Number, default: 0, min: 0 },
    available: { type: Number, default: 0, min: 0 }
}, { _id: false });

// Singleton settings document — always one record
const adminSettingsSchema = new mongoose.Schema({
    requiredDocuments: [requiredDocumentSchema],
    hostelRooms: [hostelRoomSchema]
}, { timestamps: true });

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);

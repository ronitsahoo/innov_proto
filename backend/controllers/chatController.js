const asyncHandler = require('express-async-handler');
const ChatMessage = require('../models/ChatMessage');
const StudentProfile = require('../models/StudentProfile');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Upload document via Chatbot
// @route   POST /api/chat/upload
// @access  Private (Student)
const uploadChatDocument = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        res.status(400);
        throw new Error('No files uploaded');
    }

    const userId = req.user._id;
    const results = [];
    let anyMapped = false;

    // Save a single user message listing all uploaded files
    const fileNames = req.files.map(f => f.originalname).join(', ');
    await ChatMessage.create({
        userId,
        sender: 'student',
        message: `Uploaded ${req.files.length} document(s): ${fileNames}`,
        attachment: `/uploads/${req.files[0].filename}` // show first file as attachment
    });

    const profile = await StudentProfile.findOne({ userId });

    for (const file of req.files) {
        const filePath = `/uploads/${file.filename}`;
        const absolutePath = path.join(__dirname, '..', filePath);

        try {
            // Read file for Gemini
            const fileData = fs.readFileSync(absolutePath);
            const imagePart = {
                inlineData: {
                    data: fileData.toString('base64'),
                    mimeType: file.mimetype,
                },
            };

            // Call Gemini Vision
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            const prompt = `You are an AI Academic Document Classification System.

Analyze the uploaded document and determine its document type.

Do NOT extract detailed data.
Do NOT summarize.
Only classify.

Possible types:
- 10th Marksheet
- 12th Marksheet
- Diploma Marksheet
- Aadhaar Card
- PAN Card
- Transfer Certificate
- Caste Certificate
- Income Certificate
- Migration Certificate
- Passport Photo
- Signature
- Other

Return strictly valid JSON:

{
  "document_type": "string",
  "confidence": number (0-100)
}`;

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            let classification;
            try {
                const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
                classification = JSON.parse(jsonString);
            } catch (e) {
                console.error("Gemini JSON Parse Error:", text);
                classification = { document_type: "Other", confidence: 0 };
            }

            const { document_type, confidence } = classification;
            let status = 'failed';

            // Map to profile if confidence is high
            if (confidence >= 70 && document_type !== 'Other' && profile) {
                const existingIndex = profile.documents.findIndex(
                    d => d.type === document_type && ['pending', 'uploaded'].includes(d.status)
                );

                if (existingIndex !== -1) {
                    // Delete old file
                    const oldFilePath = path.join(__dirname, '..', profile.documents[existingIndex].fileUrl);
                    if (fs.existsSync(oldFilePath)) {
                        try { fs.unlinkSync(oldFilePath); } catch (e) { }
                    }
                    profile.documents[existingIndex].fileUrl = filePath;
                    profile.documents[existingIndex].originalName = file.originalname;
                    profile.documents[existingIndex].status = 'uploaded';
                } else {
                    profile.documents.push({
                        type: document_type,
                        fileUrl: filePath,
                        originalName: file.originalname,
                        status: 'uploaded'
                    });
                }
                status = 'mapped';
                anyMapped = true;
            }

            results.push({
                fileName: file.originalname,
                document_type,
                confidence,
                status,
                fileUrl: filePath
            });

        } catch (error) {
            console.error(`Gemini Error for ${file.originalname}:`, error.message);
            results.push({
                fileName: file.originalname,
                document_type: 'Error',
                confidence: 0,
                status: 'error',
                error: error.message
            });
        }
    }

    // Save profile once after all documents are processed
    if (profile && anyMapped) {
        await profile.save();
    }

    // Build summary bot message
    let botMessage = `📋 **Classification Results (${results.length} document${results.length > 1 ? 's' : ''}):**\n\n`;
    results.forEach((r, i) => {
        if (r.status === 'mapped') {
            botMessage += `✅ **${r.fileName}** → ${r.document_type} (${r.confidence}% confidence) — Uploaded!\n`;
        } else if (r.status === 'error') {
            botMessage += `❌ **${r.fileName}** → Error processing this file.\n`;
        } else {
            botMessage += `⚠️ **${r.fileName}** → ${r.document_type} (${r.confidence}%) — Low confidence, please upload manually.\n`;
        }
    });

    await ChatMessage.create({
        userId,
        sender: 'aria',
        message: botMessage
    });

    res.json({
        message: botMessage,
        results,
        mapped: anyMapped
    });
});

// @desc    Get chat history
// @route   GET /api/chat/history
// @access  Private
const getChatHistory = asyncHandler(async (req, res) => {
    const messages = await ChatMessage.find({ userId: req.user._id }).sort({ createdAt: 1 });
    res.json(messages);
});

const sendChatText = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
        res.status(400);
        throw new Error('Message is required');
    }

    // Save User Message
    await ChatMessage.create({
        userId,
        sender: 'student',
        message
    });

    // Simple AI Logic (Rule-based for now, can be Gemini text later)
    let botResponse = "I'm not sure about that. Try asking about 'fee', 'documents', 'hostel', 'timetable', or 'subjects'.";
    const lowerInput = message.toLowerCase();

    // Use a subset of the previous frontend logic, but simpler or more robust
    if (lowerInput.includes('fee') || lowerInput.includes('payment')) {
        const profile = await StudentProfile.findOne({ userId });
        const total = profile?.fee?.amount || 50000; // Using amount from schema
        const paid = profile?.fee?.status === 'paid' ? total : 0;
        const remaining = total - paid;
        if (remaining <= 0) {
            botResponse = `Great news! Your tuition fees are fully paid. (Total: ₹${total.toLocaleString()})`;
        } else {
            botResponse = `You have paid ₹${paid.toLocaleString()}. The remaining balance is ₹${remaining.toLocaleString()}.`;
        }
    } else if (lowerInput.includes('document')) {
        const profile = await StudentProfile.findOne({ userId });
        const pendingDocs = profile?.documents?.filter(d => d.status !== 'approved' && d.status !== 'submitted').map(d => d.type).join(', ');
        if (pendingDocs) {
            botResponse = `You still need to upload/submit: ${pendingDocs}.`;
        } else {
            botResponse = `All your documents are submitted or approved!`;
        }
    } else if (lowerInput.includes('hostel')) {
        const profile = await StudentProfile.findOne({ userId });
        const status = profile?.hostel?.status || 'not_applied';
        botResponse = status === 'approved' ? 'Your hostel room is allocated!' : 'You can apply for hostel in the Dashboard.';
    } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
        botResponse = "Hello! How can I help you complete your registration today?";
    }

    // Save Bot Response
    const botMsg = await ChatMessage.create({
        userId,
        sender: 'aria',
        message: botResponse
    });

    res.json(botMsg);
});


module.exports = { uploadChatDocument, getChatHistory, sendChatText };

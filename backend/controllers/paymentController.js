const Razorpay = require('razorpay');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const StudentProfile = require('../models/StudentProfile');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_1DP5mmOlF5G5ag', // Fallback for dev
    key_secret: process.env.RAZORPAY_KEY_SECRET || 's4hE7q71e9lDq6z4k9o7j5h2' // Fallback for dev
});

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Private (Student)
const createOrder = asyncHandler(async (req, res) => {
    const { amount } = req.body; // Amount in INR

    if (!amount) {
        res.status(400);
        throw new Error('Please provide amount');
    }

    const options = {
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500);
        throw new Error('Something went wrong with Razorpay order creation');
    }
});

// @desc    Verify Razorpay Payment
// @route   POST /api/payment/verify
// @access  Private (Student)
const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 's4hE7q71e9lDq6z4k9o7j5h2')
        .update(body.toString())
        .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        // Update database
        const profile = await StudentProfile.findOne({ userId: req.user._id });

        if (profile) {
            profile.fee.status = 'paid';
            profile.fee.transactionId = razorpay_payment_id;
            profile.fee.orderId = razorpay_order_id;
            profile.fee.signature = razorpay_signature;
            profile.fee.amount = profile.fee.amount || 50000; // Ensure amount is set

            await profile.save();

            res.json({
                message: 'Payment verified successfully',
                paymentId: razorpay_payment_id
            });
        } else {
            res.status(404);
            throw new Error('Profile not found');
        }
    } else {
        res.status(400);
        throw new Error('Invalid signature');
    }
});

module.exports = {
    createOrder,
    verifyPayment
};

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aria_db';

const users = [
    {
        name: 'Admin User',
        email: 'admin@aria.com',
        password: 'Admin@1234',
        role: 'admin',
    },
    {
        name: 'Staff User',
        email: 'staff@aria.com',
        password: 'Staff@1234',
        role: 'staff',
    },
];

async function seedUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        for (const userData of users) {
            const existing = await User.findOne({ email: userData.email });
            if (existing) {
                console.log(`User ${userData.email} already exists, skipping.`);
                continue;
            }
            // Password will be hashed by the pre-save hook in the model
            const user = new User(userData);
            await user.save();
            console.log(`Created ${userData.role} user: ${userData.email}`);
        }

        console.log('\nDone! Users created successfully.');
    } catch (err) {
        console.error('Error seeding users:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seedUsers();

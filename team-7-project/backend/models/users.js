/*
 * File Name: users.js
 * Author(s): Adrian Myers, Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 * Note: code based on slides from week6 "AUTHENTICATION (16) (2) (5).pptx" in comp229(Centennial College)
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)
const bcrypt = require('bcrypt'); 

// Set the number of salt rounds for bcrypt. 10 is a good standard default.
const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hashed_password: {
        type: String, required: true
    },
    salt: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, {
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

UserSchema.virtual('password').set(function (password) {//checks given password aagainst encrypted password
    this._password = password;
})
    .get(function () {
        return this._password;
    });

// --- ASYNCHRONOUS PRE-SAVE HOOK (for secure hashing) ---
UserSchema.pre('save', async function (next) {
    // Only run this function if the password has been modified (or is new)
    if (!this.isModified('_password')) {
        return next();
    }

    // Hash password
    try {
        const hash = await bcrypt.hash(this._password, SALT_ROUNDS);
        this.hashed_password = hash;
        this._password = undefined;
        next();
    } catch (err) {
        // Handle hashing failure
        next(err);
    }
});


UserSchema.path('hashed_password').validate(function (v) {
    // Validates password length before it's passed
    if (this._password && this._password.length < 6) {
        this.invalidate('password', 'Password must be at least 6 characters.');
    }
    if (this.isNew && !this._password) {
        this.invalidate('password', 'Password is required');
    }
}, null);

// --- METHODS ---
UserSchema.methods = { 
    authenticate: async function (plainText) {
        if (!plainText || !this.hashed_password) return false;
        try {
            return await bcrypt.compare(plainText, this.hashed_password);
        } catch (err) {
            console.error("Bcrypt comparison failed:", err);
            return false;
        }
    } 
}


module.exports = mongoose.model("User", UserSchema);
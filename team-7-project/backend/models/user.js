/*
 * File Name: users.js
 * Author(s): Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 * Note: code based on slides from week6 "AUTHENTICATION (16) (2) (5).pptx" in comp229(Centennial College)
 */

//See media.js for any code details 
const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(process.cwd(), 'public', 'documents', 'userRoles.json');
const rolesData = JSON.parse(fs.readFileSync(filePath), 'utf8');

// Flatten the object values into a single array: ["user", "admin", "libraryAdmin", "branchAdmin"]
const roles = [...rolesData.user, ...rolesData.admin];

// 10 is a good standard default.
const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String },
    // MANAGEMENT ACCESS
    managementAccess: {
        libraryId: { type: String, default: null },//sent in jwt token payload. Upload context in authController const.token if value changes
        branchId: { type: String, default: null },
        //role: { type: String, default: 'patron' }
    },
    profileImage: {
        type: String,
        required: true,
        validate: {
            // Ensures the string saved to DB always looks like an image path
            validator: (v) => /\.(jpg|jpeg|png|gif|webp)$/i.test(v),
            message: "Profile image path must end with a valid image extension."
        },
        default: function () {
            // Accesses the unique MongoDB ID for this specific document
            const userId = this._id.toString();

            // set a default path: /users/[userId]/[userId].png
            // This ensures every user has a unique, predictable folder and filename
            return `/users/${userId}/profileimage.png`;
        }
    },
    coverImage: {
        type: String,
        required: true,
        validate: {
            // Ensures the string saved to DB always looks like an image path
            validator: (v) => /\.(jpg|jpeg|png|gif|webp)$/i.test(v),
            message: "Profile image path must end with a valid image extension."
        },
        default: function () {
            // Accesses the unique MongoDB ID for this specific document
            const userId = this._id.toString();

            // set a default path: /users/[userId]/[userId].png
            // This ensures every user has a unique, predictable folder and filename
            return `/users/${userId}/coverimage.png`;
        }
    },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    altEmail: { type: String, unique: true, sparse: true },
    address: {
        street: { type: String },
        addressLineTwo: { type: String },
        city: { type: String },
        Country: { type: String },
        province: { type: String },
        postalCode: { type: String }
    },
    hashed_password: {
        type: String, /*required: true*/ //currently the required validation is firing before the "pre" check
    },
    //PASSWORD RESET
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    role: { type: String, enum: roles, default: 'user' },
    dateOfBirth: { type: Date },
    lastLogin: { type: Date }//update in authController when user signs in
}, {
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

// Index the management fields for fast permission checks
UserSchema.index({ "managementAccess.libraryId": 1, "managementAccess.branchId": 1 });

UserSchema.virtual('password').set(function (password) {//checks given password against encrypted password
    this._password = password;
})
    .get(function () {
        return this._password;
    });

//ASYNCHRONOUS PRE-SAVE HOOK (for secure hashing)
UserSchema.pre('save', async function (next) {
    // Only run this function if the password has been modified 
    /*if (!this.isModified('_password')) {
        return next();

        
    }*/
    //runs if password does not exist (or for reset)
    if (!this._password) {
        return next();
    }

    // Hash password
    try {
        const hash = await bcrypt.hash(this._password, SALT_ROUNDS);
        this.hashed_password = hash;
        // Clear the reset token once the password is successfully changed
        this.resetPasswordToken = undefined;
        this.resetPasswordExpires = undefined;
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
    //updated change means this is the only validator for the password requirement
    //during registration //required: true was removed from the schema for hashed_password
    if (this.isNew && !this._password) {
        this.invalidate('password', 'Password is required');
    }
    return true;
}, null);

UserSchema.methods = {

    authenticate: async function (plainText) {
        if (!plainText || !this.hashed_password) return false;
        try {
            return await bcrypt.compare(plainText, this.hashed_password);
        } catch (err) {
            console.error("Bycript authenticate failed:", err);
            return false;
        }
    }
}


module.exports = mongoose.model("User", UserSchema);
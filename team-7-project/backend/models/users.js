/*
 * File Name: users.js
 * Author(s): Adrian Myers, Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 * Note: code based on slides from week6 "AUTHENTICATION (16) (2) (5).pptx" in comp229(Centennial College)
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hashed_password: {
        type: String, required: true
    },
    salt: String, 
    role: {type: String, enum:['user', 'admin'], default: 'user'}
}, {
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

UserSchema.virtual('password')//checks given password aagainst encrypted password
    .set(function (password) {
        this._password = password;
        this.salt = this.makeSalt();
        this.hashed_password = this.encryptPassword(password)
        //this.hashed_password = password;
    })
    .get(function () {
        return this._password;
    });
UserSchema.path('hashed_password').validate(function (v) {//validates password before it's passed
    if (this._password && this._password.length < 6) {
        this.invalidate('password', 'Password must be at least 6 characters.');
    }
    if (this.isNew && !this._password) {
        this.invalidate('password', 'Password is required');
    }
}, null);
UserSchema.methods = {
    authenticate: function (plainText) {
        return this.encryptPassword(plainText) === this.hashed_password
    },
    encryptPassword: function (password) {
        if (!password) return ''
        try {
            return crypto
                .createHmac('sha1', this.salt)
                .update(password)
                .digest('hex')
        } catch (err) {
            return ''
        }
    },
    makeSalt: function () {
        return Math.round((new Date().valueOf() * Math.random())) + ''
    }
}

//module.exports = mongoose.model('User', UserSchema);


module.exports = mongoose.model("User", UserSchema);
/*
 * File Name: users.js
 * Author(s): 
 * Student ID (s): 
 * Date: 
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const UsersSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, {
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

module.exports = mongoose.model("Users", UsersSchema);
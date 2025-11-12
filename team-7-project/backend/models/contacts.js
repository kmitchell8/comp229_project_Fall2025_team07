/*
 * File Name: contacts.js
 * Author(s): Adrian Myers, Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 */


const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const ContactSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true }
}, {
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

module.exports = mongoose.model("Contact", ContactSchema);
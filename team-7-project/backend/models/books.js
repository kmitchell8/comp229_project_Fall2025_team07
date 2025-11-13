/*
 * File Name: books.js
 * Author(s): Adrian Myers, Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const BookSchema = new mongoose.Schema({
    cover: {type: String, required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    publisher: { type: String, required: true },
    published: { type: Date},
    ISBN_10: {type: String},
    ISBN_13: {type: String}
},{
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

module.exports = mongoose.model("Book", BookSchema);
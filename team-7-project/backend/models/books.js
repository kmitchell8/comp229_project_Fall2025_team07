/*
 * File Name: books.js
 * Author(s): 
 * Student ID (s): 
 * Date: 
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const BookSchema = new mongoose.Schema({
    cover: {type: String, rquired: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    publisher: { type: String, required: true },
    published: { type: Date},
    ISBN_10: {type: Number},
    ISBN_13: {type: Number}
});

module.exports = mongoose.model("Users", BookSchema);
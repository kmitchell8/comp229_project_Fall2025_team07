/*
 * File Name: books.js
 * Author(s): 
 * Student ID (s): 
 * Date: 
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const BooksSchema = new mongoose.Schema({
    
});

module.exports = mongoose.model("Users", BooksSchema);
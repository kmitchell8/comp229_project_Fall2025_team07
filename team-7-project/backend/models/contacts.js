/*
 * File Name: contacts.js
 * Author(s): 
 * Student ID (s): 
 * Date: 
 */


const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const ContactSchema = new mongoose.Schema({
    
});

module.exports = mongoose.model("Contacts", ContactSchema);
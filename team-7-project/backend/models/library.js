/*
 * File Name: library.js
 * Author(s): Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: January, 08, 2026
 */


const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const librarySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    mainBranchId:{type: String},
    address: {
        street: { type: String },
        addressLineTwo: { type: String },
        city: { type: String },
        Country: { type: String },
        province: { type: String },
        postalCode: { type: String }
    }
}, {
    // MOVED to here (the options object)
    timestamps: { createdAt: 'created', updatedAt: 'updated' }

});

module.exports = mongoose.model("Library", librarySchema);
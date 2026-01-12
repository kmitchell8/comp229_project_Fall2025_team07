/*
 * File Name: branch.js
 * Author(s): Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: January, 08, 2026
 */


const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const branchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    libraryId: { type: String, required: true },
    mainBranch: { type: Boolean },
    address: {
        street: { type: String },
        addressLineTwo: { type: String },
        city: { type: String },
        Country: { type: String },
        province: { type: String },
        postalCode: { type: String }
    },
}, {
    
    timestamps: { createdAt: 'created', updatedAt: 'updated' }

});

// Ensure a library cannot have two branches with the same name
branchSchema.index({ libraryId: 1, name: 1 }, { unique: true });

/**
 * Middleware to handle mainBranch logic:
 * 1. Ensure only one main branch exists per library.
 * 2. Sync branch address to the parent Library document.
 */
branchSchema.pre('save', async function (next) {
    // Only run this logic if mainBranch is true
    if (this.mainBranch) {
        try {
            const Library = mongoose.model('Library');
            const Branch = mongoose.model('Branch');

            // Set all other branches for this library to NOT be the main branch
            await Branch.updateMany(
                { libraryId: this.libraryId, _id: { $ne: this._id } },
                { $set: { mainBranch: false } }
            );

            // Update the Library document with this branch's info and address
            await Library.findOneAndUpdate(
                { _id: this.libraryId }, // Assuming libraryId in Branch matches 'name' in Library
                {
                    $set: {
                        mainBranchId: this._id,
                        address: {
                            street: this.address.street,
                            addressLineTwo: this.address.addressLineTwo,
                            city: this.address.city,
                            Country: this.address.Country,
                            province: this.address.province,
                            postalCode: this.address.postalCode
                        }
                    }
                }
            );
        } catch (err) {
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model("Branch", branchSchema);
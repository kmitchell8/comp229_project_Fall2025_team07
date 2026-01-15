/*
 * File Name: userController.js
 * Author(s): Kevon Mitchell    
 * Student ID (s): 301508202
 * Date: November 11, 2025
 * Note: AI assisted Code (Gemini) and Original CRUD code from routes/userRoutes.js
 * and code from authController.js ("AUTHENTICATION (16) (2) (5).pptx")
 * (user controllers are needed to complete code in "AUTHENTICATION (16) (2) (5).pptx")
 */

const User = require('../models/user');
const _ = require('lodash'); // Used for cleaning up request bodies
const jwt = require('jsonwebtoken');
//Define config 
const config = {
    jwtSecret: process.env.JWT_SECRET
};
// Middleware to pre-load a user profile based on the 'userId' parameter in the route
const userByID = async (req, res, next, id) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }
        // Attach the found user object to the request, stripping the password hash for security.
        //password 
        const { password, ...safeUser } = user.toObject();
        req.profile = safeUser;
        next();
    } catch (err) {
        return res.status(400).json({
            error: "Could not retrieve user"
        });
    }
};

//SINGLE USER SECURE

// GET: Read the non-sensitive profile data of the user loaded by userByID
const read = (req, res) => {
    // req.profile already contains the non-sensitive user data loaded by router.param
    return res.json(req.profile);
};

// PUT: Update user data
const update = async (req, res, next) => {
    try {
        // Find the user by ID
        let user = await User.findById(req.profile._id);
        if (!user) return res.status(404).json({ error: "User not found during update." });
        const adminAuth = req.auth; // The person performing the update
        /**
         * SCOPE VALIDATION
         * Ensures Library/Branch admins don't "escape" their assigned territory.
         * Global Admins (role: 'admin') bypass these checks automatically.
         */
        if (adminAuth.role === 'libraryAdmin') {
            const requestedLibraryId = req.body.managementAccess?.libraryId;
            // Only validate if they are trying to set/change a libraryId
            if (requestedLibraryId && requestedLibraryId !== adminAuth.libraryId) {
                return res.status(403).json({ error: "You can only assign users to your own library." });
            }
        }
        if (adminAuth.role === 'branchAdmin') {
            const requestedBranchId = req.body.managementAccess?.branchId;
            if (requestedBranchId && requestedBranchId !== adminAuth.branchId) {
                return res.status(403).json({ error: "You can only assign users to your own branch." });
            }
        }
        /**
         * FIELD PROTECTION
         * Prevent users from updating their own roles or management status 
         * unless they are an authorized Admin.
         */
        const isSelfUpdate = adminAuth._id === user._id.toString();
        const isNotGlobalAdmin = adminAuth.role !== 'admin';
        if (isSelfUpdate && isNotGlobalAdmin) {
            // Remove sensitive fields from the body so they aren't merged by _.extend
            delete req.body.role;
            delete req.body.managementAccess;
        }
        // MERGE AND SAVE
        // use lodash's extend method to merge the changes
        user = _.extend(user, req.body);
        user.updatedAt = Date.now();
        await user.save();
        // GENERATE A NEW TOKEN
        // This ensures the frontend receives a token containing the NEW role and libraryId
        const token = jwt.sign(
            {
                _id: user._id,
                role: user.role,
                libraryId: user.managementAccess?.libraryId || null,
                branchId: user.managementAccess?.branchId || null
            },
            config.jwtSecret,
            { expiresIn: '24h' }
        );
        // Prepare the response profile (strip password hash)
        const { password, ...safeUser } = user.toObject();
        console.log(`[Update Success] User ${user.email} updated by ${adminAuth.role}`);
        res.json({
            token: token,
            user: safeUser
        });
    } catch (err) {
        return res.status(400).json({
            error: "Could not update user: " + err.message
        });
    }
};

// DELETE: Remove the user
const remove = async (req, res, next) => {
    try {
        const user = req.profile; // User object from req.profile
        //const deletedUser = await user.remove(); //depricated
        const deletedUser = await user.deleteOne();

        // Prepare response profile (strip password hash)
        const { password, ...safeUser } = deletedUser.toObject();
        res.json({ message: "User successfully deleted." });

    } catch (err) {
        return res.status(400).json({
            error: "Could not delete user: " + err.message
        });
    }
};


//GENERAL 

// POST: Create a new user (used for registration, but kept for generic CRUD)
//router.route('/register').post(authCtrl.register); will be used for registration
//register defined in authController.js
const create = async (req, res) => {
    try {
        const newUser = new User(req.body);
        const savedUser = await newUser.save();
        //should strip sensitive info before sending back.
        //restricted in userRoutes        
        res.status(201).json(savedUser);
    } catch (err) {
        // Handle validation errors or duplicate keys
        res.status(400).json({ error: err.message });
    }
};

// GET: List all users
const list = async (req, res) => {
    try {
        //this route should be restricted to 'admin' roles.
        //will be restricted in userRoutes
        const users = await User.find().select('name email role created'); // Select safe fields
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE: Delete all users
const removeAll = async (req, res) => {
    try {
        //should be restricted to 'admin' roles and avoided in production.
        //will be restricted
        const result = await User.deleteMany({});
        res.status(200).json({ message: `You deleted ${result.deletedCount} user(s)` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    userByID, // The crucial parameter middleware
    read,
    update,
    remove,
    create,
    list,
    removeAll
};
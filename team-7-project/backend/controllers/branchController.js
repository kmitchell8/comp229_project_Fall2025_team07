/*
 * File Name: branchController.js
 * Author(s): Kevon Mitchell    
 * Student ID (s): 301508202
 * Date: Jan 08, 2026
 */

const Branch = require('../models/branch');
const _ = require('lodash'); // Used for cleaning up request bodies

// Middleware to pre-load a branch profile based on the 'branchId' parameter in the route
const branchByID = async (req, res, next, id) => {
    try {
        const branch = await Branch.findById(id);
        if (!branch) {
            return res.status(404).json({
                error: "Branch not found"
            });
        }
        //req.loadedBranch=branch; //stored mongoose document for update/remove operations
        req.branch = branch;
        next();
    } catch (err) {
        return res.status(400).json({
            error: "Could not retrieve branch"
        });
    }
};

//SINGLE BRANCH 

// GET: Reads all the branch info
const read = (req, res) => {
    // req.branch contains the branch data loaded by router.param
    return res.json(req.branch.toObject());
};

// PUT: Update branch data
const update = async (req, res, next) => {
    try {

        //Use the Mongoose Document pre-loaded by branchByID (req.loadedBranch)
        //let branch = req.loadedBranch;        
        // Find the branch by ID
        //let branch = await Branch.findById(req.branch._id);

        let branch = req.branch;
        if (!branch) return res.status(404).json({ error: "Branch not found during update." });

        // Update the branch object with new data from the request body
        //use loadsh's extend method to merge the changes
        branch = _.extend(branch, req.body);
        branch.updatedAt = Date.now();
        await branch.save();

        res.json(branch.toObject());

    } catch (err) {
        // Handle validation or save errors
        return res.status(400).json({
            error: "Could not update branch: " + err.message
        });
    }
};

// DELETE: Remove the branch
const remove = async (req, res, next) => {
    try {
        const branch = req.branch; // Branch object from req.branch
        //await branch.remove();//depricated
        await branch.deleteOne();


        res.json({ message: "Branch successfully deleted." });

    } catch (err) {
        return res.status(400).json({
            error: "Could not delete branch: " + err.message
        });
    }
};


//GENERAL 


const create = async (req, res) => {
    try {
        const branchData = req.body;
        // Automatically inject the library ID from the parent route
        if (req.library) {
            branchData.libraryId = req.library._id;
        }
        const newBranch = new Branch(branchData);
        const savedBranch = await newBranch.save();
        //should strip sensitive info before sending back.
        //restricted in branchRoutes        
        res.status(201).json(savedBranch);
    } catch (err) {
        // Handle validation errors or duplicate keys
        res.status(400).json({ error: err.message });
    }
};

// GET: List all branches
const list = async (req, res) => {
    try {
        // If a library is pre-loaded by libraryId param, filter by it
        const query = req.library ? { libraryId: req.library._id } : {};
        const branches = await Branch.find(query).select('name'); //selects fields I would like to display
        res.status(200).json(branches);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE: Delete all branches
const removeAll = async (req, res) => {
    try {
        //should be restricted to 'admin' roles and avoided in production.
        //will be restricted in branchRoutes
        const result = await Branch.deleteMany({});
        res.status(200).json({ message: `You deleted ${result.deletedCount} branch(es)` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    branchByID, // The crucial parameter middleware
    read,
    update,
    remove,
    create,
    list,
    removeAll
};
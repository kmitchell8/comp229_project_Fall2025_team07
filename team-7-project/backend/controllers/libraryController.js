/*
 * File Name: libraryController.js
 * Author(s): Kevon Mitchell    
 * Student ID (s): 301508202
 * Date: Jan 08, 2026
 */

const Library = require('../models/library');
const _ = require('lodash'); // Used for cleaning up request bodies

// Middleware to pre-load a library profile based on the 'libraryId' parameter in the route
const libraryByID = async (req, res, next, id) => {
    try {
        const library = await Library.findById(id);
        if (!library) {
            return res.status(404).json({
                error: "Library not found"
            });
        }
        //req.loadedLibrary=library; //stored mongoose document for update/remove operations
        req.library = library;
        next();
    } catch (err) {
        return res.status(400).json({
            error: "Could not retrieve library"
        });
    }
};

//SINGLE LIBRARY 

// GET: Reads all the library info
const read = (req, res) => {
    // req.library contains the library data loaded by router.param
    return res.json(req.library.toObject());
};

// PUT: Update library data
const update = async (req, res, _next) => {
    try {

        //Use the Mongoose Document pre-loaded by libraryByID (req.loadedLibrary)
        //let library = req.loadedLibrary;        
        // Find the library by ID
        //let library = await Library.findById(req.library._id);
        
        let library = req.library;
        if (!library) return res.status(404).json({ error: "Library not found during update." });

        // Update the library object with new data from the request body
        //use loadsh's extend method to merge the changes
        library = _.extend(library, req.body);
        library.updatedAt = Date.now();
        await library.save();

        res.json(library.toObject());

    } catch (err) {
        // Handle validation or save errors
        return res.status(400).json({
            error: "Could not update library: " + err.message
        });
    }
};

// DELETE: Remove the library
const remove = async (req, res, _next) => {
    try {
        const library = req.library; // Library object from req.library
        //await library.remove();//depricated
        await library.deleteOne();


        res.json({ message: "Library successfully deleted."});

    } catch (err) {
        return res.status(400).json({
            error: "Could not delete library: " + err.message
        });
    }
};


//GENERAL 


const create = async (req, res) => {
    try {
        const newLibrary = new Library(req.body);
        const savedLibrary = await newLibrary.save();
        //should strip sensitive info before sending back.
        //restricted in libraryRoutes        
        res.status(201).json(savedLibrary);
    } catch (err) {
        // Handle validation errors or duplicate keys
        res.status(400).json({ error: err.message });
    }
};

// GET: List all libraries
const list = async (_req, res) => {
    try {
        const libraries = await Library.find().select('name'); //selects fields I would like to display
        res.status(200).json(libraries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE: Delete all libraries
const removeAll = async (req, res) => {
    try {
        //should be restricted to 'admin' roles and avoided in production.
        //will be restricted in libraryRoutes
        const result = await Library.deleteMany({});
        res.status(200).json({ message: `You deleted ${result.deletedCount} library/libraries` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    libraryByID, // The crucial parameter middleware
    read,
    update,
    remove,
    create,
    list,
    removeAll
};
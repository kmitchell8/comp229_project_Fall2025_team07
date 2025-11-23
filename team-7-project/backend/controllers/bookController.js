/*
 * File Name: bookController.js
 * Author(s): Kevon Mitchell    
 * Student ID (s): 301508202
 * Date: November 11, 2025
 * Note: using code from bookController.js
 */

const Book = require('../models/books');
const _ = require('lodash'); // Used for cleaning up request bodies

// Middleware to pre-load a book profile based on the 'bookId' parameter in the route
const bookByID = async (req, res, next, id) => {
    try {
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({
                error: "Book not found"
            });
        }
        //req.loadedBook=book; //stored mongoose document for update/remove operations
        req.book = book;
        next();
    } catch (err) {
        return res.status(400).json({
            error: "Could not retrieve book"
        });
    }
};

//SINGLE BOOK 

// GET: Reads all the book info
const read = (req, res) => {
    // req.book contains the book data loaded by router.param
    return res.json(req.book.toObject());
};

// PUT: Update book data
const update = async (req, res, next) => {
    try {

        //Use the Mongoose Document pre-loaded by bookByID (req.loadedBook)
        //let book = req.loadedBook;        
        // Find the book by ID
        //let book = await Book.findById(req.book._id);

        let book = req.book;
        if (!book) return res.status(404).json({ error: "Book not found during update." });

        // Update the book object with new data from the request body
        // We use lodash's extend method to merge the changes
        book = _.extend(book, req.body);
        book.updatedAt = Date.now();
        await book.save();

        res.json(book.toObject());

    } catch (err) {
        // Handle validation or save errors
        return res.status(400).json({
            error: "Could not update book: " + err.message
        });
    }
};

// DELETE: Remove the book
const remove = async (req, res, next) => {
    try {
        const book = req.book; // Book object from req.book
        await book.remove();


        res.json({ message: "Book successfully deleted."});

    } catch (err) {
        return res.status(400).json({
            error: "Could not delete book: " + err.message
        });
    }
};


//GENERAL 

// POST: Create a new book (Often used for registration, but kept for generic CRUD)
//router.route('/register').post(authCtrl.register); will be used for registration
//register defined in authController.js
const create = async (req, res) => {
    try {
        const newBook = new Book(req.body);
        const savedBook = await newBook.save();
        // NOTE: In a real app, you should strip sensitive info before sending back.
        //restricted in bookRoutes        
        res.status(201).json(savedBook);
    } catch (err) {
        // Handle validation errors or duplicate keys
        res.status(400).json({ error: err.message });
    }
};

// GET: List all books
const list = async (req, res) => {
    try {
        const books = await Book.find().select('cover title author publisher description rated genre'); //selects fields I would like to display
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE: Delete all books
const removeAll = async (req, res) => {
    try {
        // NOTE: This should be restricted to 'admin' roles and avoided in production.
        //will be restricted in bookRoutes
        const result = await Book.deleteMany({});
        res.status(200).json({ message: `You deleted ${result.deletedCount} book(s)` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    bookByID, // The crucial parameter middleware
    read,
    update,
    remove,
    create,
    list,
    removeAll
};
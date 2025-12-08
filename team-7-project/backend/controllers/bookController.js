/*
 * File Name: bookController.js
 * Author(s): Kevon Mitchell    
 * Student ID (s): 301508202
 * Date: November 11, 2025
 * Note: using code from bookController.js
 */

const Book = require('../models/books');
const _ = require('lodash'); // Used for cleaning up request bodies
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

//permanent storage path 
const COVERS_DIR = path.join(__dirname, '..', 'public', 'images', 'cover'); //book cover storage
const DESCRIPTIONS_DIR = path.join(__dirname, '..', 'public', 'documents', 'description'); //book documents storage

if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
}

if (!fs.existsSync(DESCRIPTIONS_DIR)) {
    fs.mkdirSync(DESCRIPTIONS_DIR, { recursive: true });

}
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
        //await book.remove(); //depricated
        await book.deleteOne();


        res.json({ message: "Book successfully deleted." });

    } catch (err) {
        return res.status(400).json({
            error: "Could not delete book: " + err.message
        });
    }
};


//GENERAL 


const create = async (req, res) => {
    try {
        const newBook = new Book(req.body);
        const savedBook = await newBook.save();
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
        const books = await Book.find().select('cover title author publisher ISBN_10 ISBN_13 description rated genre'); //selects fields I would like to display
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE: Delete all books
const removeAll = async (req, res) => {
    try {
        //should be restricted to 'admin' roles and avoided in production.
        //will be restricted in bookRoutes
        const result = await Book.deleteMany({});
        res.status(200).json({ message: `You deleted ${result.deletedCount} book(s)` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const uploadCover = async (req, res) => {
    try {
        const bookCover = req.file;
        if (!bookCover) {
            return res.status(400).json({ error: "No file provided." });
        }

        const fileExtension = bookCover.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const savePath = path.join(COVERS_DIR, fileName);
        fs.writeFileSync(savePath, bookCover.buffer);//save to disk
        return res.status(200).json({ coverFileName: fileName });//sends filename back to front end

    } catch (error) {
        console.error("Cover upload error:", error);
        res.status(500).json({ error: "Failed to upload cover." });
    }
}

const uploadDescription = async (req, res) => {
    try {
        const { descriptionContent, coverBaseName } = req.body;

        if (!coverBaseName) {
            return res.status(400).json({ error: "Missing UUID." });
        }
        //keep path integrety
        if (coverBaseName.includes('/') || coverBaseName.includes('\\')) {
            return res.status(400).json({ error: "Invalid filename provided." });
        }

        const descriptionFileName = `${coverBaseName}.txt`;
        const savePath = path.join(DESCRIPTIONS_DIR, descriptionFileName);
        fs.writeFileSync(savePath, descriptionContent, 'utf8');
        return res.status(200).json({ descriptionFileName: descriptionFileName });//sends filename back to front end

    } catch (error) {
        console.error("Description upload error:", error);
        res.status(500).json({ error: "Failed to create description file." });
    }
};

const deleteCover = async (req, res) => {
    const filename = req.body.cover;//UUID.ext
    //const { filename } = req.body; //Assuming { filename: 'uuid.ext' }

    if (!filename) {
        return res.status(400).json({ error: "Filename is required for deletion." });
    }

    const lastDotIndex = filename.lastIndexOf('.');
    const baseName = lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);

    const coverPath = path.join(COVERS_DIR, filename);
    const descriptionFileName = `${baseName}.txt`; // The associated description file
    const descriptionPath = path.join(DESCRIPTIONS_DIR, descriptionFileName);
    let deletedCover = false;
    let deletedDescription = false;
    try {
        // Check and delete the Cover Image
        if (fs.existsSync(coverPath)) {
            fs.unlinkSync(coverPath);
            deletedCover = true;
        }

        // Check and delete the Description Text File
        if (fs.existsSync(descriptionPath)) {
            fs.unlinkSync(descriptionPath);
            deletedDescription = true;
        }
        if (deletedCover || deletedDescription) {
            return res.json({
                message: `Cover Deleted: ${deletedCover ? 'Yes' : 'No'}, Description Deleted: ${deletedDescription ? 'Yes' : 'No'}`
            });
        } else {
            //if neither file was found
            return res.status(204).send();
        }

    } catch (err) {
        console.error(`Error deleting files with filename: ${filename}:`, err);
        return res.status(500).json({ error: "Failed to delete files." });
    }
};

module.exports = {
    bookByID, // The crucial parameter middleware
    read,
    update,
    remove,
    create,
    list,
    removeAll,
    uploadCover,
    uploadDescription,
    deleteCover
};
/*
 * File Name: books.js
 * Author(s): Adrian Myers, Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)
//import mongoose from 'mongoose';
const fs = require('fs');
const path = require('path');
const filePath = path.resolve(process.cwd(), 'public', 'documents', 'genres.json');
const genres = JSON.parse(fs.readFileSync(filePath), 'utf8');

const BookSchema = new mongoose.Schema({
    cover: {
        type: String, required: true, unique: true,
        validate: {
            validator: function (v) {
                return /\.(jpg|jpeg|png|gif|webp)$/i.test(v);//ensures the cover strng provides a valid file extension (not case sensitive)
            },
        },
        // default: function(){return `/images/covers/${this.cover}.jpg`; }//put this (similar) url string in 
        //retrieval code on front end
        //see notes for full string details
    },
    title: {
        type: String, required: true,
        //not needed if isbns are uniqe 
        //unique: true, 
        validate: {//needed if both ISBNs are missing
            validator: async function (titleValue) {
                //skip validation for new titles and unchanged titles (saves time)
                if (!this.isModified('title') && !this.isNew) {
                    return true;
                }
                const Book = this.constructor;

                // CASE A: If this entry HAS an ISBN
                // Database Index handle uniqueness for ISBNs.
                // only need to check if another entry has this SAME title AND SAME ISBN.
                if (this.ISBN_10 || this.ISBN_13) {
                    const query = {
                        title: titleValue,
                        _id: { $ne: this._id } // exclude self
                    };
                    if (this.ISBN_10) query.ISBN_10 = this.ISBN_10;
                    if (this.ISBN_13) query.ISBN_13 = this.ISBN_13;

                    const duplicate = await Book.findOne(query);
                    return !duplicate;
                }

                // CASE B: Entry HAS NO ISBN (Generic Media)
                // ensure no other entry has this title AND also has NO ISBN.
                const duplicateNoIsbn = await Book.findOne({
                    title: titleValue,
                    mediaType: this.mediaType,
                    ISBN_10: { $exists: false },
                    ISBN_13: { $exists: false },
                    _id: { $ne: this._id }
                });

                return !duplicateNoIsbn;
            },
            message: 'A work with this title already exists in the library.'
        }
    },
    author: { type: String, required: true },
    publisher: { type: String, required: true },
    description: {
        type: String, required: true,
        default: function () { //sets the description string based on cover string and removes extension
            const coverString = this.cover;
            const editPath = coverString.lastIndexOf('.');
            const descString = editPath === -1
                ? coverString //ternary If statement // if there's no extention the description text file will be the same as the cover value
                : coverString.substring(0, editPath); // if there is an extension it will be removed 

            return `/documents/description/${descString}.txt`;//default value 
        }
    },
    mediaType: {
        type: String,
        required: true,
        enum: ['book', 'movie', 'periodical', 'other'],
        default: 'book'
    },
    genre: {
        type: String,
        enum: genres, // Dynamically validates against the JSON file
        default: "Other"
    },
    ratings: { type: Number, default: 0 }, //useRef
    rated: { type: Number, default: 0 }, //useRef
    ISBN_10: {
        type: String,
        default: undefined, // Ensure it doesn't default to ""
        set: v => v === '' ? undefined : v // If empty string is sent, convert to undefined
    },
    ISBN_13: {
        type: String,
        default: undefined,
        set: v => v === '' ? undefined : v
    }
}, {
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});
BookSchema.index({ ISBN_10: 1 }, { unique: true, sparse: true }); //needed for other documents where ISBN does not exist or is optional
BookSchema.index({ ISBN_13: 1 }, { unique: true, sparse: true });

//const Book = mongoose.model('Book', BookSchema);
//Book.genresList = GENRES;

//export {GENRES};
//export default mongoose.model('Book', BookSchema);
module.exports = mongoose.model("Book", BookSchema);
//module.exports = Book;


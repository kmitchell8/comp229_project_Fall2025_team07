/*
 * File Name: books.js
 * Author(s): Adrian Myers, Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

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
                //skip validation for new titles and titles already saved (saves time)
                if (!this.isModified('title') && !this.isNew) {
                    return true;
                }
                const query = { title: titleValue };
                //use query to check for unique ISBNs 
                query.ISBN_10 = this.ISBN_10;
                query.ISBN_13 = this.ISBN_13;
                //exclude current document
                if (this._id) {
                    query._id = { $ne: this._id };
                }
                const existingBook = await this.constructor.findOne(query);
                // If existingBook is found, validation fails.
                return !existingBook;
            }
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
    genre: { type: String, required: true },
    ratings: { type: Number, default: 0 }, //useRef
    rated: { type: Number, default: 0 }, //useRef
    published: { type: Date },
    ISBN_10: { type: String},
    ISBN_13: { type: String}
}, {
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

module.exports = mongoose.model("Book", BookSchema);
BookSchema.index({ ISBN_10: 1 }, { unique: true, sparse: true }); //needed for other documents where ISBN does not exist or is optional
BookSchema.index({ ISBN_13: 1 }, { unique: true, sparse: true });
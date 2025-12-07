/*
 * File Name: books.js
 * Author(s): Adrian Myers, Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 */

const mongoose = require('mongoose'); // needed to connect to MongoDB (type: commonjs)

const BookSchema = new mongoose.Schema({
    cover: {type: String, required: true, unique: true, 
        validate: {//
            validator: function (v){
                return /\.(jpg|jpeg|png|gif|webp)$/i.test(v);//ensures the cover strng provides a valid file extension (not case sensitive)
            },
        },
       // default: function(){return `/public/images/covers/${this.cover}.jpg`; }//put this (similar) url string in 
                                                                                //retrieval code on front end
                                                                                //see notes for full string details
       },
    title: { type: String, required: true },
    author: { type: String, required: true },
    publisher: { type: String, required: true },
    description:{type: String, required: true,
        default: function(){ //sets the description string based on cover string and removes extension
            const coverString = this.cover;
            const editPath = coverString.lastIndexOf('.');
            const descString = editPath === -1
            ?coverString //ternary If statement // if there's no extention the description text file will be the same as the cover value
            :coverString.substring(0, editPath); // if there is an extension it will be removed 

            return `/documents/description/${descString}.txt`;//default value 
        }
    },
    genre: {type: String, required: true},
    ratings: {type: Number, default: 0}, //useRef
    rated: {type: Number, default: 0}, //useRef
    published: { type: Date},
    ISBN_10: {type: String},
    ISBN_13: {type: String}
},{
    // Auto inputs the date in the correct format
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

module.exports = mongoose.model("Book", BookSchema);
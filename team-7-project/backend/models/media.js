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

// OPTIONS: 'discriminatorKey'  
// tells Mongoose which "type" of media a document is.
const baseOptions = {
    discriminatorKey: 'mediaType', 
    collection: 'media',
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
};

const saveMediaTypesJson = () => {
    try {
        const discriminators = Media.discriminators || {};
        const config = {};

        Object.keys(discriminators).forEach(key => {
            const schema = discriminators[key].schema;
            const fields = [];

            // Fields unique to this discriminator
            Object.keys(schema.paths).forEach(path => {
                const internalFields = ['_id', '__v', 'title', 'cover', 'description', 'genre', 'ratings', 'rated', 'relatedEntries', 'mediaType', 'created', 'updated'];
                
                if (!internalFields.includes(path)) {
                    const pathOptions = schema.paths[path].options;
                    const instance = schema.paths[path].instance;
                    
                    // Determine the UI type based on Mongoose Instance
                    let uiType = 'text'; 
                    if (instance === 'Number') {
                        uiType = 'number';
                    } else if (instance === 'Array') {
                        uiType = 'list'; // This triggers your comma-separated logic in React
                    } else if (instance === 'Boolean') {
                        uiType = 'checkbox';
                    }

                    fields.push({
                        name: path,
                        label: path.charAt(0).toUpperCase() + path.slice(1).replace(/_/g, ' '),
                        type: uiType,
                        required: !!pathOptions.required
                    });
                }
            });

            config[key] = fields;
        });

        const dirPath = path.resolve(process.cwd(), 'public', 'documents');
        const typesFilePath = path.join(dirPath, 'mediaTypes.json');

        if (!fs.existsSync(dirPath)){
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(typesFilePath, JSON.stringify(config, null, 2), 'utf8');
        
        console.log('✅ mediaTypes.json updated with field definitions (including lists and booleans).');
    } catch (err) {
        console.error('❌ Error updating mediaTypes.json:', err);
    }
};

const MediaSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        // We keep your sophisticated duplicate title/ISBN check logic here
        validate: {
            validator: async function (titleValue) {
                if (!this.isModified('title') && !this.isNew) return true;
                const Media = this.constructor;
                
                // Case A: Has ISBN (primarily for Books)
                if (this.ISBN_10 || this.ISBN_13) {
                    const query = { title: titleValue, _id: { $ne: this._id } };
                    if (this.ISBN_10) query.ISBN_10 = this.ISBN_10;
                    if (this.ISBN_13) query.ISBN_13 = this.ISBN_13;
                    const duplicate = await Media.findOne(query);
                    return !duplicate;
                }
                
                // Case B: No ISBN (Movies, Games, etc)
                const duplicateNoIsbn = await Media.findOne({
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
    cover: {
        type: String, required: true, unique: true,
        validate: {
            validator: (v) => /\.(jpg|jpeg|png|gif|webp)$/i.test(v)
        }
    },
    description: {
        type: String, required: true,
        default: function () {
            const editPath = this.cover.lastIndexOf('.');
            const descString = editPath === -1 ? this.cover : this.cover.substring(0, editPath);
            return `/documents/description/${descString}.txt`;
        }
    },
    genre: { type: String, enum: genres, default: "Other" },
    ratings: { type: Number, default: 0 },
    rated: { type: Number, default: 0 },
    relatedEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }]
}, baseOptions);

// Keep your existing ISBN indexes (sparse means they only apply if the field exists)
MediaSchema.index({ ISBN_10: 1 }, { unique: true, sparse: true });//needed for other documents where ISBN does not exist or is optional
MediaSchema.index({ ISBN_13: 1 }, { unique: true, sparse: true });

const Media = mongoose.model('Media', MediaSchema);

// This adds Book-specific fields to the Media model
const Book = Media.discriminator('book', new mongoose.Schema({
    author: { type: String, required: true },
    publisher: { type: String, required: true },
    ISBN_10: {
        type: String,
        default: undefined,
        set: v => v === '' ? undefined : v
    },
    ISBN_13: {
        type: String,
        default: undefined,
        set: v => v === '' ? undefined : v
    }
}));

// Example: Movie Model
const Movie = Media.discriminator('movie', new mongoose.Schema({
    director: { type: String, required: true },
    runtime: Number,
    studio: String
}));

// Example: Game Model
const Game = Media.discriminator('game', new mongoose.Schema({
    developer: String,
    platforms: [String],
    multiplayer: Boolean
}));

// create JsonFile
saveMediaTypesJson();
module.exports = {Media, Book, Movie, Game};


//BookSchema.index({ ISBN_10: 1 }, { unique: true, sparse: true }); //needed for other documents where ISBN does not exist or is optional
//BookSchema.index({ ISBN_13: 1 }, { unique: true, sparse: true });

//const Book = mongoose.model('Book', BookSchema);
//Book.genresList = GENRES;

//export {GENRES};
//export default mongoose.model('Book', BookSchema);
//module.exports = mongoose.model("Book", BookSchema);
//module.exports = Book;


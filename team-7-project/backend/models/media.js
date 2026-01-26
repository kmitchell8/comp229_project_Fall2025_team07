/*
 * File Name: books.js
 * Author(s): Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: November 10, 2025
 */

//FRONTED: Profile.jsx, userProvider.jsx, Contact.jsx

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
                        uiType = 'list'; // This triggers comma-separated logic in React
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

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(typesFilePath, JSON.stringify(config, null, 2), 'utf8');

        console.log('✅ mediaTypes.json updated with field definitions (including lists and booleans).');
    } catch (err) {
        console.error('❌ Error updating mediaTypes.json:', err);
    }
};

const MediaSchema = new mongoose.Schema({
    libraryId: { type: String, default: null },
    branchId: { type: String, default: null },
    title: {
        type: String,
        required: true,
        // sophisticated duplicate title/ISBN check logic here
        validate: {
            validator: async function (titleValue) {
                if (!this.isModified('title') && !this.isNew) return true;
                const Media = this.constructor;

                // SCOPED QUERY: Only look for duplicates within the same "context"
                // If libraryId is null, we check for other nulls (Master level).
                // If libraryId exists, we check only within that specific branch.
                const query = {
                    title: titleValue,
                    libraryId: this.libraryId,
                    branchId: this.branchId,
                    _id: { $ne: this._id }
                };

                // Case A: Has ISBN (primarily for Books)
                if (this.ISBN_10 || this.ISBN_13) {
                    if (this.ISBN_10) query.ISBN_10 = this.ISBN_10;
                    if (this.ISBN_13) query.ISBN_13 = this.ISBN_13;
                    const duplicate = await Media.findOne(query);
                    return !duplicate;
                }

                // Case B: No ISBN (Movies, Games, etc)
                const duplicateNoIsbn = await Media.findOne({
                    ...query,
                    mediaType: this.mediaType,
                    ISBN_10: { $exists: false },
                    ISBN_13: { $exists: false }
                });
                return !duplicateNoIsbn;
            },
            message: 'A work with this title already exists in this specific library/branch context.'
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
            const fileName = `${descString}.txt`;
            // Tier 1: Global Master (No IDs)
            if (!this.libraryId || this.libraryId === 'null') {
                return `/documents/description/${fileName}`;
            }
            // Tier 2 & 3: Tenant/Branch (The missing logic)
            // This ensures the DB path matches the getStoragePath folder structure
            return `/documents/description/${this.libraryId}/${this.branchId}/${fileName}`;
        }
    },
    genre: { type: String, enum: genres, default: "Other" },
    ratings: { type: Number, default: 0 },
    rated: { type: Number, default: 0 },
    relatedEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }]
}, baseOptions);

//IDEXES

//ISBN
// existing ISBN indexes (sparse means they only apply if the field exists)
// GLOBAL MASTER ISBN INDEX
// Ensures only ONE "Master" record exists for a specific ISBN in the whole system.
MediaSchema.index(
    { ISBN_10: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { libraryId: { $type: "null" } }
    }
);//needed for other documents where ISBN does not exist or is optional
MediaSchema.index(
    { ISBN_13: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { libraryId: { $type: "null" } }
    }
);
// BRANCH LEVEL ISBN INDEX
// Allows different libraries to have the same ISBN, 
// but prevents a single branch from having the same ISBN twice.
MediaSchema.index(
    { libraryId: 1, branchId: 1, ISBN_10: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { libraryId: { $exists: true, $ne: null } }
    }
);

MediaSchema.index(
    { libraryId: 1, branchId: 1, ISBN_13: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { libraryId: { $exists: true, $ne: null } }
    }
);

//LIBRARIES

// The "Global" Index
// This ensures that if libraryId is null, only ONE document can exist for that mediaId.
// We use a partial filter to only apply this to the "Master" records.
MediaSchema.index(
    { title: 1, mediaType: 1 },
    {
        unique: true,
        partialFilterExpression: { libraryId: { $type: "null" } }
    }
);

// The "Branch" Index
// This ensures that a specific branch cannot have duplicate mediaIds.
// We only apply this where a libraryId actually exists.
MediaSchema.index(
    { libraryId: 1, branchId: 1, title: 1, mediaType: 1 },
    {
        unique: true,
        partialFilterExpression: { libraryId: { $exists: true, $ne: null } }
    }
);

const Media = mongoose.model('Media', MediaSchema);

//DISCRIMINATORS

// This adds Book-specific fields to the Media model
const Book = Media.discriminator('book', new mongoose.Schema({
    creator: {
        author: { type: String, required: true }
    },
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

// Movie Model
const Movie = Media.discriminator('movie', new mongoose.Schema({
    creator: {
        director: { type: String, required: true }
    },
    runtime: Number,
    studio: String
}));

// Game Model
const Game = Media.discriminator('game', new mongoose.Schema({
    creator: {
        developer: String,
    },
    platforms: [String],
    multiplayer: Boolean
}));

// create JsonFile
saveMediaTypesJson();
module.exports = { Media, Book, Movie, Game };


//BookSchema.index({ ISBN_10: 1 }, { unique: true, sparse: true }); //needed for other documents where ISBN does not exist or is optional
//BookSchema.index({ ISBN_13: 1 }, { unique: true, sparse: true });

//const Book = mongoose.model('Book', BookSchema);
//Book.genresList = GENRES;

//export {GENRES};
//export default mongoose.model('Book', BookSchema);
//module.exports = mongoose.model("Book", BookSchema);
//module.exports = Book;


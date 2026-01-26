/*
 * File Name: mediaController.js
 * Author(s): Kevon Mitchell    
 * Student ID (s): 301508202
 * Date: November 11, 2025
 * Note: using code from mediaController.js //updated to be universal 
 */

const { Media, Book, Movie, Game } = require('../models/media');
const _ = require('lodash'); // Used for cleaning up request bodies
const fs = require('fs');
const path = require('path');
//const { GENRES } = require('../models/medias');
const { v4: uuidv4 } = require('uuid');


//permanent storage path 
/*const COVERS_DIR = path.join(__dirname, '..', 'public', 'images', 'cover'); //media cover storage
const DESCRIPTIONS_DIR = path.join(__dirname, '..', 'public', 'documents', 'description'); //media documents storage

if (!fs.existsSync(COVERS_DIR)) {
    fs.mkdirSync(COVERS_DIR, { recursive: true });
}

if (!fs.existsSync(DESCRIPTIONS_DIR)) {
    fs.mkdirSync(DESCRIPTIONS_DIR, { recursive: true });

}*/

// Replacement for static COVERS_DIR/DESCRIPTIONS_DIR
/**
 * Helper: Generates paths.
 * Global: public/images/cover/file.jpg
 * Tenant: public/images/cover/libId/brId/file.jpg
 */
/**
 * Helper: Generates paths.
 * Global: public/images/cover/file.jpg
 * Tenant: public/images/cover/libId/brId/file.jpg
 */
const getStoragePath = (libId, brId, subFolder) => {
    const typeFolder = subFolder === 'cover'
        ? path.join('images', 'cover')
        : path.join('documents', 'description');

    let baseDir;
    // FIX: Added 'null' string check to handle frontend edge cases
    if (!libId || libId === 'null') {
        // Master Level
        baseDir = path.resolve(process.cwd(), 'public', typeFolder);
    } else {
        // Tenant/Branch Level
        baseDir = path.resolve(process.cwd(), 'public', typeFolder, libId, brId);
    }

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    return baseDir;
};
// Middleware to pre-load a media profile based on the 'mediaId' parameter in the route
const mediaByID = async (req, res, next, id) => {
    try {
        const media = await Media.findById(id);
        if (!media) {
            return res.status(404).json({
                error: "Media not found"
            });
        }
        //req.loadedMedia=media; //stored mongoose document for update/remove operations
        req.media = media;
        next();
    } catch (err) {
        return res.status(400).json({
            error: "Could not retrieve media"
        });
    }
};

//SINGLE MEDIA 

// GET: Reads all the media info
const read = async (req, res) => {
    try {
        const mediaObj = req.media.toObject();

        // If the media has a description path, read the actual text file
        if (mediaObj.description) {
            // Convert the URL path back to a physical file system path
            const fullPath = path.resolve(process.cwd(), 'public', mediaObj.description.startsWith('/') ? mediaObj.description.substring(1) : mediaObj.description);

            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                mediaObj.descriptionContent = content; // Send the actual text to the frontend
            }
        }

        return res.json(mediaObj);
    } catch (err) {
        return res.status(500).json({ error: "Error reading media description file." });
    }
};

// PUT: Update media data
const update = async (req, res, _next) => {
    try {

        //Use the Mongoose Document pre-loaded by mediaByID (req.loadedMedia)
        //let media = req.loadedMedia;        
        // Find the media by ID
        //let media = await Media.findById(req.media._id);

        let media = req.media;
        if (!media) return res.status(404).json({ error: "Media not found during update." });

        // Update the media object with new data from the request body
        // We use lodash's extend method to merge the changes
        media = _.extend(media, req.body);
        //media.updatedAt = Date.now(); //handled in Schema
        await media.save();

        res.json(media/*.toObject()*/);

    } catch (err) {
        // Handle validation or save errors
        return res.status(400).json({
            error: "Could not update media: " + err.message
        });
    }
};

// DELETE: Remove the media
const remove = async (req, res, _next) => {
    try {
        const media = req.media; // Media object from req.media
        //await media.remove(); //depricated
        await media.deleteOne();
        res.json({ message: "Media successfully deleted." });
    } catch (err) {
        return res.status(400).json({
            error: "Could not delete media: " + err.message
        });
    }
};


//GENERAL 
//POST: create media
//NEED: switch (mediaType) needs to be dynamic and not a hardcoded case
//NEED: more accurate way to determine duplicates if not hanled by schema already
const create = async (req, res) => {
    try {

        const { mediaType, libraryId, branchId, mainBranchId, title } = req.body;
        let Model;

        // Ensure mediaType is set if the frontend hasn't updated yet
        // Determine which discriminator to use
        switch (mediaType) {
            case 'movie': Model = Movie; break;
            case 'game': Model = Game; break;
            default: Model = Book; break;
        }
        // SEQUENCE A: GLOBAL MASTER (Universal Level - libraryId: null, branchId: null)
        let globalMaster = await Media.findOne({ title, mediaType, libraryId: null });
        if (!globalMaster) {
            const globalData = { ...req.body, libraryId: null, branchId: null };
            globalMaster = new Model(globalData);
            await globalMaster.save();
        }

        // SEQUENCE B: LIBRARY MASTER (Tenant Level - uses Main BranchId per requirement)
        if (libraryId && mainBranchId && branchId !== mainBranchId) {
            let libraryMaster = await Media.findOne({ title, mediaType, libraryId, branchId: mainBranchId });
            if (!libraryMaster) {
                const libMasterData = { ...req.body, libraryId, branchId: mainBranchId };
                libraryMaster = new Model(libMasterData);
                await libraryMaster.save();
            }
        }

        // SEQUENCE C: CURRENT BRANCH RECORD
        const newMedia = new Model(req.body);
        const savedMedia = await newMedia.save();
        //restricted in mediaRoutes  
        res.status(201).json(savedMedia);
    } catch (err) {
        // Handle validation errors or duplicate keys
        res.status(400).json({ error: err.message });
    }

};

// GET: List all medias
const list = async (req, res) => {
    try {
        const { type, libraryId, branchId } = req.query; // e.g., /api/media?type=movie
       // const query = type ? { mediaType: type } : {};
        let query = {};
        if (type) query.mediaType = type;
        if (libraryId) query.libraryId = libraryId;
        if (branchId && branchId !== 'all') query.branchId = branchId;
        const medias = await Media.find(query)
            .sort({ created: -1 });
        //selects fields I would like to display (older code - left as reminder)
        res.status(200).json(medias);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE: Delete all medias
const removeAll = async (req, res) => {
    try {
        //should be restricted to 'admin' roles and avoided in production.
        //will be restricted in mediaRoutes
        const { type } = req.query;
        const query = type ? { mediaType: type } : {};
        const result = await Media.deleteMany(query);
        res.status(200).json({ message: `You deleted ${result.deletedCount} items(s)` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const uploadCover = async (req, res) => {
    try {
        const { libraryId, branchId, mainBranchId } = req.body;
        const mediaCover = req.file;
        if (!mediaCover) {
            return res.status(400).json({ error: "No file provided." });
        }

        const fileExtension = mediaCover.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const paths = [
            // 1. Global Master (Root)
            path.join(getStoragePath(null, null, 'cover'), fileName),
            // 2. Library Master (Subfolder)
            libraryId ? path.join(getStoragePath(libraryId, mainBranchId, 'cover'), fileName) : null,
            // 3. Branch Instance (Subfolder)
            (libraryId && branchId !== mainBranchId) ? path.join(getStoragePath(libraryId, branchId, 'cover'), fileName) : null
        ];

        paths.forEach(p => p && fs.writeFileSync(p, mediaCover.buffer));//save to disk
        return res.status(200).json({ coverFileName: fileName });//sends filename back to front end

    } catch (error) {
        console.error("Cover upload error:", error);
        res.status(500).json({ error: "Failed to upload cover." });
    }
}

const uploadDescription = async (req, res) => {
    try {
        const { descriptionContent, coverBaseName, libraryId, branchId } = req.body; // Added hierarchy IDs

        if (!coverBaseName) {
            return res.status(400).json({ error: "Missing UUID." });
        }
        //keep path integrety
        if (coverBaseName.includes('/') || coverBaseName.includes('\\')) {
            return res.status(400).json({ error: "Invalid filename provided." });
        }

        const descriptionFileName = `${coverBaseName}.txt`;
        const savePath = path.join(getStoragePath(libraryId, branchId, 'description'), descriptionFileName);
        fs.writeFileSync(savePath, descriptionContent, 'utf8');
        return res.status(200).json({ descriptionFileName: descriptionFileName });//sends filename back to front end

    } catch (error) {
        console.error("Description upload error:", error);
        res.status(500).json({ error: "Failed to create description file." });
    }
};

const deleteCover = async (req, res) => {
    const { cover, libraryId, branchId } = req.body; // Adjusted to match expected payload
    // const filename = req.body.cover;//UUID.ext
    //const { filename } = req.body; //Assuming { filename: 'uuid.ext' }

    if (!cover) {
        return res.status(400).json({ error: "Filename is required for deletion." });
    }
    if (cover.includes('/') || cover.includes('\\')) {
        return res.status(400).json({ error: "Invalid filename provided." });
    }
    const lastDotIndex = cover.lastIndexOf('.');
    const baseName = lastDotIndex === -1 ? cover : cover.substring(0, lastDotIndex);

    const coverPath = path.join(getStoragePath(libraryId, branchId, 'cover'), cover);
    const descriptionFileName = `${baseName}.txt`; // The associated description file
    const descriptionPath = path.join(getStoragePath(libraryId, branchId, 'description'), descriptionFileName);
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
        console.error(`Error deleting files with filename: ${cover}:`, err);
        return res.status(500).json({ error: "Failed to delete files." });
    }
};

module.exports = {
    mediaByID, // The crucial parameter middleware
    read,
    update,
    remove,
    create,
    list,
    //listGenres,
    removeAll,
    uploadCover,
    uploadDescription,
    deleteCover
};
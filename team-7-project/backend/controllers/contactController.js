/*
 * File Name: contactController.js
 * Author(s): Kevon Mitchell    
 * Student ID (s): 301508202
 * Date: November 11, 2025
 * Note: using code from contactController.js
 */

const Contact = require('../models/contacts');
const _ = require('lodash'); // Used for cleaning up request bodies

// Middleware to pre-load a contact profile based on the 'contactId' parameter in the route
const contactByID = async (req, res, next, id) => {
    try {
        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({
                error: "Contact not found"
            });
        }
        //req.loadedContact=contact; //stored mongoose document for update/remove operations
        req.contact = contact;
        next();
    } catch (err) {
        return res.status(400).json({
            error: "Could not retrieve contact"
        });
    }
};

//SINGLE CONTACT 

// GET: Reads all the contact info
const read = (req, res) => {
    // req.contact contains the contact data loaded by router.param
    return res.json(req.contact.toObject());
};

// PUT: Update contact data
const update = async (req, res, next) => {
    try {

        //Use the Mongoose Document pre-loaded by contactByID (req.loadedContact)
        //let contact = req.loadedContact;        
        // Find the contact by ID
        //let contact = await Contact.findById(req.contact._id);
        
        let contact = req.contact;
        if (!contact) return res.status(404).json({ error: "Contact not found during update." });

        // Update the contact object with new data from the request body
        //use loadsh's extend method to merge the changes
        contact = _.extend(contact, req.body);
        contact.updatedAt = Date.now();
        await contact.save();

        res.json(contact.toObject());

    } catch (err) {
        // Handle validation or save errors
        return res.status(400).json({
            error: "Could not update contact: " + err.message
        });
    }
};

// DELETE: Remove the contact
const remove = async (req, res, next) => {
    try {
        const contact = req.contact; // Contact object from req.contact
        //await contact.remove();//depricated
        await contact.deleteOne();


        res.json({ message: "Contact successfully deleted."});

    } catch (err) {
        return res.status(400).json({
            error: "Could not delete contact: " + err.message
        });
    }
};


//GENERAL 


const create = async (req, res) => {
    try {
        const newContact = new Contact(req.body);
        const savedContact = await newContact.save();
        //should strip sensitive info before sending back.
        //restricted in contactRoutes        
        res.status(201).json(savedContact);
    } catch (err) {
        // Handle validation errors or duplicate keys
        res.status(400).json({ error: err.message });
    }
};

// GET: List all contacts
const list = async (req, res) => {
    try {
        const contacts = await Contact.find().select('title firstname lastname email phone'); //selects fields I would like to display
        res.status(200).json(contacts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE: Delete all contacts
const removeAll = async (req, res) => {
    try {
        //should be restricted to 'admin' roles and avoided in production.
        //will be restricted in contactRoutes
        const result = await Contact.deleteMany({});
        res.status(200).json({ message: `You deleted ${result.deletedCount} contact(s)` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    contactByID, // The crucial parameter middleware
    read,
    update,
    remove,
    create,
    list,
    removeAll
};
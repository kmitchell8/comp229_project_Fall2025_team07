/*
 * File Name: contactRoutes.js
 * Author(s): Aalayah Rodriguez, Kevon Mitchell
 * Student ID (s): 301080934, 301508202
 * Date: nov 10th
 * Note: based on code from userRoutes
 */

const express = require('express');
const router = express.Router();
//const Contact = require('../models/contacts');
const authCtrl = require('../controllers/authController');
const contactCtrl = require('../controllers/contactController');

//references CRUD in contactController 
router.route('/')
    .post(authCtrl.requireSignin, authCtrl.isAdmin,contactCtrl.create)       // Equivalent to the old router.post('/')
    .get(authCtrl.requireSignin, authCtrl.isAdmin,contactCtrl.list)          // Equivalent to the old router.get('/')
    .delete(authCtrl.requireSignin, authCtrl.isAdmin,contactCtrl.removeAll); // Equivalent to the old router.delete('/')

router.route('/:contactId')
    .get(authCtrl.requireSignin, authCtrl.isAdmin,contactCtrl.read)// Equivalent to the old router.get('/:contactID')
    .put(authCtrl.requireSignin, authCtrl.hasAuthorization, contactCtrl.update)// Equivalent to the old router.put('/:contactID')
    .delete(authCtrl.requireSignin, authCtrl.hasAuthorization, contactCtrl.remove);// Equivalent to the old router.delete('/:contactID')


router.param('contactId', contactCtrl.contactByID); 

/*
//Create contact(s)

router.post('/', async (req, res) => {
  try {
    const newContact = new Contact(req.body);
    const savedContact = await newContact.save();
    res.status(201).json(savedContact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Get all contacts

router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.status(200).json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get a single contact

router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.status(200).json(contact);
  } catch (err) {
    res.status(500).json({ message: 'Invalid Contact ID format.' });
  }
});

//Update a single contact

router.put('/:id', async (req, res) => {
  try {
    const updatedContact = await Contact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updatedContact) return res.status(404).json({ message: 'Contact not found' });
    res.status(200).json(updatedContact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//Remove a single contact

router.delete('/:id', async (req, res) => {
  try {
    const deletedContact = await Contact.findByIdAndDelete(req.params.id);
    if (!deletedContact) return res.status(404).json({ message: 'Contact not found' });
    res.status(200).json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//Delete all contact

router.delete('/', async (req, res) => {
  try {
    const result = await Contact.deleteMany({});
    res.status(200).json({ message: `You deleted ${result.deletedCount} contact(s)` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
*/
module.exports = router;

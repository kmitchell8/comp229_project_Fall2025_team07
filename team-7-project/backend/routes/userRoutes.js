/*
 * File Name: userRoutes.js
 * Author(s): Aalayah Rodriguez, Kevon Mitchell
 * Student ID (s): 301080934, 301508202
 * Date: nov 10th
 * Note: code based on slides from week6 "AUTHENTICATION (16) (2) (5).pptx" in comp229(Centennial College)
 */

const express = require('express');
const router = express.Router();
//const User = require('../models/users');
const authCtrl = require('../controllers/authController');
const userCtrl = require('../controllers/userController');
//import { requireSignin } from '../controllers/authController';

//Authentication Routes
//user registration
//router.post('/register', authCtrl.register); //access from authRoutes
//user Login
//router.post('/signin', authCtrl.signin); //accessed from authRoutes

//references CRUD in userController //used for ADMIN purposes
router.route('/')
    .post(authCtrl.requireSignin, authCtrl.isAdmin,userCtrl.create)       // Equivalent to the old router.post('/')
    .get(authCtrl.requireSignin, authCtrl.isAdmin,userCtrl.list)          // Equivalent to the old router.get('/')
    .delete(authCtrl.requireSignin, authCtrl.isAdmin,userCtrl.removeAll); // Equivalent to the old router.delete('/')

router.route('/:userId')
    .get(authCtrl.requireSignin, userCtrl.read)// Equivalent to the old router.get('/:userID')
    .put(authCtrl.requireSignin, authCtrl.hasAuthorization, userCtrl.update)// Equivalent to the old router.put('/:userID')
    .delete(authCtrl.requireSignin, authCtrl.hasAuthorization, userCtrl.remove);// Equivalent to the old router.delete('/:userID')

// This ensures that whenever the route contains ':userId', the userCtrl.userByID
// function is run first to load the user object onto the request body.
router.param('userId', userCtrl.userByID); //AI recommendation
/*
//Create user(s) - does not require authentication
router.post('/', async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Get all users

router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Delete all users

router.delete('/', async (req, res) => {
  try {
    const result = await User.deleteMany({});
    res.status(200).json({ message: `You deleted ${result.deletedCount} user(s)` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//Get a single user

router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Invalid User ID format.' });
  }
});

//Update a single user

router.put('/:userId', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//Remove a single user

router.delete('/:userId', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

*/


module.exports = router;

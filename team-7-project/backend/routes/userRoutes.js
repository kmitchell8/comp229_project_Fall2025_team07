/*
 * File Name: userRoutes.js
 * Author(s): Aalayah Rodriguez
 * Student ID (s): 301080934
 * Date: nov 10th
 */

const express = require('express');
const router = express.Router();
const User = require('../models/users');

//Create user(s)

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

//Get a single user

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Invalid User ID format.' });
  }
});

//Update a single user

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User deleted' });
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

module.exports = router;

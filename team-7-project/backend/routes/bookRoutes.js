/*
 * File Name: bookRoutes.js
 * Author(s): Aalayah Rodriguez, Kevon Mitchell
 * Student ID (s): 301080934, 301508202
 * Date: nov 10th
 */

const express = require('express');
const router = express.Router();
const Book = require('../models/books');

//Create book(s)

router.post('/', async (req, res) => {
  try {
    const newBook = new Book(req.body);
    const savedBook = await newBook.save();
    res.status(201).json(savedBook);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Get all books

router.get('/', async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//Get a single book

router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: 'Invalid Book ID format.' });
  }
});

//Update a single book

router.put('/:id', async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updatedBook) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json(updatedBook);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//Remove a single book

router.delete('/', async (req, res) => {
  try {
    const result = await Book.deleteMany({});
    res.status(200).json({ message: `You deleted ${result.deletedCount} book(s)` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Delete all books

module.exports = router;

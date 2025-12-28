/*
 * File Name: bookRoutes.js
 * Author(s): Aalayah Rodriguez, Kevon Mitchell
 * Student ID (s): 301080934, 301508202
 * Date: nov 10th
 * Note: based on code from userRoutes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
//const Book = require('../models/books');
const authCtrl = require('../controllers/authController');
const bookCtrl = require('../controllers/bookController');


//router.get('/genres', bookCtrl.listGenres);
//references CRUD in bookController 
router.route('/')
  .post(authCtrl.requireSignin, authCtrl.isAdmin, bookCtrl.create)       // Equivalent to the old router.post('/')
  .get(bookCtrl.list)          // Equivalent to the old router.get('/')
  .delete(authCtrl.requireSignin, authCtrl.isAdmin, bookCtrl.removeAll); // Equivalent to the old router.delete('/')

router.route('/cover')
  .post(authCtrl.requireSignin, authCtrl.isAdmin, upload.single('coverImage'), bookCtrl.uploadCover)       // Equivalent to the old router.post('/')
  .delete(authCtrl.requireSignin, authCtrl.isAdmin, bookCtrl.deleteCover); // Equivalent to the old router.delete('/:ID')
/* router.route('/cover/:filename')
 .delete(authCtrl.requireSignin, authCtrl.isAdmin, bookCtrl.deleteCover); // Equivalent to the old router.delete('/:ID')
*/
router.route('/description')
  .post(authCtrl.requireSignin, authCtrl.isAdmin, bookCtrl.uploadDescription);// Equivalent to the old router.post('/')

router.route('/:bookId')
  .get(bookCtrl.read)// Equivalent to the old router.get('/:bookID')
  .put(authCtrl.requireSignin, authCtrl.hasAuthorization, bookCtrl.update)// Equivalent to the old router.put('/:bookID')
  .delete(authCtrl.requireSignin, authCtrl.hasAuthorization, bookCtrl.remove);// Equivalent to the old router.delete('/:ID')


router.param('bookId', bookCtrl.bookByID);

module.exports = router;

/*
 * File Name: mediaRoutes.js
 * Author(s): Aalayah Rodriguez, Kevon Mitchell
 * Student ID (s): 301080934, 301508202
 * Date: nov 10th
 * Note: based on code from userRoutes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
//const Media = require('../models/medias');
const authCtrl = require('../controllers/authController');
const mediaCtrl = require('../controllers/mediaController');


//router.get('/genres', mediaCtrl.listGenres);
//references CRUD in mediaController 
router.route('/')
  .post(authCtrl.requireSignin, authCtrl.isAdmin, mediaCtrl.create)       // Equivalent to the old router.post('/')
  .get(mediaCtrl.list)          // Equivalent to the old router.get('/')
  .delete(authCtrl.requireSignin, authCtrl.isAdmin, mediaCtrl.removeAll); // Equivalent to the old router.delete('/')

router.route('/cover')
  .post(authCtrl.requireSignin, authCtrl.isAdmin, upload.single('coverImage'), mediaCtrl.uploadCover)       // Equivalent to the old router.post('/')
  .delete(authCtrl.requireSignin, authCtrl.isAdmin, mediaCtrl.deleteCover); // Equivalent to the old router.delete('/:ID')
/* router.route('/cover/:filename')
 .delete(authCtrl.requireSignin, authCtrl.isAdmin, mediaCtrl.deleteCover); // Equivalent to the old router.delete('/:ID')
*/
router.route('/description')
  .post(authCtrl.requireSignin, authCtrl.isAdmin, mediaCtrl.uploadDescription);// Equivalent to the old router.post('/')

router.route('/:mediaId')
  .get(mediaCtrl.read)// Equivalent to the old router.get('/:mediaID')
  .put(authCtrl.requireSignin, authCtrl.hasAuthorization, mediaCtrl.update)// Equivalent to the old router.put('/:mediaID')
  .delete(authCtrl.requireSignin, authCtrl.hasAuthorization, mediaCtrl.remove);// Equivalent to the old router.delete('/:ID')


router.param('mediaId', mediaCtrl.mediaByID);

module.exports = router;

/*
 * File Name: libraryRoutes.js
 * Author(s): Kevon Mitchell
 * Student ID (s): 301508202
 * Date: Jan 08, 2026
 * Note: based on code from userRoutes
 */

const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const libraryCtrl = require('../controllers/libraryController');
const branchCtrl = require('../controllers/branchController');

// LIBRARY (TENANT) ROUTES

router.route('/')
  .post(authCtrl.requireSignin, /*authCtrl.isAdmin,*/ libraryCtrl.create)
  .get(libraryCtrl.list)
  .delete(authCtrl.requireSignin, authCtrl.isAdmin, libraryCtrl.removeAll);

// GENERAL BRANCH ROUTES (FOR GLOBAL ADMIN)

router.route('/branches')
  .get(/*authCtrl.requireSignin, authCtrl.isAdmin, */branchCtrl.list)
  .delete(authCtrl.requireSignin, authCtrl.isAdmin, branchCtrl.removeAll);

router.route('/:libraryId')
  .get(libraryCtrl.read) // users can read library info
  .put(authCtrl.requireSignin, authCtrl.hasAuthorization, libraryCtrl.update)
  .delete(authCtrl.requireSignin, authCtrl.isAdmin, libraryCtrl.remove);


// BRANCH ROUTES (NESTED UNDER LIBRARY)

// List branches for a specific library or create a new branch within a library
router.route('/:libraryId/branches')
  .get(branchCtrl.list) // Controller should filter by req.library._id
  .post(authCtrl.requireSignin, authCtrl.hasAuthorization, branchCtrl.create);

// Individual Branch operations
router.route('/:libraryId/branches/:branchId')
  .get(branchCtrl.read)
  .put(authCtrl.requireSignin, authCtrl.hasAuthorization, branchCtrl.update)
  .delete(authCtrl.requireSignin, authCtrl.hasAuthorization, branchCtrl.remove);

// PARAMETER MIDDLEWARE

// Pre-load Library whenever 'libraryId' is in the URL
router.param('libraryId', libraryCtrl.libraryByID);
// Pre-load Branch whenever 'branchId' is in the URL
router.param('branchId', branchCtrl.branchByID);

module.exports = router;
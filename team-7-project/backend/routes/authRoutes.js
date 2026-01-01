/*
 * File Name: authRoutes.js
 * Author(s): Kevon Mitchell
 * Student ID (s): 301508202
 * Date: November 11, 2025
 */


//import express from 'express'; //using tpye: "module"
const express = require('express');//using type="commonjs"
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.route('/signin').post(authCtrl.signin);
router.route('/signout').get(authCtrl.signout);
router.route('/register').post(authCtrl.register); //Creates User can be accessed from userRoutes

// PASSWORD RESET ROUTES
router.route('/forgot-password').post(authCtrl.forgotPassword);// Route for user to request a reset token via email
router.route('/reset-password').post(authCtrl.resetPassword);// Route for user to submit their new password along with the token

module.exports =  router;

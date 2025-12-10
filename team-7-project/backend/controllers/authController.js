/*
 * File Name: authController.js
 * Author(s): Kevon Mitchell    
 * Student ID (s): 301508202
 * Date: November 11, 2025
 * Note: code based on slides from week6 "AUTHENTICATION (16) (2) (5).pptx" in comp229(Centennial College)
 */


//import express from 'express'; //using tpye: "module"
//const express = require('express');//using type="commonjs"
const User = require('../models/users');
//import User from '..models/users';
const jwt = require('jsonwebtoken');
//import jwt from 'jsonwebtoken';
const { expressjwt } = require('express-jwt');
//const { response } = require('express'); //for HTTP cookie
//const userCtrl = require('./userController');
//import {expressJwt} from 'express-jwt';


//Define config 
const config = {
    jwtSecret: process.env.JWT_SECRET
};

//register user//for later implimentation

const register = async (req, res) => {
    console.log(req.body);
    try {
        const newUser = new User(req.body);
        const savedUser = await newUser.save();


        const userObject = savedUser.toObject();
        delete userObject.password;

        return res.status(201).json(userObject);

    } catch (err) {
        // Handle validation errors or duplicate keys
        return res.status(400).json({ error: err.message });
    }
};

//login/sigin 
const signin = async (req, res) => {
    try {
        //explicit password requirement due to the removal of the hashed_password requirement 
        //in the user.js userSchema
        if (!req.body.password) {
            return res.status(401).json({ error: "Password is required for sign-in." });
        }

        let user = await User.findOne({ "email": req.body.email });

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        //needs to explicitly get the bolean result from the bcrypt comparison function
        //otherwise a user can sign in with an unverified password
        const isAuthenticated = await user.authenticate(req.body.password);
        if (!isAuthenticated) {
            return res.status(401).json({ error: "Email and password don't match." });
        }

        const userObject = user.toObject(); //cleaner implimentation
        delete userObject.password; //removes the password from the object
        //Generate the token //isAdmin role will be looked at later
        const token = jwt.sign({ _id: user._id, role: user.role }, config.jwtSecret);

        const responseData = {
            token: token,
            user: userObject
        }
        //Set cookie //removes sensitive user data
       /* res.cookie('t', token, {//remove for deployment to work //was setting an http cookie reverting to localstorage
            expire: new Date(Date.now() + 99990000)
            //httpOnly: true, //recommended for security
            //secure: process.env.NODE_ENV === 'production',//recommended for production
            // sameSite: 'None'// Ensures the cookie is sent in cross-site requests

        });*/

        return res.status(200).json(responseData);//chain the return
        /*res.setHeader('Content-Type', 'application/json');
        res.status(200);
        return res.end(JSON.stringify(responseData));*/

    } catch (err) {
        return res.status(401).json({ error: "Could not sign in: " + err.message });
    }
};

//Clears the authentication cookie to signout user. 
const signout = (req, res) => {
   // res.clearCookie("t"); //remove for deployment
    return res.status(200).json({ message: "signed out" });
};


//MIDDLEWARE

//requireSignin
const requireSignin = expressjwt({
    secret: config.jwtSecret,
    userProperty: 'auth', // Attaches decoded JWT payload to req.auth
    algorithms: ['HS256']  //defineds a specific algorithm to use 
});


//hasAuthorization
const hasAuthorization = (req, res, next) => {
    // Check if profile ID matches auth ID OR if the user is an admin
    const isOwner = req.profile && req.auth &&
        (req.profile._id.toString() === req.auth._id.toString())
    const isAdmin = req.auth && req.auth.role === 'admin';//admin role for later implimentation
    const authorized = isOwner || isAdmin;
    if (!(authorized)) {
        return res.status(403).json({
            error: "User is not authorized"
        });
    }
    next();
};

//isAdmin: Checks if the logged-in user is an administrator //used and implimented later
//requires update to schema. currently defining "role" as String but may change to boolean
const isAdmin = (req, res, next) => {
    // Requires that the user's role was added to the JWT payload during login
    if (!req.auth || req.auth.role !== 'admin') {
        return res.status(403).json({
            error: "User is not authorized. Admin access required."
        });
    }
    next();
};

/*
const signin = async (req, res) => {
    try {
        let user = await User.findOne({ "email": req.body.email }) //searches for user using email
        if (!user)
            return res.status('401').json({ error: "User not found" })
        if (!user.authenticate(req.body.password)) {
            return res.status('401').send({ error: "Email and password don't match." })
        }
        const token = jwt.sign({ _id: user._id }, config.jwtSecret)
        res.cookie('t', token, { expire: new Date() + 9999 }) //creates a token cookie to store signin status
        return res.json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        })
    } catch (err) {
        return res.status('401').json({ error: "Could not sign in" })
    }
}
const signout = (req, res) => {
    res.clearCookie("t")//clears cookie created in signin function
    return res.status('200').json({ message: "signed out" })

}
const requireSignin = expressJwt({
    secret: config.jwtSecret,
    userProperty: 'auth'
})

const hasAuthorization = (req, res, next) => {
    const authorized = req.profile && req.auth
        && req.profile._id == req.auth._id
    if (!(authorized)) {
        return res.status('403').json({
            error: "User is not authorized"
        })
    }
    next()
}
*/
module.exports = { register, signin, signout, requireSignin, hasAuthorization, isAdmin }
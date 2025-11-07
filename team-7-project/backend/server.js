/*
 * File Name: server.js
 * Author(s): 
 * Student ID (s): 
 * Date: 
 */

//import express from 'express'; //using tpye: "module"
const express = require('express');//using type="commonjs"
const mongoose = require('mongoose'); // needed to connect to MongoDB
const bodyParser = require('body-parser');
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
const PORT = 5000;
const MONGO_URI = "" //might be located in the .env file (process.env.MONGO_URI)
const MONGO_LOCAL =""//might be located in the .env file (process.env.MONGO_LOCAL)


//creating the MongoDB connection with Cloud server




//creating the MongoDB connection with Local server 




mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB')
});

//enabling the API routes




app.listen(PORT, () => {
})





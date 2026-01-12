/*
 * File Name: server.js
 * Author(s): Adrian Myers, Kevon Mitchell
 * Student ID (s): , 301508202
 * Date: 
 */

//import express from 'express'; //using tpye: "module"
const express = require('express');//using type="commonjs"
const mongoose = require('mongoose'); // needed to connect to MongoDB
//const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
//const mongoUri = "" //might be located in the .env file (process.env.MONGO_URI) //cloud
//const mongoUri = "mongodb://localhost/LibraryDB"//might be located in the .env file (process.env.MONGO_LOCAL)
//const mongoUri = process.env.MONGO_URI; //Cloud server
//const mongoUri = process.env.MONGO_LOCAL; //Local server
// Standard way to switch between Cloud and Local DB
const mongoUri = process.env.NODE_ENV === 'production' 
    ? process.env.MONGO_URI    // Cloud server (Live)
    : process.env.MONGO_LOCAL; // Local server (Dev)
//API Routes
const libraryRoutes = require('./routes/libraryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/userRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const authRoutes = require('./routes/authRoutes');



//creating the MongoDB connection with Cloud server
/*mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true

})
    
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB')
});

*/

//MONGO_DB Connection
mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch(err => console.error('MongoDB connection error:', err.message));

//MIDDLEWARE

app.use(cors());
app.use(express.json());
app.use(cookieParser());
//app.use(bodyParser.json());  //handled by express.json
//enabling the API routes

//STATIC
app.use('/users', express.static(path.join(__dirname, 'public', 'users')));
app.use('/images/temp', express.static(path.join(__dirname, 'public', 'images', 'temp')));
app.use('/documents', express.static(path.join(__dirname, 'public', 'documents')));
//app.use('/documents/description', express.static(path.join(__dirname, 'public', 'documents', 'description')));
app.use('/images/cover', express.static(path.join(__dirname, 'public', 'images', 'cover')));
//JSON
app.use('/api/library', libraryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/user', userRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api', authRoutes);

app.get('/', (_req, res,) => {
    res.status(200).json({ "message": "Any message indicating the server is working" }); //leav in for testing purposes
});

app.use((err, _req, res, _next) => {
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({ "error": err.name + ": " + err.message })
    } else if (err) {
        res.status(400).json({ "error": err.name + ": " + err.message })
        console.log(err)
    }
})

const BASE_URL = process.env.MONGO_LOCAL ?
    `${process.env.LOCAL_HOST}${PORT}` || `http://localhost:${PORT}`
    : process.env.CLOUD_URL || 'undefined';

app.listen(PORT, () => {
    console.log(`Server is running at ${BASE_URL}`);
    console.log(`Contacts are visible at ${BASE_URL}${'/api/contacts'}`);
    console.log(`Users are visible at ${BASE_URL}${'/api/users'}`);
    console.log(`Medias are visible at ${BASE_URL}${'/api/medias'}`);
    console.log(`Authentications are visible at ${BASE_URL}${'/api'}`);
})





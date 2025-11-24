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
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
//const mongoUri = "" //might be located in the .env file (process.env.MONGO_URI) //cloud
//const mongoUri = "mongodb://localhost/LibraryDB"//might be located in the .env file (process.env.MONGO_LOCAL)
//const mongoUri = process.env.MONGO_URI; //Cloud server
const mongoUri = process.env.MONGO_LOCAL; //Local server
//API Routes
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
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
app.use('/api/contacts', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api', authRoutes);

app.get('/', (req, res,) => {
    res.status(200).json({ "message": "Any message indicating the server is working" }); //leav in for testing purposes
});

app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({ "error": err.name + ": " + err.message })
    } else if (err) {
        res.status(400).json({ "error": err.name + ": " + err.message })
        console.log(err)
    }
})

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Contacts are visible at http://localhost:${PORT}${'/api/contacts'}`);
    console.log(`Users are visible at http://localhost:${PORT}${'/api/users'}`);
    console.log(`Books are visible at http://localhost:${PORT}${'/api/books'}`);
    console.log(`Authentications are visible at http://localhost:${PORT}${'/api'}`);
})





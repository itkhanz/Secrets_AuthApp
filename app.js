// Dotenv is a zero-dependency module 
// that loads environment variables from a .env file into process.env. 
// https://www.npmjs.com/package/dotenv
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');

// // /*https://www.npmjs.com/package/mongoose-encryption
// // Simple encryption and authentication for mongoose documents
// // Encryption and decryption happen transparently during save and find.*/
// // Problem: password can be easily decrypted if secret key gets hacked
// // Solution: Use Hash passwords, hashes are irreversible
// const encrypt = require('mongoose-encryption');

// // a JavaScript function for hashing messages with MD5.
// // Hash is vulnerable to Hash lookup tables using common passwords, dictionary attack
// const  md5 = require('md5');

// A library to help you hash passwords with Salting.
// https://www.npmjs.com/package/bcrypt
const bcrypt = require('bcrypt');
const saltRounds = 10;

mongoose.connect('mongodb://localhost:27017/userDB', 
    { useNewUrlParser: true, useUnifiedTopology: true }
);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

// /*
// encrypt plugin will automatically encrypt the fields behind the scenes
// when Moodel.save() is called, and decrypt when model.find() is called
// */
// // const secret = 'Thisisourlittlesecret.';
// // console.log(process.env.API_KEY);
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model('User', userSchema);



const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({
    extended: true
}));

app.set('view engine', 'ejs');

function wrapAsync(fn){
    return function(req, res, next){
      fn(req, res, next).catch(e => next(e));
    }
};


app.get('/', (req, res) => {
    res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', wrapAsync(async(req, res, next) => {
    const {username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({
        email: username,
        password: hashedPassword
        // password: md5(req.body.password)
    });
    await newUser.save();
    res.render('secrets');
}));

app.post('/login', wrapAsync(async (req, res, next) => {
    const {username, password } = req.body;
    const foundUser = await User.findOne({ email: username});
    // Hackers can see the password if they get access to app.js file
    // and print out the foundUser.password in plain text if simple encryption is used
    if(foundUser) {
        const passwordMatched = await bcrypt.compare(password, foundUser.password);
        if(passwordMatched) {
            res.render('secrets');
        }
    }
}));








app.use((err, req, res, next) => {
    const { status } = err;
    res.status(status).send('ERRORRRR!!!!')
});


app.listen(3000, () => {
    console.log("Server Started on port 3000.");
});
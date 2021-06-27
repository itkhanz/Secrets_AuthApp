//jshint esversion:6
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

mongoose.connect('mongodb://localhost:27017/userDB', 
    { useNewUrlParser: true, useUnifiedTopology: true }
);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

/*
encrypt plugin will automatically encrypt the fields behind the scenes
when Moodel.save() is called, and decrypt when model.find() is called
*/
const secret = 'Thisisourlittlesecret.';
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

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
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    await newUser.save();
    res.render('secrets');
}));

app.post('/login', wrapAsync(async (req, res, next) => {
    const {username, password } = req.body;
    const foundUser = await User.findOne({ email: username});
    // Hackers can see the password if they get access to app.js file
    // and print out the foundUser.password in plain text
    if(foundUser) {
        if(foundUser.password == password) {
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
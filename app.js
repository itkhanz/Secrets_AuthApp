// Dotenv is a zero-dependency module 
// that loads environment variables from a .env file into process.env. 
// https://www.npmjs.com/package/dotenv
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
// passport-local is a dependency for passport-local-mongoose so does not need to be exposed
const passportLocalMongoose = require('passport-local-mongoose');


mongoose.connect('mongodb://localhost:27017/userDB', {
  useNewUrlParser: true,
  useCreateIndex: true, 
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Database Connected')
});

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({
    extended: true
}));

// Note: whenever server restarts, cookies get deleted and session restarts
const sessionOptions = { 
    secret: 'thisisnotagoodsecret', 
    resave: false, 
    saveUninitialized: false 
  };
app.use(session(sessionOptions));

/**************   
https://www.passportjs.org/docs/configure/
In a Connect or Express-based application, passport.initialize() middleware is required to initialize Passport. 
If your application uses persistent login sessions, passport.session() middleware must also be used.
**************/
app.use(passport.initialize());
app.use(passport.session());


const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

/* First you need to plugin Passport-Local Mongoose into your User schema
Passport-Local Mongoose will add a username, hash and salt field to store the username, the hashed password and the salt value.
Additionally Passport-Local Mongoose adds some methods to your Schema. 
https://www.npmjs.com/package/passport-local-mongoose
*/
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

// The createStrategy is responsible to setup passport-local LocalStrategy with the correct options.
// use static authenticate method of model in LocalStrategy
// // passport.use(new LocalStrategy(User.authenticate()));
passport.use(User.createStrategy());
// use static serialize and deserialize of model for passport session support
// In order to support login sessions, Passport will serialize and deserialize user instances to and from the session.
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



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

app.get('/secrets', (req, res) => {
    /* The below line was added so we can't display the "/secrets" page
    after we logged out using the "back" button of the browser, which
    would normally display the browser cache and thus expose the 
    "/secrets" page we want to protect.*/
    res.set(
        'Cache-Control', 
        'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
    );
    //req.isAuthenticated() will return true if user is logged in
    // The user id is saved in a session cookie ID inside user browser
    // No need to sign in again when trying to access secret page
    if (req.isAuthenticated()) {
        res.render('secrets');
    } else {
        res.redirect('/login');
    }
});

app.post('/register', (req, res, next) => {
    const {username, password } = req.body;
    // register() method comes from the passport-local-mongoose plugin
    User.register({username: username}, password, (err, user) => {
        if(err) {
            console.log(err);
            res.redirect('/register');
        }
        else 
        {
            /* https://www.passportjs.org/docs/login/
               Passport exposes a login() function on req (also aliased as logIn()) 
               that can be used to establish a login session.
               This function is primarily used when users sign up, during 
               which req.login() can be invoked to automatically log in the newly registered user.
               https://stackoverflow.com/questions/16817800/passport-node-js-automatic-login-after-adding-user
            */
            req.login(user, function(err) {
                if (err) { return next(err); }
                // console.log(user);
                return res.redirect('/secrets');
                });
        }
    });
});


/*
    http://www.passportjs.org/docs/authenticate/
    Authenticating requests is as simple as calling passport.authenticate() 
    and specifying which strategy to employ.
    Note: passport.authenticate() middleware invokes req.login() automatically. 
*/
app.post('/login', passport.authenticate('local', { 
                            successRedirect: '/secrets',
                            failureRedirect: '/login' 
                            })
);


app.get('/logout', (req, res, next) => {
    /*
    https://www.passportjs.org/docs/logout/
    Passport exposes a logout() function on req (also aliased as logOut()) 
    that can be called from any route handler which needs to terminate a login session. 
    Invoking logout() will remove the req.user property and clear the login session (if any).
     */
    req.logout();
    res.redirect('/');
});


app.use((err, req, res, next) => {
    const { status } = err;
    res.status(status).send('ERRORRRR!!!!')
});


app.listen(3000, () => {
    console.log("Server Started on port 3000.");
});
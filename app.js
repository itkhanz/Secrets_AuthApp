/******************************
 * http://www.passportjs.org/packages/passport-facebook/
 * 1.npm install passport-facebook
 * 2. Create an Application on Facebook Developers platform
 *    Links:- 
 *      https://developers.facebook.com/docs/development#register
 * 3. Important! Create Test app for development purposes otherwise gives ssl error
 * 4. In Settings->Basics, add platform/wesbite as callback URI http://localhost:3000/auth/facebook/secrets
 * 5. Copy the  App ID and App Secret in .env file
 * 6. Do not use scope,  if you only require user basic information, don't pass any scope, just use passport.authenticate('facebook').
 *  7. Resources:-
 *      https://www.twilio.com/blog/facebook-oauth-login-node-js-app-passport-js
 *      https://medium.com/swlh/node-and-passport-js-facebook-authentication-76cbfa903ff3
 * 8. Issues:-
 *      (1: Facebook does not ask for login credentials again after logout)
 *      https://stackoverflow.com/questions/12873960/passport-js-facebook-strategy-logout-issue
 *      https://developers.facebook.com/docs/facebook-login/reauthentication
 *      https://github.com/jaredhanson/passport-facebook/issues/202
 *      https://stackoverflow.com/questions/32985655/passport-facebook-logout-not-working
 */


require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

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
app.set('Cache-Control', 'no-store');   // will prevent any caching from webbrowser
app.use(express.static('public'));
app.use(express.urlencoded({
    extended: true
}));

const sessionOptions = { 
    secret: 'thisisnotagoodsecret', 
    resave: false, 
    saveUninitialized: false 
  };
app.use(session(sessionOptions));


app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


// Google Ouath2.0 configure strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// Facebook OAuth 2.0 Configure strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ["email", "name", "id"]
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/', (req, res) => {
    res.render('home');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  }
);

app.get('/auth/facebook',
  passport.authenticate('facebook', {authType: 'reauthenticate'})
);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});





app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('secrets');
    } else {
        res.redirect('/login');
    }
});

app.post('/register', (req, res, next) => {
    const {username, password } = req.body;

    User.register({username: username}, password, (err, user) => {
        if(err) {
            console.log(err);
            res.redirect('/register');
        }
        else 
        {
            // passport.authenticate('local')(req, res, function () {
            //     res.redirect('/secrets');
            // })
            // better way to authenticate and login handle errors    
            req.login(user, function(err) {
                if (err) { return next(err); }
                // console.log(user);
                return res.redirect('/secrets');
                });
        }
    });
});


app.post('/login', passport.authenticate('local', { 
                            successRedirect: '/secrets',
                            failureRedirect: '/login' 
                            })
);


app.get('/logout', (req, res, next) => {
    // req.session = null;
    req.session.destroy((err) => {
        if(err) return next(err)
    
        req.logout();
    
        // res.sendStatus(200)
    });
    // req.logout();
    res.redirect('/');
});


app.use((err, req, res, next) => {
    const { status } = err;
    res.status(status).send('ERRORRRR!!!!')
});


app.listen(3000, () => {
    console.log("Server Started on port 3000.");
});
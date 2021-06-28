/******************************
 * http://www.passportjs.org/packages/passport-google-oauth20/
 * 1.npm install passport-google-oauth20
 * 2. Create an application using Google Developers Console
 * 3. Save Client ID and Client secret in .env file
 * 4. Configure Strategy
 * 5. Configure mongoose-findorcreate, Simple plugin for Mongoose which adds a findOrCreate method to models.
 * 6. Add buttons for sign up/in with google on frontend
 * 7. Add routes to /auth/google, Use passport.authenticate(), specifying the 'google' strategy, to authenticate requests.
 * 8. Add route for authorized redirect URI http://localhost:3000/auth/google/secrets
 * 9. Replace the serialize and deserialize code with PassportJS version
 * 10. Save the google profile id in database to help remember the user when they sign in after registering
 * 11. By default, Google auth will only save a user inside database with object id and we cannot login again after registering.
 * 12. We only get user id and name, no password in our database so google auth is relatively more safer.
 * 13. Buttons styling https://lipis.github.io/bootstrap-social/, copy bootstrap-social.css file in our public css folder
 * 14. As we have implemented sessions and cookeis, we can still be autnenticated and can go back to secrets page even if we visit some other page
 * 15. Implement auth with Facebook as bonus task
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
    googleId: String
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


// Google ouath2.0 configure strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
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
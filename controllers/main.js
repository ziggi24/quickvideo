const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { Strategy } = require('passport-local');
const { User, Video } = require('../models');
const multer = require('multer');
const fs = require('fs');
const moment = require('moment');

const router = express.Router();

// Configure the local strategy for use by Passport.
// ( taken from the passport.js docs, refactored to be async
//   and to use bcrypt to compare hashed passwords )
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `next` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use('local-login', new Strategy({
    usernameField: 'user',
    passwordField: 'password'
}, async (user, password, next) => {
try{
    const userLogin = await User.findOne({ user: user });
    if(!userLogin){
        console.log('no user found');
        return next(null, false, { message: 'Incorrect email or password' });
    }
    const isMatch = await bcrypt.compare(password, userLogin.password);
    if(!isMatch){
        console.log('Incorrect password');
        return next(null, false, { message: 'Incorrect email or password' });
    }
    console.log('user found');
    return next(null, userLogin);
} catch(err){
    console.log(err);
    next(err);
}
}));
// Configure Passport authenticated session persistence.
// (from passport.js docs)
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, next) {
next(null, user.id);
});

passport.deserializeUser(async function(id, next) { 
try{
    const user = await User.findById(id);
    next(null, user);
} catch(err){
    next(err);
}
});

router.use(passport.initialize());
router.use(passport.session());

//multer config 
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads');
    } , 
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname.trim());
    }
});
const upload = multer({ storage: fileStorage });


router.get('/login', async (req, res) => {
res.redirect('/');
})
router.get('/register', async (req, res) => {
res.render('./register');
})
router.post('/register', async (req, res) => {
try {
    console.log(req.body);
    console.log(process.env.KEY)
    if(req.body.key === process.env.KEY){
    const foundUser = await User.find({ user: req.body.user });
    if(foundUser){
        res.json({ message: 'User already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);
    req.body.password = hash;
    const user = await User.create(req.body);
    res.render('index', { user: user });
    } else {
        res.json({ message: 'error' });
    }

} catch (error) {
    console.log(error);
    res.json({error: "server error"});
}
});
router.post('/login', passport.authenticate("local-login", {failureRedirect: "/login"}) ,async (req, res) =>{
try {
    console.log(req.user);
    res.redirect(`/main`);
} catch (error) {
    console.log(error);
    res.json({error: "server error"});
}
});
router.get("/logout", (req, res) => {
    req.logout(req.user, err => {
      if(err) return next(err);
      res.redirect("/");
    });
  });


router.get('/', (req, res) => {
    if(!req.session.passport || req.session.passport === undefined || !req.session.passport.user || req.session.passport.user === undefined) {
        const context = {
            user: "Log In",
        }
        res.render('index', context);

    } else {
        const context = {
            user: req.session.passport.user,
        }
        res.render('index', context);

    }
});  
router.get('/main',require('connect-ensure-login').ensureLoggedIn('/'), async (req, res) => {
    try {   
        function isADayAgo(input){
            let yesterday = moment().subtract(1, 'd');
            return input.isBefore(yesterday);
          }
        const user = await User.findById(req.session.passport.user);
        const videos = fs.readdirSync('./public/uploads');
        videos.forEach(video => {
            if(isADayAgo(moment(video.substring(0, video.indexOf('Z-'))+'Z'))){
                console.log('deleting ' + video);
                fs.unlinkSync('./public/uploads/' + video);
                res.redirect('/main');
            } else {
                console.log('keeping ' + video);
                console.log('video uploaded ' + moment(video.substring(0, video.indexOf('Z-'))+'Z').fromNow());
            }
        } );            
        console.log(videos);
        res.render('main', { user: user, videos: videos });
    } catch (error) {
        console.log(error);
        res.json({error: "server error"});
    }
} );

//file upload route
router.post('/upload', require('connect-ensure-login').ensureLoggedIn('/'), upload.single('file'), async (req, res) => {
    try {
        console.log(req.file);
        res.redirect('/main');
    } catch (error) {
        console.log(error);
        res.json({error: "server error"});
    }
} );
router.get('/video/:id', require('connect-ensure-login').ensureLoggedIn('/'), async (req, res) => {
    try {
        console.log(req.params.id);
        
        res.render('video', {video: req.params.id});
    } catch (error) {
        console.log(error);
        res.json({error: "server error"});
    }
} );


module.exports = router;
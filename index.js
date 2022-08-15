const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');


require('dotenv').config();

const controllers = require('./controllers');
const db = require('./models');

//passport login and register
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


const app = express(); 

// session config
app.use(session({
    store: MongoStore.create({
       mongoUrl: process.env.MONGODB_URI,
    }),
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
}));

const scriptSources = ["'self'","'unsafe-inline'",'fonts.googleapis.com','cdn.jsdelivr.net','kit.fontawesome.com', 'unpkg.com', 'cdnjs.cloudflare.com'];
const styleSources = ["'self'",'fonts.googleapis.com','cdn.jsdelivr.net','fonts.gstatic.com','ka-f.fontawesome.com',"'unsafe-inline'"];
const connectSources = ["'self'",'ka-f.fontawesome.com'];

app.use(helmet()); // security middleware which adds HTTP headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: scriptSources,
      scriptSrcElem: scriptSources,
      styleSrc: styleSources,
      styleSrcElem: styleSources,
      fontSrc: styleSources,
      frameSrc: ["'self'",'https://docs.google.com/'],
      imgSrc: ["'self'", 'data:', "picsum.photos", "i.picsum.photos"],
      connectSrc: connectSources,    
    },
  })
)
app.use(morgan('dev')); // logger
app.use(express.static(__dirname + '/public')); //serving public folder
app.use(bodyParser.urlencoded({ extended: true })); // parse form data client

app.set('view engine', 'ejs'); //setting view engine to ejs will probably change? 


const PORT = process.env.PORT || 3000;

app.use('/', controllers.main);
app.listen(PORT, () => {
    console.log('Server is running on port '+PORT);
});



'use strict';

const express = require('express');
require('dotenv').config();
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
const methodOverride = require('method-override');
const flash = require('express-flash');
const { csrfSync } = require('csrf-sync');
const { globalLimiter } = require('./middleware/rate-limiter');

// Importazione delle rotte
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');

const app = express();

// Rilevamento ambiente (usato da Helmet, sessioni, trust proxy)
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:'],
        frameSrc: ['https://www.google.com'],
        connectSrc: ["'self'"],
        // In produzione (HTTPS) il browser aggiorna le richieste HTTP → HTTPS automaticamente.
        // In sviluppo (HTTP puro) va disabilitato per evitare errori TLS sul CSS/JS.
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
  }),
);

// Rate Limiter globale
app.use(globalLimiter);

// Configurazione middleware di base
app.use(morgan('dev'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Trust proxy: solo in produzione (dietro reverse proxy/load balancer)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Configurazione sessioni
app.use(
  session({
    secret: process.env.SECRET_SESSION,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 ora
    },
  }),
);

// Configurazione del motore di template
app.set('view engine', 'ejs');

// Configurazione middleware flash e Passport
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Configurazione protezione CSRF
const { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: (req) => req.body['_csrf'] || req.headers['x-csrf-token'],
});
app.use(csrfSynchronisedProtection);

// Rendi il token CSRF disponibile in tutte le view
app.use((req, res, next) => {
  res.locals.csrfToken = generateToken(req);
  next();
});

// Configurazione delle rotte
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/admin', adminRouter);

// Configurazione reindirizzamneto per rotta non trovata
app.use((req, res) => {
  req.flash('error', 'La pagina richiesta non è stata trovata.');
  res.redirect('/error');
});

// Error handler globale (500)
app.use((err, req, res, next) => {
  console.error('Errore interno del server:', err.message);
  if (!isProduction) {
    console.error(err.stack);
  }
  req.flash('error', 'Si è verificato un errore interno del server.');
  res.status(500).redirect('/error');
});

module.exports = app;

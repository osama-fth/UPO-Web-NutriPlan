'use strict';

const express = require('express');
const router = express.Router();
const passport = require('../middleware/passport');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const utentiDAO = require('../models/dao/utenti-dao');
const { loginLimiter, registerLimiter } = require('../middleware/rate-limiter');

// Visualizza pagina di login
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.ruolo === 'admin') {
      return res.redirect('/admin/dashboard/pazienti');
    } else {
      return res.redirect('/user/dashboard/misurazioni');
    }
  }

  res.render('pages/login', {
    title: 'NutriPlan - Login',
  });
});

// Gestisce il processo di login con validazione
router.post(
  '/login',
  loginLimiter,
  [check('email').notEmpty().isEmail(), check('password').notEmpty()],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', 'Completare tutti i campi correttamente.');
      return res.redirect('/auth/login');
    }

    // Autentica l'utente usando Passport
    passport.authenticate('local', (err, utente, info) => {
      if (err) {
        console.error("Errore durante l'autenticazione:", err);
        req.flash('error', "Si è verificato un errore durante l'accesso.");
        return res.redirect('/auth/login');
      }

      if (!utente) {
        if (info && info.message) {
          if (info.message === 'Utente non trovato.' || info.message === 'Password errata.') {
            req.flash('error', 'Email e/o password errata');
          }
        } else {
          req.flash('error', "Si è verificato un errore durante l'accesso.");
        }
        return res.redirect('/auth/login');
      }

      // Effettua il login e reindirizza in base al ruolo
      req.login(utente, (err) => {
        if (err) {
          req.flash('error', 'Errore durante il login.');
          return res.redirect('/auth/login');
        }

        req.flash('success', 'Login effettuato con successo');
        if (utente.ruolo === 'admin') {
          return res.redirect('/admin/dashboard/pazienti');
        } else {
          return res.redirect('/user/dashboard/misurazioni');
        }
      });
    })(req, res, next);
  },
);

// Gestisce il logout dell'utente
router.post('/logout', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }
  req.logout((err) => {
    if (err) {
      console.error('Errore durante il logout:', err);
      req.flash('error', 'Si è verificato un errore durante il logout.');
      return res.redirect('/auth/login');
    }
    req.flash('success', 'Logout effettuato con successo.');
    res.redirect('/auth/login');
  });
});

// Visualizza pagina di registrazione
router.get('/register', (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.ruolo === 'admin') {
      return res.redirect('/admin/dashboard/pazienti');
    } else {
      return res.redirect('/user/dashboard/misurazioni');
    }
  }

  res.render('pages/register', {
    title: 'NutriPlan - Registrazione',
    user: req.user,
    isAuth: req.isAuthenticated(),
  });
});

// Gestisce la registrazione di nuovi utenti con validazione completa
router.post(
  '/register',
  registerLimiter,
  [
    check('nome')
      .notEmpty()
      .withMessage('Il nome è obbligatorio')
      .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ]+(['\s-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/)
      .withMessage('Il nome deve contenere solo lettere')
      .isLength({ min: 3 })
      .withMessage('Il nome deve contenere almeno 3 caratteri'),
    check('cognome')
      .notEmpty()
      .withMessage('Il cognome è obbligatorio')
      .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ]+(['\s-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/)
      .withMessage('Il cognome deve contenere solo lettere')
      .isLength({ min: 3 })
      .withMessage('Il cognome deve contenere almeno 3 caratteri'),
    check('email')
      .isEmail()
      .withMessage('Inserisci un indirizzo email valido')
      .notEmpty()
      .withMessage("L'email è obbligatoria"),
    check('password')
      .isLength({ min: 8 })
      .withMessage('La password deve essere lunga almeno 8 caratteri')
      .not()
      .matches(/\s/)
      .withMessage('La password non può contenere spazi')
      .matches(/[A-Za-z]/)
      .withMessage('La password deve contenere almeno una lettera')
      .matches(/[0-9]/)
      .withMessage('La password deve contenere almeno un numero'),
    check('data_di_nascita').isDate().withMessage('Inserisci una data di nascita valida'),
    check('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Le password non coincidono');
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array());
      return res.redirect('/auth/register');
    }

    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      await utentiDAO.newUser(req.body, hashedPassword);

      req.flash('success', 'Registrazione completata con successo.');
      return res.redirect('/auth/login');
    } catch (error) {
      console.log('Errore durante la registrazione: ', error);
      req.flash('error', 'Errore durante la registrazione.');
      return res.redirect('/auth/register');
    }
  },
);

module.exports = router;

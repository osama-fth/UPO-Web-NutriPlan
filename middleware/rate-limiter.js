'use strict';

const rateLimit = require('express-rate-limit');

// Rate limiter globale: max 100 richieste per IP ogni 15 minuti
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Troppe richieste da questo indirizzo IP. Riprova tra 15 minuti.',
});

// Rate limiter specifico per login: max 5 tentativi ogni 15 minuti
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Troppi tentativi di accesso. Riprova tra 15 minuti.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter per registrazione: max 3 registrazioni ogni ora
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Troppe registrazioni. Riprova più tardi.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter per form contatti: max 5 messaggi ogni ora
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Troppi messaggi inviati. Riprova più tardi.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { globalLimiter, loginLimiter, registerLimiter, contactLimiter };

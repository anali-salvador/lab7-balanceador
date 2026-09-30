const jwt = require('jsonwebtoken');
const config = require('./config');

const TOKEN_COOKIE = 'token';
const FLASH_COOKIE = 'flash';
const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 horas

const baseCookie = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSecure,
  path: '/',
});

function signIn(res, user) {
  const token = jwt.sign({ sub: user.id, name: user.name, email: user.email }, config.jwtSecret, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
  res.cookie(TOKEN_COOKIE, token, { ...baseCookie(), maxAge: TOKEN_TTL_SECONDS * 1000 });
}

function signOut(res) {
  res.clearCookie(TOKEN_COOKIE, baseCookie());
}

// Lee el JWT (si existe) y deja el usuario disponible en req.user y en las vistas.
function loadUser(req, res, next) {
  const token = req.cookies[TOKEN_COOKIE];
  req.user = null;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = { id: payload.sub, name: payload.name, email: payload.email };
    } catch {
      signOut(res);
    }
  }
  res.locals.user = req.user;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    setFlash(res, 'warning', 'Inicia sesión para continuar.');
    return res.redirect('/login');
  }
  next();
}

function redirectIfAuth(req, res, next) {
  if (req.user) return res.redirect('/products');
  next();
}

// Mensajes flash sin estado en el servidor: viven en una cookie de un solo uso.
function setFlash(res, type, message) {
  res.cookie(FLASH_COOKIE, JSON.stringify({ type, message }), { ...baseCookie(), maxAge: 30 * 1000 });
}

function loadFlash(req, res, next) {
  res.locals.flash = null;
  const raw = req.cookies[FLASH_COOKIE];
  if (raw) {
    try {
      res.locals.flash = JSON.parse(raw);
    } catch {
      /* cookie corrupta: se ignora */
    }
    res.clearCookie(FLASH_COOKIE, baseCookie());
  }
  next();
}

module.exports = { signIn, signOut, loadUser, requireAuth, redirectIfAuth, setFlash, loadFlash };

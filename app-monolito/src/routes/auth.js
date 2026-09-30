const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { signIn, signOut, redirectIfAuth, setFlash } = require('../auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/login', redirectIfAuth, (req, res) => {
  res.render('login', { title: 'Iniciar sesión', values: {}, errors: {} });
});

router.post('/login', redirectIfAuth, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const errors = {};
  if (!email) errors.email = 'Ingresa tu correo.';
  if (!password) errors.password = 'Ingresa tu contraseña.';

  if (!Object.keys(errors).length) {
    const { rows } = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      signIn(res, user);
      setFlash(res, 'success', `¡Hola de nuevo, ${user.name}!`);
      return res.redirect('/products');
    }
    errors.form = 'Correo o contraseña incorrectos.';
  }
  res.status(400).render('login', { title: 'Iniciar sesión', values: { email }, errors });
});

router.get('/register', redirectIfAuth, (req, res) => {
  res.render('register', { title: 'Crear cuenta', values: {}, errors: {} });
});

router.post('/register', redirectIfAuth, async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const confirm = req.body.confirm || '';
  const errors = {};

  if (name.length < 2) errors.name = 'El nombre debe tener al menos 2 caracteres.';
  else if (name.length > 100) errors.name = 'El nombre es demasiado largo.';
  if (!EMAIL_RE.test(email)) errors.email = 'Ingresa un correo válido.';
  if (password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';
  if (confirm !== password) errors.confirm = 'Las contraseñas no coinciden.';

  if (!errors.email) {
    const { rowCount } = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (rowCount) errors.email = 'Ya existe una cuenta con ese correo.';
  }

  if (Object.keys(errors).length) {
    return res.status(400).render('register', { title: 'Crear cuenta', values: { name, email }, errors });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name, email, hash]
  );
  signIn(res, rows[0]);
  setFlash(res, 'success', 'Cuenta creada. ¡Bienvenido!');
  res.redirect('/products');
});

router.post('/logout', (req, res) => {
  signOut(res);
  setFlash(res, 'success', 'Sesión cerrada correctamente.');
  res.redirect('/login');
});

module.exports = router;

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { initDb } = require('./db');
const { loadUser, loadFlash } = require('./auth');

const HOSTNAME = config.serverName;
const app = express();

// Detrás de Nginx / ALB: confiar en X-Forwarded-* del primer proxy.
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');

const currency = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
app.locals.money = (n) => currency.format(Number(n));
app.locals.appName = 'Inventa';

app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Nombre del servidor que atiende cada petición (para ver el balanceo).
app.use((req, res, next) => {
  res.set('X-Served-By', HOSTNAME);
  res.locals.hostname = HOSTNAME;
  res.locals.path = req.path;
  next();
});

app.use('/health', require('./routes/health'));
app.use(loadUser);
app.use(loadFlash);

app.get('/', (req, res) => res.redirect(req.user ? '/products' : '/login'));
app.use(require('./routes/auth'));
app.use('/products', require('./routes/products'));

app.use((req, res) => {
  res.status(404).render('error', { title: 'Página no encontrada', code: 404, message: 'La página que buscas no existe.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error del servidor', code: 500, message: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
});

async function start() {
  try {
    await initDb();
  } catch (err) {
    console.error('No se pudo conectar a la base de datos tras varios intentos. Saliendo.', err.message || err.code);
    process.exit(1);
  }
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`App escuchando en http://0.0.0.0:${config.port} (host: ${HOSTNAME})`);
  });
}

start();

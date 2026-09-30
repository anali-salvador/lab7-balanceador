require('dotenv').config({ quiet: true });
const os = require('os');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lab7',
  },
  jwtSecret: process.env.JWT_SECRET,
  cookieSecure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
  // Nombre visible del servidor (pie, /health, X-Served-By). Por defecto, el hostname.
  serverName: (process.env.SERVER_NAME || '').trim() || os.hostname(),
};

if (!config.jwtSecret) {
  console.error('Falta JWT_SECRET. Defínelo en .env (debe ser el mismo en todas las instancias).');
  process.exit(1);
}

module.exports = config;

const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ ...config.db, max: 10, connectionTimeoutMillis: 5000 });

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS products (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(120) NOT NULL,
    category   VARCHAR(60)  NOT NULL,
    price      NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reintenta la conexión porque en la nube la BD puede tardar en estar disponible.
async function waitForDb({ retries = 5, delayMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log(`Conectado a PostgreSQL en ${config.db.host}:${config.db.port}/${config.db.database}`);
      return;
    } catch (err) {
      console.warn(`Intento ${attempt}/${retries}: no se pudo conectar a la BD (${err.message || err.code})`);
      if (attempt === retries) throw err;
      await sleep(delayMs);
    }
  }
}

async function initDb() {
  await waitForDb();
  await pool.query(SCHEMA);
  console.log('Tablas verificadas (users, products)');
}

module.exports = { pool, initDb, waitForDb };

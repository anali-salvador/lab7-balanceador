const express = require('express');
const { pool } = require('../db');
const config = require('../config');

const router = express.Router();

router.get('/', async (req, res) => {
  const base = { hostname: config.serverName, uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() };
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'up', ...base });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'down', error: err.message, ...base });
  }
});

module.exports = router;

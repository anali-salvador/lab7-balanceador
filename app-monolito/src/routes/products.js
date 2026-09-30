const express = require('express');
const { pool } = require('../db');
const { requireAuth, setFlash } = require('../auth');

const router = express.Router();
router.use(requireAuth);

const LOW_STOCK = 5;

function validate(body) {
  const values = {
    name: (body.name || '').trim(),
    category: (body.category || '').trim(),
    price: (body.price ?? '').toString().trim(),
    stock: (body.stock ?? '').toString().trim(),
  };
  const errors = {};

  if (!values.name) errors.name = 'El nombre es obligatorio.';
  else if (values.name.length > 120) errors.name = 'Máximo 120 caracteres.';

  if (!values.category) errors.category = 'La categoría es obligatoria.';
  else if (values.category.length > 60) errors.category = 'Máximo 60 caracteres.';

  const price = Number(values.price);
  if (values.price === '') errors.price = 'El precio es obligatorio.';
  else if (!Number.isFinite(price) || price < 0) errors.price = 'Ingresa un precio válido (0 o mayor).';
  else if (price >= 1e8) errors.price = 'El precio es demasiado alto.';

  const stock = Number(values.stock);
  if (values.stock === '') errors.stock = 'El stock es obligatorio.';
  else if (!Number.isInteger(stock) || stock < 0) errors.stock = 'El stock debe ser un número entero (0 o mayor).';
  else if (stock > 1e9) errors.stock = 'El stock es demasiado alto.';

  return { values, errors, data: { ...values, price: Math.round(price * 100) / 100, stock } };
}

async function categories() {
  const { rows } = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');
  return rows.map((r) => r.category);
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(404).render('error', { title: 'No encontrado', code: 404, message: 'Producto no encontrado.' });
    return null;
  }
  return id;
}

router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const params = [];
  let where = '';
  if (q) {
    params.push(`%${q}%`);
    where = 'WHERE name ILIKE $1 OR category ILIKE $1';
  }
  const [{ rows: products }, { rows: [stats] }] = await Promise.all([
    pool.query(`SELECT id, name, category, price, stock, updated_at FROM products ${where} ORDER BY updated_at DESC, id DESC`, params),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(stock), 0)::int AS units,
              COALESCE(SUM(price * stock), 0)::numeric(14,2) AS value,
              COUNT(*) FILTER (WHERE stock <= $1)::int AS alerts
         FROM products`,
      [LOW_STOCK]
    ),
  ]);
  res.render('products/index', { title: 'Productos', products, stats, q, LOW_STOCK });
});

router.get('/new', async (req, res) => {
  res.render('products/form', {
    title: 'Nuevo producto',
    product: null,
    values: { name: '', category: '', price: '', stock: '' },
    errors: {},
    categories: await categories(),
  });
});

router.post('/', async (req, res) => {
  const { values, errors, data } = validate(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).render('products/form', {
      title: 'Nuevo producto', product: null, values, errors, categories: await categories(),
    });
  }
  await pool.query('INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4)', [
    data.name, data.category, data.price, data.stock,
  ]);
  setFlash(res, 'success', `Producto "${data.name}" creado correctamente.`);
  res.redirect('/products');
});

router.get('/:id/edit', async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).render('error', { title: 'No encontrado', code: 404, message: 'Producto no encontrado.' });
  const p = rows[0];
  res.render('products/form', {
    title: 'Editar producto',
    product: p,
    values: { name: p.name, category: p.category, price: p.price, stock: p.stock },
    errors: {},
    categories: await categories(),
  });
});

router.post('/:id', async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const { values, errors, data } = validate(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).render('products/form', {
      title: 'Editar producto', product: { id }, values, errors, categories: await categories(),
    });
  }
  const { rowCount } = await pool.query(
    'UPDATE products SET name = $1, category = $2, price = $3, stock = $4, updated_at = NOW() WHERE id = $5',
    [data.name, data.category, data.price, data.stock, id]
  );
  if (!rowCount) return res.status(404).render('error', { title: 'No encontrado', code: 404, message: 'Producto no encontrado.' });
  setFlash(res, 'success', `Producto "${data.name}" actualizado.`);
  res.redirect('/products');
});

router.post('/:id/delete', async (req, res) => {
  const id = parseId(req, res);
  if (!id) return;
  const { rows } = await pool.query('DELETE FROM products WHERE id = $1 RETURNING name', [id]);
  if (rows[0]) setFlash(res, 'success', `Producto "${rows[0].name}" eliminado.`);
  else setFlash(res, 'warning', 'El producto ya no existía.');
  res.redirect('/products');
});

module.exports = router;

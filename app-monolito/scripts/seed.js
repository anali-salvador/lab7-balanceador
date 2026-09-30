// Carga productos de ejemplo. Uso: npm run seed
const { pool, initDb } = require('../src/db');

const PRODUCTS = [
  ['Laptop Lenovo IdeaPad 5 14"', 'Computadoras', 2899.0, 12],
  ['Monitor LG UltraGear 27" 144Hz', 'Monitores', 1149.9, 7],
  ['Teclado mecánico Logitech G413', 'Periféricos', 329.0, 4],
  ['Mouse inalámbrico Logitech MX Master 3S', 'Periféricos', 459.0, 18],
  ['Audífonos Sony WH-1000XM5', 'Audio', 1599.0, 2],
  ['SSD Kingston NV2 1TB NVMe', 'Almacenamiento', 239.9, 25],
  ['Router TP-Link Archer AX55 WiFi 6', 'Redes', 389.0, 0],
  ['Webcam Logitech C920 Full HD', 'Periféricos', 279.0, 9],
];

async function seed() {
  await initDb();
  let inserted = 0;
  for (const [name, category, price, stock] of PRODUCTS) {
    const { rowCount } = await pool.query(
      `INSERT INTO products (name, category, price, stock)
       SELECT $1::varchar, $2::varchar, $3::numeric, $4::int WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = $1::varchar)`,
      [name, category, price, stock]
    );
    inserted += rowCount;
  }
  console.log(`Seed completado: ${inserted} productos nuevos (${PRODUCTS.length - inserted} ya existían).`);
}

seed()
  .catch((err) => {
    console.error('Error en el seed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

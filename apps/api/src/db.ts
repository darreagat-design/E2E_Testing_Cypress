import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const seedProducts = [
  { id: 1, name: 'Café americano', description: 'Café de origen, intenso y recién preparado.', price: 15, stock: 20, category: 'Café' },
  { id: 2, name: 'Capuchino', description: 'Espresso, leche cremosa y una nube de espuma.', price: 22, stock: 15, category: 'Café' },
  { id: 3, name: 'Croissant', description: 'Hojaldre dorado, mantequilloso y recién horneado.', price: 18, stock: 12, category: 'Panadería' },
  { id: 4, name: 'Té chai', description: 'Té negro con especias aromáticas y leche.', price: 20, stock: 10, category: 'Té' },
];

const databasePath = resolve(process.env.DATABASE_PATH || './data/cafe-central.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });
export const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price > 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    category TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total INTEGER NOT NULL CHECK (total >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal INTEGER NOT NULL
  );
`);

const seed = db.transaction(() => {
  const insert = db.prepare(`INSERT OR IGNORE INTO products (id, name, description, price, stock, category)
    VALUES (@id, @name, @description, @price, @stock, @category)`);
  seedProducts.forEach((product) => insert.run(product));
});
seed();

export function resetDatabase() {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM order_items').run();
    db.prepare('DELETE FROM orders').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run('orders');
    const insert = db.prepare(`INSERT INTO products (id, name, description, price, stock, category)
      VALUES (@id, @name, @description, @price, @stock, @category)`);
    seedProducts.forEach((product) => insert.run(product));
  });
  reset();
}

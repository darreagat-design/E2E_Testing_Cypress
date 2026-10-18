import 'dotenv/config';
import express from 'express';
import { db, resetDatabase } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3000);
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/products', (_req, res) => {
  const products = db.prepare('SELECT id, name, description, price, stock, category FROM products ORDER BY id').all();
  res.json(products);
});

app.post('/api/orders', (req, res) => {
  const items: unknown = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Agrega al menos un producto para confirmar el pedido.' });
  }

  const merged = new Map<number, number>();
  for (const item of items) {
    const productId = item?.productId;
    const quantity = item?.quantity;
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Cada producto debe tener un identificador y una cantidad entera positiva.' });
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  try {
    const createOrder = db.transaction(() => {
      const getProduct = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?');
      const lines = [...merged.entries()].map(([id, quantity]) => {
        const product = getProduct.get(id) as { id: number; name: string; price: number; stock: number } | undefined;
        if (!product) throw new Error(`El producto #${id} ya no está disponible.`);
        if (quantity > product.stock) throw new Error(`Stock insuficiente para ${product.name}. Disponibles: ${product.stock}.`);
        return { ...product, quantity, subtotal: product.price * quantity };
      });
      const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
      const result = db.prepare('INSERT INTO orders (total) VALUES (?)').run(total);
      const orderId = Number(result.lastInsertRowid);
      const insertItem = db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)`);
      const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?');
      for (const line of lines) {
        insertItem.run(orderId, line.id, line.name, line.price, line.quantity, line.subtotal);
        const changed = updateStock.run(line.quantity, line.id, line.quantity);
        if (changed.changes !== 1) throw new Error(`Stock insuficiente para ${line.name}.`);
      }
      return { id: orderId, total };
    });
    return res.status(201).json(createOrder());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar el pedido.';
    return res.status(409).json({ error: message });
  }
});

app.get('/api/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Identificador de pedido inválido.' });
  const order = db.prepare('SELECT id, total, created_at AS createdAt FROM orders WHERE id = ?').get(id) as
    { id: number; total: number; createdAt: string } | undefined;
  if (!order) return res.status(404).json({ error: 'No encontramos ese pedido.' });
  const items = db.prepare(`SELECT product_id AS productId, product_name AS name, unit_price AS unitPrice,
    quantity, subtotal FROM order_items WHERE order_id = ? ORDER BY id`).all(id);
  return res.json({ ...order, items });
});

if (process.env.NODE_ENV === 'testing') {
  app.post('/api/test/reset', (_req, res) => {
    try {
      resetDatabase();
      return res.json({ status: 'ok', message: 'Base de datos restablecida.' });
    } catch {
      return res.status(500).json({ error: 'No se pudo restablecer la base de datos.' });
    }
  });
}

app.listen(port, () => console.log(`Café Central API escuchando en http://localhost:${port} (${process.env.NODE_ENV || 'development'})`));

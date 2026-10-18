import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Coffee, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

type Product = { id: number; name: string; description: string; price: number; stock: number; category: string };
type CartItem = { product: Product; quantity: number };
type OrderConfirmation = { id: number; total: number };

const money = (amount: number) => `Q${amount.toFixed(2)}`;
const illustrations: Record<number, string> = {
  1: '☕', 2: '🥛', 3: '🥐', 4: '🫖',
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadProducts() {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('No pudimos cargar el menú. Intenta actualizar la página.');
      setProducts(await response.json());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos conectar con la cafetería.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadProducts(); }, []);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function changeQuantity(product: Product, delta: number) {
    setError(''); setConfirmation(null);
    setCart((items) => {
      const current = items.find((item) => item.product.id === product.id)?.quantity || 0;
      const next = current + delta;
      if (!Number.isInteger(next) || next < 0 || next > product.stock) return items;
      if (next === 0) return items.filter((item) => item.product.id !== product.id);
      if (current === 0) return [...items, { product, quantity: next }];
      return items.map((item) => item.product.id === product.id ? { ...item, quantity: next } : item);
    });
  }

  async function submitOrder() {
    if (cart.length === 0 || submitting) return;
    if (cart.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > item.product.stock)) {
      setError('Revisa las cantidades: deben ser enteras y no superar las existencias.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map(({ product, quantity }) => ({ productId: product.id, quantity })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo confirmar tu pedido. Intenta de nuevo.');
      setConfirmation(result); setCart([]); await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar tu pedido. Intenta de nuevo.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Café Central, inicio"><span className="brand-icon"><Coffee size={19} /></span><span>Café <b>Central</b></span></a>
        <nav aria-label="Navegación principal"><a className="nav-link active" href="#menu">Menú</a><a className="nav-link" href="#carrito">Tu pedido</a></nav>
        <a className="cart-shortcut" href="#carrito" data-cy="cart-shortcut"><ShoppingBag size={17} /><span>Mi pedido</span>{itemCount > 0 && <i>{itemCount}</i>}</a>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><span></span> HECHO CON CALMA, SERVIDO CON CARIÑO</div><h1>Un buen día<br />empieza <em>aquí.</em></h1><p>Café recién hecho, algo rico y un momento solo para ti.</p><a className="hero-cta" href="#menu">Descubre el menú <ArrowRight size={16} /></a></div>
          <div className="hero-art" aria-hidden="true"><div className="sun"></div><div className="hero-note">tu pausa<br />favorita</div><div className="cup"><div className="cup-coffee"></div><div className="cup-handle"></div><div className="cup-shadow"></div></div><span className="spark spark-one">✳</span><span className="spark spark-two">✳</span><div className="hero-caption">UNA TAZA A LA VEZ</div></div>
        </section>

        <div className="content-grid" id="menu">
          <section className="menu-section" aria-labelledby="menu-title"><div className="section-heading"><div><span className="eyebrow muted">NUESTROS FAVORITOS</span><h2 id="menu-title">El menú</h2></div><span className="menu-count">{products.length || 4} opciones</span></div>
            {error && !cart.length && !confirmation && <div className="notice error" data-cy="error-message">{error}<button onClick={() => void loadProducts()}>Reintentar</button></div>}
            {loading ? <div className="loading">Preparando el menú…</div> : <div className="product-grid" data-cy="product-list">{products.map((product) => {
              const quantity = cart.find((item) => item.product.id === product.id)?.quantity || 0;
              return <article className="product-card" key={product.id} data-cy="product-card" data-product-id={product.id}>
                <div className={`product-art art-${product.id}`}><span className="product-emoji" aria-hidden="true">{illustrations[product.id] || '☕'}</span><span className="category-tag">{product.category}</span></div>
                <div className="product-info"><div className="product-title"><h3>{product.name}</h3><strong>{money(product.price)}</strong></div><p>{product.description}</p><div className="product-actions"><span className={product.stock <= 3 ? 'stock low' : 'stock'} data-cy="product-stock">{product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}</span>{quantity === 0 ? <button className="add-button" data-cy="add-to-cart" disabled={product.stock === 0} onClick={() => changeQuantity(product, 1)} aria-label={`Agregar ${product.name}`}><Plus size={16} /></button> : <div className="mini-stepper"><button onClick={() => changeQuantity(product, -1)} aria-label={`Quitar uno de ${product.name}`}><Minus size={14} /></button><span>{quantity}</span><button disabled={quantity >= product.stock} onClick={() => changeQuantity(product, 1)} aria-label={`Agregar uno de ${product.name}`}><Plus size={14} /></button></div>}</div></div>
              </article>;
            })}</div>}
          </section>

          <aside className="order-panel" id="carrito" aria-labelledby="order-title"><div className="order-heading"><div><span className="eyebrow muted">PARA DISFRUTAR</span><h2 id="order-title">Tu pedido</h2></div><span className="order-count" data-cy="cart-count">{itemCount}</span></div>
            {confirmation ? <div className="success-state" data-cy="order-success"><div className="success-icon"><Check size={22} /></div><span className="eyebrow muted">¡PEDIDO CONFIRMADO!</span><h3>Ya estamos en ello.</h3><p>Gracias por elegir Café Central. Preparamos todo con cariño.</p><div className="confirmation-detail"><span>Número de pedido</span><strong data-cy="order-id">#{confirmation.id}</strong></div><div className="confirmation-total"><span>Total pagado</span><strong data-cy="order-total">{money(confirmation.total)}</strong></div><button className="new-order" onClick={() => setConfirmation(null)}>Hacer otro pedido <ArrowRight size={15} /></button></div> : <>
              {cart.length === 0 ? <div className="empty-cart" data-cy="empty-cart"><div className="empty-icon"><ShoppingBag size={20} /></div><p>Tu pedido está esperando<br />algo rico.</p><span>Agrega tus favoritos del menú.</span></div> : <div className="cart-items" data-cy="cart-items">{cart.map(({ product, quantity }) => <div className="cart-row" key={product.id} data-cy="cart-item"><div className={`cart-thumb art-${product.id}`}>{illustrations[product.id]}</div><div className="cart-details"><strong>{product.name}</strong><span>{money(product.price)} c/u</span><div className="stepper"><button aria-label={`Disminuir ${product.name}`} onClick={() => changeQuantity(product, -1)}><Minus size={13} /></button><span data-cy="cart-quantity">{quantity}</span><button aria-label={`Aumentar ${product.name}`} disabled={quantity >= product.stock} onClick={() => changeQuantity(product, 1)}><Plus size={13} /></button></div></div><div className="cart-price"><strong>{money(product.price * quantity)}</strong><button aria-label={`Eliminar ${product.name}`} data-cy="remove-item" onClick={() => changeQuantity(product, -quantity)}><Trash2 size={15} /></button></div></div>)}</div>}
              <div className="order-bottom"><div className="subtotal-row"><span>Subtotal</span><span data-cy="subtotal">{money(total)}</span></div><div className="total-row"><strong>Total</strong><strong data-cy="cart-total">{money(total)}</strong></div><p className="tax-note">Impuestos incluidos</p>{error && cart.length > 0 && <div className="notice error" data-cy="error-message">{error}</div>}<button className="checkout-button" data-cy="confirm-order" onClick={() => void submitOrder()} disabled={cart.length === 0 || submitting}>{submitting ? 'Confirmando…' : <>Confirmar pedido <ArrowRight size={17} /></>}</button>{cart.length === 0 && <p className="disabled-hint" data-cy="confirm-hint">Agrega un producto para continuar</p>}</div>
            </>}
          </aside>
        </div>
      </main>
      <footer><span className="footer-brand">Café Central</span><span>Un buen café hace buenos momentos.</span><span>Guatemala · Hecho con cariño</span></footer>
    </div>
  );
}

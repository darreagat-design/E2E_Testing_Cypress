import { useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type ProductId = 'americano' | 'capuchino' | 'croissant' | 'chai';
type Screen = 'catalog' | 'detail' | 'cart' | 'success';
type Product = {
  id: ProductId;
  name: string;
  price: number;
  description: string;
};
type Cart = Partial<Record<ProductId, number>>;

const products: Product[] = [
  {
    id: 'americano',
    name: 'Café americano',
    price: 15,
    description: 'Café de origen, intenso y recién preparado.',
  },
  {
    id: 'capuchino',
    name: 'Capuchino',
    price: 22,
    description: 'Espresso, leche cremosa y una nube de espuma.',
  },
  {
    id: 'croissant',
    name: 'Croissant',
    price: 18,
    description: 'Hojaldre dorado, mantequilloso y recién horneado.',
  },
  {
    id: 'chai',
    name: 'Té chai',
    price: 20,
    description: 'Té negro con especias aromáticas y leche.',
  },
];

function money(amount: number): string {
  return `Q${amount.toFixed(2)}`;
}

function ActionButton({
  label,
  onPress,
  testID,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('catalog');
  const [cart, setCart] = useState<Cart>({});
  const [selectedProductId, setSelectedProductId] = useState<ProductId>('americano');
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; total: number } | null>(null);
  const [addedMessage, setAddedMessage] = useState('');

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + (quantity ?? 0), 0);
  const cartTotal = products.reduce(
    (sum, product) => sum + product.price * (cart[product.id] ?? 0),
    0,
  );
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'catalog') return false;
      setAddedMessage('');
      setScreen('catalog');
      return true;
    });
    return () => subscription.remove();
  }, [screen]);

  function addProduct(productId: ProductId) {
    setCart((current) => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1,
    }));
    setAddedMessage('Producto agregado al carrito');
  }

  function changeQuantity(productId: ProductId, change: number) {
    setCart((current) => {
      const nextQuantity = (current[productId] ?? 0) + change;
      const next = { ...current };
      if (nextQuantity <= 0) delete next[productId];
      else next[productId] = nextQuantity;
      return next;
    });
  }

  function confirmOrder() {
    if (cartCount === 0) return;
    setConfirmedOrder({ id: '#1', total: cartTotal });
    setCart({});
    setAddedMessage('');
    setScreen('success');
  }

  function openDetail(productId: ProductId) {
    setSelectedProductId(productId);
    setAddedMessage('');
    setScreen('detail');
  }

  function backToCatalog() {
    setAddedMessage('');
    setScreen('catalog');
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fbf8f3" />
        {screen === 'catalog' && (
          <ScrollView contentContainerStyle={styles.page} testID="catalog-screen">
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>TU PAUSA FAVORITA</Text>
                <Text style={styles.title}>Café Central</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir carrito, ${cartCount} productos`}
                onPress={() => setScreen('cart')}
                testID="cart-button"
                style={styles.cartButton}
              >
                <Text style={styles.cartButtonText}>Carrito</Text>
                <Text accessibilityLabel={`${cartCount} productos`} testID="cart-count" style={styles.cartCount}>
                  {cartCount}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.intro}>Café recién hecho y algo rico para acompañar.</Text>
            <Text style={styles.sectionTitle}>Nuestro menú</Text>

            {products.map((product) => (
              <View key={product.id} style={styles.productCard} testID={`product-${product.id}`}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{money(product.price)}</Text>
                </View>
                <View style={styles.productActions}>
                  <ActionButton
                    label="Ver detalle"
                    onPress={() => openDetail(product.id)}
                    testID={`view-detail-${product.id}`}
                    secondary
                  />
                  <ActionButton
                    label="Agregar"
                    onPress={() => addProduct(product.id)}
                    testID={`add-${product.id}`}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {screen === 'detail' && (
          <ScrollView contentContainerStyle={styles.page} testID={`detail-${selectedProduct.id}`}>
            <ActionButton label="Volver al catálogo" onPress={backToCatalog} testID="back-button" secondary />
            <View style={styles.detailCard}>
              <Text style={styles.eyebrow}>DETALLE DEL PRODUCTO</Text>
              <Text style={styles.detailTitle}>{selectedProduct.name}</Text>
              <Text style={styles.detailPrice}>{money(selectedProduct.price)}</Text>
              <Text style={styles.detailDescription}>{selectedProduct.description}</Text>
              <ActionButton
                label="Agregar al carrito"
                onPress={() => addProduct(selectedProduct.id)}
                testID={`add-${selectedProduct.id}`}
              />
              {addedMessage !== '' && <Text style={styles.successHint}>{addedMessage}</Text>}
            </View>
          </ScrollView>
        )}

        {screen === 'cart' && (
          <ScrollView contentContainerStyle={styles.page} testID="cart-screen">
            <ActionButton label="Volver al catálogo" onPress={backToCatalog} testID="back-button" secondary />
            <Text style={styles.title}>Tu carrito</Text>
            {cartCount === 0 ? (
              <Text accessibilityRole="text" style={styles.emptyMessage} testID="empty-cart-message">
                Agrega un producto para continuar
              </Text>
            ) : (
              products
                .filter((product) => (cart[product.id] ?? 0) > 0)
                .map((product) => (
                  <View key={product.id} style={styles.cartRow}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.mutedText}>
                        {cart[product.id]} × {money(product.price)}
                      </Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar uno de ${product.name}`}
                        onPress={() => changeQuantity(product.id, -1)}
                        testID={`decrease-${product.id}`}
                        style={styles.quantityButton}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </Pressable>
                      <Text accessibilityLabel={`Cantidad ${cart[product.id]}`} style={styles.quantityText}>
                        {cart[product.id]}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Agregar uno más de ${product.name}`}
                        onPress={() => changeQuantity(product.id, 1)}
                        testID={`increase-${product.id}`}
                        style={styles.quantityButton}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount} testID="cart-total">{money(cartTotal)}</Text>
            </View>
            <ActionButton
              label="Confirmar pedido"
              onPress={confirmOrder}
              testID="confirm-order"
              disabled={cartCount === 0}
            />
          </ScrollView>
        )}

        {screen === 'success' && confirmedOrder !== null && (
          <View style={[styles.page, styles.successScreen]} testID="order-success">
            <Text style={styles.eyebrow}>PEDIDO CONFIRMADO</Text>
            <Text style={styles.title}>¡Gracias por tu pedido!</Text>
            <Text style={styles.successOrderId} testID="order-id">{confirmedOrder.id}</Text>
            <Text style={styles.detailDescription}>Total: {money(confirmedOrder.total)}</Text>
            <ActionButton label="Volver al catálogo" onPress={backToCatalog} testID="back-button" />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fbf8f3' },
  page: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 32, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#916746', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#30241d', fontSize: 29, fontWeight: '800' },
  intro: { color: '#6f635a', fontSize: 15, lineHeight: 22, marginBottom: 8 },
  sectionTitle: { color: '#30241d', fontSize: 20, fontWeight: '700' },
  productCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eee5da',
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  productInfo: { flex: 1, gap: 5 },
  productName: { color: '#30241d', fontSize: 17, fontWeight: '700' },
  productPrice: { color: '#785333', fontSize: 15, fontWeight: '700' },
  productActions: { flexDirection: 'row', gap: 10 },
  button: {
    alignItems: 'center',
    backgroundColor: '#714c31',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { backgroundColor: '#efe7de' },
  secondaryButtonText: { color: '#60452f' },
  disabledButton: { backgroundColor: '#c9c1ba' },
  pressedButton: { opacity: 0.76 },
  cartButton: {
    alignItems: 'center',
    backgroundColor: '#efe7de',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cartButtonText: { color: '#60452f', fontWeight: '700' },
  cartCount: {
    backgroundColor: '#714c31',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 22,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eee5da',
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    marginTop: 16,
    padding: 22,
  },
  detailTitle: { color: '#30241d', fontSize: 28, fontWeight: '800' },
  detailPrice: { color: '#785333', fontSize: 22, fontWeight: '700' },
  detailDescription: { color: '#6f635a', fontSize: 16, lineHeight: 24 },
  successHint: { color: '#3e7951', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  emptyMessage: {
    backgroundColor: '#ffffff',
    borderColor: '#eee5da',
    borderRadius: 14,
    borderWidth: 1,
    color: '#6f635a',
    fontSize: 15,
    padding: 18,
  },
  cartRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eee5da',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 14,
  },
  mutedText: { color: '#76695e', fontSize: 14 },
  quantityControls: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  quantityButton: {
    alignItems: 'center',
    backgroundColor: '#efe7de',
    borderRadius: 18,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  quantityButtonText: { color: '#60452f', fontSize: 20, fontWeight: '700' },
  quantityText: { color: '#30241d', fontSize: 15, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  totalRow: {
    alignItems: 'center',
    borderTopColor: '#ded3c7',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 18,
  },
  totalLabel: { color: '#30241d', fontSize: 19, fontWeight: '700' },
  totalAmount: { color: '#30241d', fontSize: 21, fontWeight: '800' },
  successScreen: { alignItems: 'center', justifyContent: 'center' },
  successOrderId: { color: '#785333', fontSize: 40, fontWeight: '800' },
});

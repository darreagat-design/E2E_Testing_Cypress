export interface OrderItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  total: number;
  items: OrderItem[];
}

/** Client for reading persisted orders. A missing order is represented by null. */
export class OrdersClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getOrder(id: number): Promise<Order | null> {
    const response = await fetch(`${this.baseUrl}/api/orders/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`No se pudo consultar el pedido (HTTP ${response.status}).`);
    }
    return (await response.json()) as Order;
  }
}

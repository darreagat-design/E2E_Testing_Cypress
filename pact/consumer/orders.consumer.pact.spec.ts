import { MatchersV2, Pact } from '@pact-foundation/pact';
import { describe, expect, it } from 'vitest';
import { OrdersClient } from '../../apps/web/src/api/ordersClient.js';

const pact = new Pact({
  consumer: 'CafeCentralWeb',
  provider: 'CafeCentralApi',
  dir: 'pacts',
});

describe('CafeCentralWeb consumer contract for orders', () => {
  it('returns an existing order with its total and product details', async () => {
    await pact
      .addInteraction()
      .given('an order with id 1 exists')
      .uponReceiving('a request for order 1')
      .withRequest('GET', '/api/orders/1')
      .willRespondWith(200, (builder) =>
        builder
          .headers({ 'Content-Type': 'application/json' })
          .jsonBody({
            id: MatchersV2.integer(1),
            total: MatchersV2.integer(30),
            items: MatchersV2.eachLike({
              productId: MatchersV2.integer(1),
              name: MatchersV2.string('Café americano'),
              unitPrice: MatchersV2.integer(15),
              quantity: MatchersV2.integer(2),
              subtotal: MatchersV2.integer(30),
            }),
          }),
      )
      .executeTest(async (mockServer) => {
        const client = new OrdersClient(mockServer.url);
        const order = await client.getOrder(1);

        expect(order).not.toBeNull();
        expect(order?.id).toBe(1);
        expect(order?.total).toBe(30);
        expect(order?.items[0]).toMatchObject({
          name: 'Café americano',
          quantity: 2,
        });
      });
  });

  it('returns null when the requested order does not exist', async () => {
    await pact
      .addInteraction()
      .given('an order with id 999 does not exist')
      .uponReceiving('a request for missing order 999')
      .withRequest('GET', '/api/orders/999')
      .willRespondWith(404, (builder) =>
        builder
          .headers({ 'Content-Type': 'application/json' })
          .jsonBody({ error: 'No encontramos ese pedido.' }),
      )
      .executeTest(async (mockServer) => {
        const client = new OrdersClient(mockServer.url);
        await expect(client.getOrder(999)).resolves.toBeNull();
      });
  });
});

type OrderResponse = {
  id: number;
  total: number;
};

describe('Pedidos de Café Central', () => {
  beforeEach(() => {
    cy.request('POST', 'http://localhost:3000/api/test/reset')
      .its('status')
      .should('eq', 200);

    cy.visit('/');
    cy.get('[data-cy="product-list"]').should('be.visible');
  });

  it('completa un pedido y comprueba sus datos persistidos', () => {
    cy.intercept('POST', '/api/orders').as('createOrder');

    cy.get('button[aria-label="Agregar Café americano"]').click();
    cy.get('button[aria-label="Agregar uno de Café americano"]').click();
    cy.get('button[aria-label="Agregar Croissant"]').click();

    cy.contains('[data-cy="cart-item"]', 'Café americano')
      .find('[data-cy="cart-quantity"]')
      .should('have.text', '2');
    cy.contains('[data-cy="cart-item"]', 'Croissant')
      .find('[data-cy="cart-quantity"]')
      .should('have.text', '1');
    cy.get('[data-cy="cart-total"]').should('have.text', 'Q48.00');

    cy.get('[data-cy="confirm-order"]').click();

    cy.wait('@createOrder').then(({ request, response }) => {
      expect(request.method).to.equal('POST');
      expect(request.url).to.include('/api/orders');
      expect(request.body).to.deep.equal({
        items: [
          { productId: 1, quantity: 2 },
          { productId: 3, quantity: 1 },
        ],
      });
      expect(response, 'respuesta de creación de orden').to.exist;
      if (!response) return;

      expect(response.statusCode).to.equal(201);
      expect(response.body.total).to.equal(48);
      const order = response.body as OrderResponse;

      cy.get('[data-cy="order-success"]').should('be.visible');
      cy.get('[data-cy="order-id"]').should('have.text', `#${order.id}`);
      cy.get('[data-cy="order-total"]').should('have.text', 'Q48.00');

      cy.request(`http://localhost:3000/api/orders/${order.id}`).then(({ status, body }) => {
        expect(status).to.equal(200);
        expect(body.id).to.equal(order.id);
        expect(body.total).to.equal(48);
        expect(body.items).to.deep.include({
          productId: 1,
          name: 'Café americano',
          unitPrice: 15,
          quantity: 2,
          subtotal: 30,
        });
        expect(body.items).to.deep.include({
          productId: 3,
          name: 'Croissant',
          unitPrice: 18,
          quantity: 1,
          subtotal: 18,
        });
      });
    });
  });

  it('mantiene bloqueada la confirmación y no envía un pedido vacío', () => {
    cy.intercept('POST', '/api/orders').as('createOrder');

    cy.get('[data-cy="empty-cart"]').should('be.visible');
    cy.get('[data-cy="confirm-order"]').should('be.disabled');
    cy.get('[data-cy="confirm-hint"]')
      .should('be.visible')
      .and('contain.text', 'Agrega un producto para continuar');
    cy.get('@createOrder.all').should('have.length', 0);
  });

  it('conserva el carrito tras un error 500 y permite reintentar', () => {
    cy.intercept(
      { method: 'POST', url: '/api/orders', times: 1 },
      {
        statusCode: 500,
        body: { error: 'Fallo simulado al crear el pedido.' },
      },
    ).as('createOrderFailure');

    cy.get('button[aria-label="Agregar Café americano"]').click();
    cy.get('button[aria-label="Agregar uno de Café americano"]').click();
    cy.get('[data-cy="cart-total"]').should('have.text', 'Q30.00');
    cy.get('[data-cy="confirm-order"]').click();

    cy.wait('@createOrderFailure').then(({ response }) => {
      expect(response?.statusCode).to.equal(500);
      expect(response?.body.error).to.equal('Fallo simulado al crear el pedido.');
    });

    cy.get('[data-cy="error-message"]')
      .should('be.visible')
      .and('contain.text', 'Fallo simulado al crear el pedido.');
    cy.get('[data-cy="cart-items"]').should('be.visible');
    cy.get('[data-cy="cart-item"]').should('contain.text', 'Café americano');
    cy.get('[data-cy="cart-quantity"]').should('have.text', '2');
    cy.get('[data-cy="cart-total"]').should('have.text', 'Q30.00');

    cy.intercept('POST', '/api/orders').as('createOrderRetry');
    cy.get('[data-cy="confirm-order"]').click();

    cy.wait('@createOrderRetry').then(({ response }) => {
      expect(response?.statusCode).to.equal(201);
      expect(response?.body.total).to.equal(30);
      expect(response).to.exist;
      if (!response) return;
      expect(response.body.id).to.be.a('number');

      cy.get('[data-cy="order-id"]').should('have.text', `#${response.body.id}`);
    });
    cy.get('[data-cy="order-success"]').should('be.visible');
    cy.get('[data-cy="order-total"]').should('have.text', 'Q30.00');
  });
});

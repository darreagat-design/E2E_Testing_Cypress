describe('Café Central', () => {
  it('abre la aplicación y muestra el catálogo', () => {
    cy.visit('/');

    cy.contains('a.brand', 'Café Central').should('be.visible');
    cy.get('[data-cy="product-list"]').should('be.visible');
    cy.get('[data-cy="product-card"]').should('have.length.at.least', 4);
  });
});

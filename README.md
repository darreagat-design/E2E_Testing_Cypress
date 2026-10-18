# Café Central

Aplicación sencilla de pedidos para cafetería. El frontend usa React, Vite y TypeScript; la API usa Node.js, Express y TypeScript; SQLite guarda productos, órdenes y detalles mediante `better-sqlite3`. El workspace se administra con pnpm.

## Requisitos

- Node.js 20 o superior
- pnpm 9 o superior

## Instalar y ejecutar

Desde la raíz del repositorio:

```bash
pnpm install:all
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173). Vite reenvía `/api` a la API en `http://localhost:3000`. La base se crea automáticamente en `data/cafe-central.sqlite`.

Para compilar ambos proyectos:

```bash
pnpm build
```

Para ejecutar solo la API ya compilada: `pnpm start`.

## API

- `GET /api/products`: catálogo y existencias actuales.
- `POST /api/orders`: acepta `{ "items": [{ "productId": 1, "quantity": 2 }] }`. Valida cantidades y stock, guarda orden y detalles en una transacción, descuenta existencias y devuelve `{ "id": 1, "total": 30 }`.
- `GET /api/orders/:id`: devuelve la orden persistida con sus detalles.
- `GET /api/health`: estado básico de la API.
- `POST /api/test/reset`: restaura catálogo, existencias y órdenes en una transacción. La ruta solo se registra cuando `NODE_ENV=testing`.

## Entornos

`.env.example`, `.env.testing.example` y `.env.ci.example` documentan valores de desarrollo, testing local y CI futuro; no se cargan automáticamente y no incluyen secretos. Para habilitar el reset local, configura `NODE_ENV=testing` y `DATABASE_PATH=./data/cafe-central-testing.sqlite` antes de iniciar la API. En producción usa `NODE_ENV=production`; el endpoint de reset no estará disponible. Los archivos de base de datos están excluidos de Git.

La suite E2E actual contiene una prueba smoke y tres recorridos de pedidos descritos abajo.

## Cypress E2E

Instala las dependencias con `pnpm install:all`. Para iniciar el frontend y la API con `NODE_ENV=testing` (incluido el endpoint `POST /api/test/reset`), ejecuta desde la raiz:

```bash
pnpm dev:test
```

Con ambos servidores activos, abre el runner interactivo con `pnpm cy:open` o ejecuta las pruebas en modo headless con `pnpm cy:run`.

La suite incluye el smoke del catalogo y tres recorridos de pedidos: confirmacion exitosa con verificacion de persistencia por API, carrito vacio sin POST y fallo HTTP 500 con conservacion del carrito y reintento exitoso. Cada prueba restablece productos, stock y ordenes con `POST /api/test/reset` en `beforeEach()`. El fallo controlado se simula con `cy.intercept()` y las pruebas no usan esperas numericas.

## Integracion continua

El workflow de GitHub Actions se ejecuta en cada `push`, `pull_request` y cuando se inicia manualmente. Instala con pnpm usando el lockfile, compila con `pnpm build`, inicia frontend y API con `pnpm dev:test` (API en modo `testing`), espera a que respondan el frontend y la API y ejecuta Cypress. Si el job falla, guarda screenshots y videos de Cypress como artifacts para revisar el fallo.

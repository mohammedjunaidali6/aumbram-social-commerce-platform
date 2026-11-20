# Aumbram – Story-to-Checkout

Aumbram is a React-based shopping experience that allows customers to discover products through stories, add products to their cart, check delivery availability, and complete a vendor-aware checkout.

The application connects a React frontend with a Node.js and Express backend to handle product discovery, checkout quotes, delivery serviceability, and order management. PostgreSQL is used for order persistence.

## Features

- **Story Feed:** Browse stories and discover products through creator content.
- **Product Discovery:** View product details, prices, available variants, and stock.
- **Story Attribution:** Preserve story, creator, and product attribution throughout the shopping journey.
- **Shopping Cart:** Add, remove, and update product quantities.
- **Vendor Grouping:** Organize cart items by vendor.
- **Checkout:** Enter delivery details and validate pincodes.
- **Delivery Serviceability:** Check delivery availability for individual vendors.
- **Shipping Calculation:** Calculate shipping charges based on cart value.
- **Cash on Delivery:** Check COD eligibility.
- **Order Management:** Create orders and view order confirmation details.
- **Idempotent Orders:** Prevent duplicate order creation using idempotency keys.
- **Internationalization:** Support multiple languages.
- **Responsive UI:** Support desktop and mobile layouts.

## Tech Stack

### Frontend

- React 19
- JavaScript (ES Modules and JSX)
- Vite
- Tailwind CSS
- Zustand
- React Router
- Axios
- i18next
- react-i18next
- Lucide React

### Backend

- Node.js
- Express.js
- PostgreSQL
- node-postgres (`pg`)
- CORS
- dotenv

### Testing and Code Quality

- Vitest
- React Testing Library
- Playwright
- ESLint

## Project Structure

```text
aumbram-frontend/
├── e2e/                         # Playwright end-to-end tests
├── server/
│   ├── src/
│   │   ├── config/              # Database configuration
│   │   ├── controllers/         # Order controllers
│   │   ├── data/                # Catalog and mock data
│   │   ├── routes/              # API routes
│   │   ├── tests/               # Backend tests
│   │   └── server.js            # Express entry point
│   ├── package.json
│   └── .env                     # Backend environment variables
├── src/
│   ├── components/              # Reusable UI components
│   ├── pages/                   # Application pages
│   ├── services/                # API services
│   ├── store/                   # Zustand stores
│   ├── tests/                   # Test setup
│   └── App.jsx
├── public/
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## Installation and Setup

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- PostgreSQL

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd aumbram-frontend
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
```

### 4. Configure environment variables

Create a `.env` file inside the `server` directory.

Add your PostgreSQL connection details:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=aumbram
DB_USER=postgres
DB_PASSWORD=your_password
```

Replace the example database credentials with your local PostgreSQL configuration.

Do not commit `.env` files or database credentials to GitHub.

### 5. Configure PostgreSQL

Create the database:

```sql
CREATE DATABASE aumbram;
```

The backend expects an `orders` table with the columns used by the order controller:

- `order_id`
- `idempotency_key`
- `request_hash`
- `vendor`
- `items`
- `subtotal`
- `shipping`
- `total`
- `address`
- `payment_method`
- `status`
- `created_at`

The `idempotency_key` column must have a UNIQUE constraint to support duplicate-request protection. The JSON fields `items` and `address` should use PostgreSQL `JSONB`.

The application code does not automatically create this table. Make sure the table and its required defaults are configured before creating orders.

### 6. Start the backend

Open a terminal:

```bash
cd server
npm run dev
```

Backend URL:

`http://localhost:5000`

Health check:

`http://localhost:5000/api/health`

Expected response:

```json
{
  "success": true,
  "message": "Aumbram backend is running"
}
```

### 7. Start the frontend

Open another terminal in the project root:

```bash
npm run dev
```

Frontend URL:

`http://localhost:5173`

## Available Scripts

### Frontend

Run these commands from the project root.

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run frontend tests once |
| `npm run test:e2e` | Run Playwright end-to-end tests |

### Backend

Run these commands from the `server` directory.

| Command | Description |
|---|---|
| `npm run dev` | Start backend using Nodemon |
| `npm start` | Start backend |
| `npm test` | Run backend Node.js tests |

## Application Architecture

The application follows a frontend/backend architecture.

### Frontend

- React components manage the user interface.
- Zustand manages cart state.
- Axios communicates with backend APIs.
- React Router handles application navigation.
- i18next manages translations.
- Story attribution is preserved during the shopping journey.

### Backend

- Express handles API requests.
- Catalog routes manage product and checkout operations.
- Checkout logic validates pincodes, vendor serviceability, shipping, and COD eligibility.
- Order controllers handle order creation and retrieval.
- PostgreSQL stores order information.
- Idempotency keys help prevent duplicate order creation.

## API Endpoints

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check backend availability |

### Catalog and Checkout APIs

The catalog routes are mounted under `/api/v1`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/products` | Fetch product catalog |
| POST | `/api/v1/checkout/quote` | Calculate checkout quote |

### Order APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Create an order |
| GET | `/api/orders?ids=ORDER_ID` | Retrieve orders by order IDs |

Order creation requires an `Idempotency-Key` request header.

## Key Technical Decisions

### 1. Vendor-aware checkout

Cart items are grouped by vendor instead of treating the entire cart as a single order group.

This allows delivery serviceability and COD eligibility to be evaluated separately for each vendor.

**Trade-off:** Vendor-level checkout requires additional grouping and validation logic, but provides more accurate delivery decisions for multi-vendor carts.

### 2. Story attribution throughout checkout

Story, creator, and product identifiers are preserved when a customer adds a product from a story.

This attribution is passed through the cart and checkout process and included in order creation.

**Trade-off:** Attribution requires additional metadata to travel through the shopping flow, but it preserves the connection between creator content and resulting purchases.

### 3. Idempotent order creation

Orders use an idempotency key and SHA-256 request hash to prevent duplicate order creation.

- Identical requests return the existing order.
- Reusing the same key with different order data returns HTTP `409 Conflict`.
- A database unique constraint protects against simultaneous duplicate requests.

**Trade-off:** Idempotency requires additional request validation and database checks, but makes order creation more reliable when requests are repeated.

## Testing

The project includes frontend unit tests, backend tests, and browser-based end-to-end tests.

### Verified test results

| Check | Result |
|---|---|
| ESLint | Passed |
| Vitest | 8 tests passed |
| Playwright | 2 tests passed |
| Production build | Passed |

### Run frontend checks

```bash
npm run lint
npm run test:run
npm run test:e2e
npm run build
```

### Run backend tests

```bash
cd server
npm test
```

## Future Improvements

- Integrate a real payment gateway.
- Add authentication and user account management.
- Replace mock catalog data with persistent database-backed product data.
- Improve order tracking and notifications.
- Add more comprehensive API and integration tests.
- Add production monitoring and error reporting.
- Improve checkout recovery for network failures and interrupted requests.

## Important Note

The current checkout demonstrates order creation and confirmation. It does not process real payments through a payment gateway.

## Project Links

- **Live Demo:** Add your deployed application URL.
- **GitHub Repository:** Add your repository URL.

## Author

Developed as a React frontend engineering assignment using React, Node.js, Express, and PostgreSQL.

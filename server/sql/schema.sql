CREATE TABLE IF NOT EXISTS public.orders (
    order_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    vendor VARCHAR(150) NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    shipping NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    address JSONB NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Confirmed',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT orders_pkey PRIMARY KEY (order_id),
    CONSTRAINT orders_idempotency_key_key UNIQUE (idempotency_key)
);
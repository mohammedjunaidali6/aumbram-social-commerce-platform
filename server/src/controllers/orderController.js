import { createHash, randomUUID } from "node:crypto";
import pool from "../config/database.js";

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const sortedKeys = Object.keys(value).sort();

    return `{${sortedKeys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export const createOrder = async (req, res) => {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency key is required",
      });
    }

    const { vendor, items, subtotal, shipping, total, address, paymentMethod } =
      req.body || {};

    // Validate order details
    if (
      !vendor ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !address ||
      typeof address !== "object" ||
      !Number.isFinite(Number(subtotal)) ||
      !Number.isFinite(Number(shipping)) ||
      !Number.isFinite(Number(total)) ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order details",
      });
    }
    const requestHash = createHash("sha256")
      .update(
        stableStringify({
          vendor,
          items,
          subtotal,
          shipping,
          total,
          address,
          paymentMethod,
        }),
      )
      .digest("hex");

    // Check whether this request already exists
    const existingResult = await pool.query(
      `SELECT * FROM orders WHERE idempotency_key = $1`,
      [idempotencyKey],
    );

    if (existingResult.rows.length > 0) {
      const existingOrder = existingResult.rows[0];

      if (existingOrder.request_hash !== requestHash) {
        return res.status(409).json({
          success: false,
          message: "Idempotency key reused with different order data",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Order already processed",
        order: formatOrder(existingOrder),
      });
    }

    // Generate a new order
    const orderId = `AUM-${randomUUID()}`;

    // Insert order into PostgreSQL
    const result = await pool.query(
      `INSERT INTO orders (
        order_id,
        idempotency_key,
        request_hash,
        vendor,
        items,
        subtotal,
        shipping,
        total,
        address,
        payment_method
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *`,
      [
        orderId,
        idempotencyKey,
        requestHash,
        vendor,
        JSON.stringify(items),
        subtotal,
        shipping,
        total,
        JSON.stringify(address),
        paymentMethod,
      ],
    );

    // Handle a simultaneous duplicate request
    if (result.rows.length === 0) {
      const duplicateResult = await pool.query(
        `SELECT * FROM orders WHERE idempotency_key = $1`,
        [idempotencyKey],
      );

      const existingOrder = duplicateResult.rows[0];

      if (!existingOrder) {
        throw new Error("Unable to retrieve existing order");
      }

      if (existingOrder.request_hash !== requestHash) {
        return res.status(409).json({
          success: false,
          message: "Idempotency key reused with different order data",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Order already processed",
        order: formatOrder(existingOrder),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: formatOrder(result.rows[0]),
    });
  } catch (error) {
    console.error("Order creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};

// Convert PostgreSQL column names into frontend-friendly fields
function formatOrder(row) {
  return {
    orderId: row.order_id,
    vendor: row.vendor,
    items: row.items,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
    address: row.address,
    paymentMethod: row.payment_method,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const getOrders = async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs are required",
      });
    }

    if (ids.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Too many order IDs",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM orders
       WHERE order_id = ANY($1::varchar[])
       ORDER BY created_at DESC`,
      [ids],
    );

    res.set("Cache-Control", "no-store");

    res.status(200).json({
      success: true,
      count: result.rows.length,
      orders: result.rows.map(formatOrder),
    });
  } catch (error) {
    console.error("Get orders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

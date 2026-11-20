import express from "express";

import {
  feed,
  stories,
  productMap,
  vendorMap,
  creatorMap,
  products,
} from "../data/mockData.js";

const router = express.Router();

const notFound = (res, message) =>
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message,
    },
  });

// Feed API
router.get("/feed", (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  const cursor = Number(req.query.cursor || 0);

  if (!Number.isInteger(cursor) || cursor < 0) {
    return res.status(400).json({
      error: {
        code: "INVALID_CURSOR",
        message: "Invalid feed cursor",
      },
    });
  }

  const items = feed.slice(cursor, cursor + limit);

  res.json({
    items,
    nextCursor: cursor + limit < feed.length ? String(cursor + limit) : null,
  });
});

// Story API
router.get("/stories/:storyId", (req, res) => {
  const story = stories.find((item) => item.id === req.params.storyId);

  if (!story) {
    return notFound(res, "Story not found");
  }

  const creator = creatorMap.get(story.creatorId);

  const taggedProducts = story.taggedProducts
    .map((tag) => productMap.get(tag.productId))
    .filter(Boolean)
    .map((product) => {
      const vendor = vendorMap.get(product.vendorId);

      return {
        ...product,
        vendor: vendor
          ? {
              id: vendor.id,
              name: vendor.name,
              codEnabled: vendor.codEnabled,
            }
          : null,
      };
    });

  res.json({
    story,
    creator,
    products: taggedProducts,
  });
});

// Creator stories API
router.get("/creators/:creatorId/stories", (req, res) => {
  const creator = creatorMap.get(req.params.creatorId);

  if (!creator) {
    return notFound(res, "Creator not found");
  }

  const items = stories
    .filter((story) => story.creatorId === creator.id)
    .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

  res.json({ items });
});

// Products API
router.get("/products", (req, res) => {
  const items = products.map((product) => {
    const vendor = vendorMap.get(product.vendorId);

    return {
      ...product,
      vendor: vendor
        ? {
            id: vendor.id,
            name: vendor.name,
            codEnabled: vendor.codEnabled,
          }
        : null,
    };
  });

  res.json({ items });
});

// Product API
router.get("/products/:productId", (req, res) => {
  const product = productMap.get(req.params.productId);

  if (!product) {
    return notFound(res, "Product not found");
  }

  const vendor = vendorMap.get(product.vendorId);

  res.json({
    ...product,
    vendor: vendor
      ? {
          id: vendor.id,
          name: vendor.name,
          codEnabled: vendor.codEnabled,
        }
      : null,
  });
});

// Checkout quote API
router.post("/checkout/quote", (req, res) => {
  try {
    const { pincode, lines } = req.body;

    if (!/^[1-9][0-9]{5}$/.test(pincode || "")) {
      return res.status(422).json({
        error: {
          code: "INVALID_PINCODE",
          message: "Enter a valid 6-digit pincode",
        },
      });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(422).json({
        error: {
          code: "CART_EMPTY",
          message: "Your cart is empty",
        },
      });
    }

    const groups = new Map();

    for (const line of lines) {
      const quantity = Number(line.quantity);

      if (
        !line.variantId ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 10
      ) {
        return res.status(422).json({
          error: {
            code: "INVALID_CART_LINE",
            message: "Invalid variant or quantity",
          },
        });
      }

      const product = [...productMap.values()].find((item) =>
        item.variants?.some((variant) => variant.id === line.variantId),
      );

      const variant = product?.variants?.find(
        (item) => item.id === line.variantId,
      );

      if (!product || !variant) {
        return res.status(404).json({
          error: {
            code: "VARIANT_NOT_FOUND",
            message: `Variant ${line.variantId} was not found`,
          },
        });
      }

      if (quantity > variant.stock) {
        return res.status(409).json({
          error: {
            code: "OUT_OF_STOCK",
            message: `${product.title} has only ${variant.stock} available`,
            details: {
              variantId: variant.id,
              available: variant.stock,
            },
          },
        });
      }

      const vendor = vendorMap.get(product.vendorId);

      if (!vendor) {
        return res.status(404).json({
          error: {
            code: "VENDOR_NOT_FOUND",
            message: "Product vendor was not found",
          },
        });
      }

      if (!groups.has(vendor.id)) {
        groups.set(vendor.id, {
          vendor: {
            id: vendor.id,
            name: vendor.name,
            codEnabled: vendor.codEnabled,
          },
          serviceable: vendor.serviceablePincodePrefixes.some((prefix) =>
            pincode.startsWith(prefix),
          ),
          lines: [],
          subtotal: 0,
        });
      }

      const group = groups.get(vendor.id);
      const lineTotal = variant.price.amount * quantity;

      group.lines.push({
        variantId: variant.id,
        productId: product.id,
        productTitle: product.title,
        quantity,
        unitPrice: variant.price,
        priceAtAdd: line.priceAtAdd || variant.price,
        attribution: line.attribution || {},
      });

      group.subtotal += lineTotal;
    }

    const orderGroups = [...groups.values()].map((group) => {
      const shippingAmount = group.subtotal >= 49900 ? 0 : 4900;

      return {
        ...group,
        subtotal: {
          amount: group.subtotal,
          currency: "INR",
        },
        shippingFee: {
          amount: shippingAmount,
          currency: "INR",
        },
        total: {
          amount: group.subtotal + shippingAmount,
          currency: "INR",
        },
      };
    });

    const serviceableGroups = orderGroups.filter((group) => group.serviceable);

    const codReasons = [];

    serviceableGroups.forEach((group) => {
      if (!group.vendor.codEnabled) {
        codReasons.push({
          code: "VENDOR_COD_DISABLED",
          vendorId: group.vendor.id,
          vendorName: group.vendor.name,
        });
      }

      if (group.total.amount > 500000) {
        codReasons.push({
          code: "COD_ORDER_LIMIT",
          vendorId: group.vendor.id,
          vendorName: group.vendor.name,
        });
      }
    });

    const payable = serviceableGroups.reduce(
      (total, group) => total + group.total.amount,
      0,
    );

    res.set("Cache-Control", "no-store");

    return res.status(200).json({
      pincode,
      groups: orderGroups,
      orderCount: serviceableGroups.length,
      cod: {
        available: serviceableGroups.length > 0 && codReasons.length === 0,
        reasons: codReasons,
      },
      payable: {
        amount: payable,
        currency: "INR",
      },
    });
  } catch (error) {
    console.error("Checkout quote error:", error);

    return res.status(500).json({
      error: {
        code: "QUOTE_FAILED",
        message: "Unable to calculate checkout quote",
      },
    });
  }
});

export default router;

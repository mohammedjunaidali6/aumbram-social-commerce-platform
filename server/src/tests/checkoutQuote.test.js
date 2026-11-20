import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import catalogRoutes from "../routes/catalogRoutes.js";
import { stories, productMap } from "../data/mockData.js";

const app = express();

app.use(express.json());
app.use("/api/v1", catalogRoutes);

const story = stories.find((item) => item.id === "sty_0022");

const lines = story.taggedProducts.map(({ productId }) => {
  const product = productMap.get(productId);
  const variant = product.variants.find((item) => item.stock > 0);

  return {
    variantId: variant.id,
    quantity: 1,
  };
});

test("rejects invalid pincode", async () => {
  const response = await request(app)
    .post("/api/v1/checkout/quote")
    .send({ pincode: "123", lines })
    .expect(422);

  assert.equal(response.body.error.code, "INVALID_PINCODE");
});

test("rejects an empty cart", async () => {
  const response = await request(app)
    .post("/api/v1/checkout/quote")
    .send({ pincode: "751001", lines: [] })
    .expect(422);

  assert.equal(response.body.error.code, "CART_EMPTY");
});

test("checks the required sty_0022 checkout scenario", async () => {
  const response = await request(app)
    .post("/api/v1/checkout/quote")
    .send({
      pincode: "751001",
      lines,
    })
    .expect(200);

  const groups = response.body.groups;

  assert.equal(groups.length, 4);

  assert.equal(
    groups.find((group) => group.vendor.name === "Kochi Studio").serviceable,
    false,
  );

  assert.equal(
    groups.find((group) => group.vendor.name === "Kolkata Looms").serviceable,
    true,
  );

  assert.equal(response.body.cod.available, false);

  assert.ok(
    response.body.cod.reasons.some(
      (reason) => reason.vendorName === "Jaipur Kala",
    ),
  );
});

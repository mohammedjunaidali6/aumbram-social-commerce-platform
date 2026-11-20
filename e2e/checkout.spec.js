import { test, expect } from "@playwright/test";

test("checkout handles vendor serviceability and COD rules", async ({
  page,
  request,
}) => {
  // Fetch the real assignment story data
  const response = await request.get(
    "http://localhost:5000/api/v1/stories/sty_0022",
  );

  expect(response.ok()).toBeTruthy();

  const { products } = await response.json();

  // Prepare cart using actual product variants
  const cartItems = products.map((product) => {
    const variant = product.variants.find((item) => item.stock > 0);

    if (!variant) {
      throw new Error(`No available variant: ${product.id}`);
    }

    const selectedSize =
      Object.values(variant.options || {}).join(" / ") || "Standard";

    return {
      id: variant.id,
      variantId: variant.id,
      productId: product.id,
      name: product.title,
      price: variant.price.amount / 100,
      priceAtAdd: variant.price,
      vendor: product.vendor.name,
      vendorId: product.vendorId,
      image: product.images?.[0]?.url || "",
      selectedSize,
      selectedVariantOptions: variant.options || {},
      stock: variant.stock,
      quantity: 1,
      attribution: {
        storyId: "sty_0022",
        creatorId: "crt_0008",
        productId: product.id,
        source: "story",
      },
    };
  });

  // Seed Zustand persisted cart before the application loads
  await page.addInitScript((items) => {
    localStorage.setItem(
      "aumbram-cart",
      JSON.stringify({
        state: { cartItems: items },
        version: 0,
      }),
    );
  }, cartItems);

  await page.goto("/checkout");

  // Fill delivery address
  await page.getByLabel("Full Name").fill("Test User");
  await page.getByLabel("Phone Number").fill("9876543210");
  await page.getByLabel("Address Line 1").fill("Test Street");
  await page.getByLabel("City").fill("Bhubaneswar");
  await page.getByLabel("State").fill("Odisha");
  await page.getByLabel("Pincode").fill("751001");

  // Verify Kochi Studio is unavailable
  await expect(
    page.getByText("Kochi Studio: Delivery unavailable for this pincode"),
  ).toBeVisible({ timeout: 10000 });

  // Verify COD is unavailable
  const codOption = page.getByRole("radio", {
    name: /Cash on Delivery/,
  });

  await expect(codOption).toBeDisabled();

  // Checkout must be blocked while unavailable items remain
  const placeOrderButton = page.getByRole("button", {
    name: /Place 3 Orders/,
  });

  await expect(placeOrderButton).toBeDisabled();

  // Remove unavailable Kochi Studio products
  await page.getByRole("button", { name: "Remove unavailable items" }).click();

  // Wait for the updated quote
  await expect(
    page.getByText("Kochi Studio: Delivery unavailable for this pincode"),
  ).toHaveCount(0);

  // Three serviceable vendor orders can now proceed
  await expect(
    page.getByRole("button", { name: /Place 3 Orders/ }),
  ).toBeEnabled();
});

import { test, expect } from "@playwright/test";

test("customer can shop from story sty_0022", async ({ page }) => {
  // Clear cart only once per browser tab
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("playwright-cart-cleared")) {
      localStorage.removeItem("aumbram-cart");
      sessionStorage.setItem("playwright-cart-cleared", "true");
    }
  });

  await page.goto("/story/sty_0022");

  const productHotspot = page.getByRole("button", {
    name: "View Handcrafted Bamboo Basket",
  });

  await expect(productHotspot).toBeVisible();

  await productHotspot.click();

  const productDialog = page.getByRole("dialog");

  await expect(
    productDialog.getByRole("heading", {
      name: "Handcrafted Bamboo Basket",
    }),
  ).toBeVisible();

  await productDialog.getByRole("button", { name: "Add to Cart" }).click();

  await expect(productDialog).toHaveCount(0);

  await page.goto("/cart");
  await page.reload();
  await expect(page.getByText("Handcrafted Bamboo Basket")).toBeVisible();
});

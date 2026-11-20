import useCartStore from "./cartStore";
import { describe, beforeEach, test, expect } from "vitest";

const product = {
  id: "var-0001",
  productId: "prd-0001",
  name: "Handcrafted Bamboo Basket",
  price: 2699,
  vendor: "Kolkata Looms",
  selectedSize: "Standard",
};

describe("Cart Store", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ cartItems: [] });
  });

  test("adds a product to cart", () => {
    useCartStore.getState().addToCart(product);

    expect(useCartStore.getState().cartItems).toHaveLength(1);
    expect(useCartStore.getState().cartItems[0].name).toBe(
      "Handcrafted Bamboo Basket"
    );
  });

  test("increments quantity when adding the same product", () => {
    useCartStore.getState().addToCart(product);
    useCartStore.getState().addToCart(product);

    expect(useCartStore.getState().cartItems[0].quantity).toBe(2);
  });

  test("increases product quantity", () => {
    useCartStore.getState().addToCart(product);
    useCartStore.getState().increaseQuantity(product.id);

    expect(useCartStore.getState().cartItems[0].quantity).toBe(2);
  });

  test("decreases product quantity", () => {
    useCartStore.getState().addToCart(product);
    useCartStore.getState().increaseQuantity(product.id);
    useCartStore.getState().decreaseQuantity(product.id);

    expect(useCartStore.getState().cartItems[0].quantity).toBe(1);
  });

  test("removes product from cart", () => {
    useCartStore.getState().addToCart(product);
    useCartStore.getState().removeFromCart(product.id);

    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });
});
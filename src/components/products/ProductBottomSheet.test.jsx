import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import ProductBottomSheet from "./ProductBottomSheet";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) =>
      ({
        productDetails: "Product Details",
        selectVariant: "Select Variant",
        soldOut: "Sold out",
        addToCart: "Add to Cart",
      })[key] || key,
  }),
}));

const product = {
  id: "prd_0082",
  vendorId: "vnd_0023",
  title: "Upcycled Dhurrie",
  description: "Handmade product",
  images: [{ url: "https://example.com/product.jpg" }],
  vendor: { name: "Jaipur Kala" },
  variants: [
    {
      id: "var_00305",
      options: { colour: "Indigo" },
      price: { amount: 139900, currency: "INR" },
      stock: 5,
    },
    {
      id: "var_00306",
      options: { colour: "Terracotta" },
      price: { amount: 139900, currency: "INR" },
      stock: 0,
    },
  ],
};

describe("ProductBottomSheet", () => {
  test("displays product details and price", () => {
    render(
      <ProductBottomSheet
        product={product}
        onClose={vi.fn()}
        onAddToCart={vi.fn()}
      />
    );

    expect(screen.getByText("Upcycled Dhurrie")).toBeInTheDocument();
    expect(screen.getByText("₹1,399")).toBeInTheDocument();
  });

  test("disables an out-of-stock variant", () => {
    render(
      <ProductBottomSheet
        product={product}
        onClose={vi.fn()}
        onAddToCart={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", {
        name: /Terracotta.*Sold out/i,
      })
    ).toBeDisabled();
  });

  test("adds selected variant with story attribution", () => {
    const onAddToCart = vi.fn();
    const onClose = vi.fn();

    render(
      <ProductBottomSheet
        product={product}
        onClose={onClose}
        onAddToCart={onAddToCart}
        attribution={{
          storyId: "sty_0022",
          creatorId: "crt_0008",
        }}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Add to Cart" })
    );

    expect(onAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "var_00305",
        productId: "prd_0082",
        price: 1399,
        selectedSize: "Indigo",
        attribution: {
          storyId: "sty_0022",
          creatorId: "crt_0008",
          productId: "prd_0082",
          source: "story",
        },
      })
    );

    expect(onClose).toHaveBeenCalled();
  });
});
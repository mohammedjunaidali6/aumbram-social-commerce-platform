
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount / 100);

function ProductBottomSheet({
  product,
  onClose,
  onAddToCart,
  attribution = null,
}) {
  const { t } = useTranslation();

  // Support both local and API product structures
  const productName = product.title || product.name;
  const productImage =
    product.images?.[0]?.url || product.image || "";
  const vendorName =
    product.vendor?.name || product.vendor || "Unknown Vendor";

  const variants = product.variants || [];

  const availableVariants = variants.filter(
    (variant) => variant.stock > 0
  );

  const [variantSelection, setVariantSelection] = useState({
  productId: product.id,
  variantId: availableVariants[0]?.id || "",
});

const selectedVariantId =
  variantSelection.productId === product.id
    ? variantSelection.variantId
    : availableVariants[0]?.id || "";

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId
  );



  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();

      if (event.key === "Tab") {
        const focusable =
          dialogRef.current?.querySelectorAll(
            'button:not(:disabled), [href], input:not(:disabled)'
          );

        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.stock <= 0) return;

    const optionLabel =
      Object.values(selectedVariant.options || {}).join(" / ") ||
      "Standard";

    const priceAmount = selectedVariant.price.amount;

    onAddToCart({
      id: selectedVariant.id,
      variantId: selectedVariant.id,
      productId: product.id,
      name: productName,
      price: priceAmount / 100,
      priceAtAdd: selectedVariant.price,
      vendor: vendorName,
      vendorId: product.vendorId,
      image: productImage,
      description: product.description,
      selectedSize: optionLabel,
      selectedVariantOptions: selectedVariant.options || {},
      stock: selectedVariant.stock,
      attribution: attribution
        ? {
            storyId: attribution.storyId,
            creatorId: attribution.creatorId,
            productId: product.id,
            source: "story",
          }
        : {
            productId: product.id,
            source: "direct",
          },
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-sheet-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-300" />

        <div className="mb-4 flex items-center justify-between">
          <h2
            id="product-sheet-title"
            className="text-xl font-bold"
          >
            {t("productDetails")}
          </h2>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="text-3xl text-gray-500"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <img
            src={productImage}
            alt={productName}
            className="h-64 w-full rounded-lg bg-gray-100 object-cover"
          />

          <div>
            <h3 className="text-xl font-semibold">
              {productName}
            </h3>

            <p className="mt-2 text-gray-500">
              {vendorName}
            </p>

            {selectedVariant && (
              <p className="mt-3 text-2xl font-bold">
                {formatPrice(selectedVariant.price.amount)}
              </p>
            )}

            <p className="mt-3 text-gray-600">
              {product.description}
            </p>

            <h4 className="mb-3 mt-5 font-semibold">
              {t("selectVariant")}
            </h4>

            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => {
                const label =
                  Object.values(variant.options || {}).join(" / ") ||
                  "Standard";

                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={variant.stock <= 0}
                    aria-pressed={
                      selectedVariantId === variant.id
                    }
                   onClick={() =>
  setVariantSelection({
    productId: product.id,
    variantId: variant.id,
  })
}
                    className={`rounded-lg border px-4 py-2 ${
                      selectedVariantId === variant.id
                        ? "border-black bg-black text-white"
                        : "border-gray-300"
                    } ${
                      variant.stock <= 0
                        ? "cursor-not-allowed opacity-40"
                        : ""
                    }`}
                  >
                    {label}
                    {variant.stock <= 0
                      ? ` ${t("soldOut")}`
                      : ""}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                !selectedVariant || selectedVariant.stock <= 0
              }
              className="mt-6 w-full rounded-lg bg-black py-3 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {t("addToCart")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProductBottomSheet;

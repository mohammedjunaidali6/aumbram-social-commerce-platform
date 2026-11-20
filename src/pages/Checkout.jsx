import { useEffect, useRef, useState } from "react";
import useCartStore from "../store/cartStore";
import { createOrderApi } from "../services/orderApi";
import { getCheckoutQuoteApi } from "../services/catalogApi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Skeleton from "../components/common/Skeleton";

function Checkout() {
  const navigate = useNavigate();

  const cartItems = useCartStore((state) => state.cartItems);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionRef = useRef(false);
  const { t } = useTranslation();

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  // Get delivery and payment information from backend
  useEffect(() => {
    let active = true;

    const isValidPincode = /^[1-9]\d{5}$/.test(address.pincode);

    const timer = setTimeout(
      async () => {
        if (!active) return;

        if (!isValidPincode || cartItems.length === 0) {
          setQuote(null);
          setQuoteError("");
          setQuoteLoading(false);
          return;
        }

        setQuoteLoading(true);
        setQuoteError("");
        setQuote(null);

        try {
          const response = await getCheckoutQuoteApi(
            address.pincode,
            cartItems,
          );

          if (active) {
            setQuote(response);
          }
        } catch (error) {
          if (active) {
            setQuoteError(
              error.response?.data?.error?.message ||
                "Unable to check delivery availability.",
            );
          }
        } finally {
          if (active) {
            setQuoteLoading(false);
          }
        }
      },
      isValidPincode && cartItems.length > 0 ? 350 : 0,
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [address.pincode, cartItems]);

  // Separate serviceable and unavailable vendor groups
  const unserviceableGroups =
    quote?.groups?.filter((group) => !group.serviceable) || [];

  // Build delivery summary from backend quote
  const vendorOrders = (quote?.groups || [])
    .filter((group) => group.serviceable)
    .map((group) => ({
      vendor: group.vendor.name,
      vendorId: group.vendor.id,

      items: group.lines
        .map((line) => {
          const cartItem = cartItems.find(
            (item) => (item.variantId || item.id) === line.variantId,
          );

          if (!cartItem) return null;

          return {
            ...cartItem,
            name: line.productTitle,
            price: line.unitPrice.amount / 100,
            quantity: line.quantity,
          };
        })
        .filter(Boolean),

      subtotal: group.subtotal.amount / 100,
      shipping: group.shippingFee.amount / 100,
      total: group.total.amount / 100,
    }));

  const grandTotal = (quote?.payable?.amount || 0) / 100;

  const codAvailable = quote?.cod?.available === true;

  const codUnavailableVendors = [
    ...new Set(
      (quote?.cod?.reasons || [])
        .map((reason) => reason.vendorName)
        .filter(Boolean),
    ),
  ];

  const updateAddress = (event) => {
    const { name, value } = event.target;

    setAddress((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validateAddress = () => {
    const newErrors = {};

    if (!address.name.trim()) {
      newErrors.name = "Enter your full name";
    }

    if (!/^[6-9]\d{9}$/.test(address.phone)) {
      newErrors.phone = "Enter a valid 10-digit Indian phone number";
    }

    if (!address.line1.trim()) {
      newErrors.line1 = "Enter your address";
    }

    if (!address.city.trim()) {
      newErrors.city = "Enter your city";
    }

    if (!address.state.trim()) {
      newErrors.state = "Enter your state";
    }

    if (!/^[1-9]\d{5}$/.test(address.pincode)) {
      newErrors.pincode = "Enter a valid 6-digit pincode";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();

    if (submissionRef.current) return;

    setMessage("");

    if (cartItems.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    if (!validateAddress()) return;

    if (!quote || quoteLoading || quote.pincode !== address.pincode) {
      setMessage("Please wait for delivery availability to be checked.");
      return;
    }

    if (unserviceableGroups.length > 0) {
      setMessage("Remove unavailable products before placing your order.");
      return;
    }

    if (vendorOrders.length === 0) {
      setMessage("No serviceable products are available.");
      return;
    }

    if (paymentMethod === "cod" && !codAvailable) {
      setMessage("Cash on Delivery is unavailable for this order.");
      return;
    }

    submissionRef.current = true;
    setIsSubmitting(true);

    try {
      const checkoutData = JSON.stringify({
        vendorOrders,
        address,
        paymentMethod,
      });

      const savedCheckout = JSON.parse(
        sessionStorage.getItem("aumbram-checkout-key") || "null",
      );

      const checkoutKey =
        savedCheckout?.data === checkoutData
          ? savedCheckout.key
          : crypto.randomUUID();

      sessionStorage.setItem(
        "aumbram-checkout-key",
        JSON.stringify({
          data: checkoutData,
          key: checkoutKey,
        }),
      );

      const orders = [];

      // Create one order per vendor
      for (const order of vendorOrders) {
        const response = await createOrderApi(
          {
            vendor: order.vendor,
            items: order.items,
            subtotal: order.subtotal,
            shipping: order.shipping,
            total: order.total,
            address,
            paymentMethod,
          },
          `${checkoutKey}-${order.vendorId}`,
        );

        if (!response.success || !response.order) {
          throw new Error("Order creation failed");
        }

        orders.push(response.order);
      }

      const existingOrders = JSON.parse(
        localStorage.getItem("aumbram-orders") || "[]",
      );

      localStorage.setItem(
        "aumbram-orders",
        JSON.stringify([...existingOrders, ...orders]),
      );

      localStorage.setItem("aumbram-latest-orders", JSON.stringify(orders));

      sessionStorage.removeItem("aumbram-checkout-key");

      clearCart();

      navigate("/order-confirmation");
    } catch (error) {
      console.error("Order placement error:", error);

      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error?.message ||
          "Unable to place your order. Please try again.",
      );

      submissionRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-6">
          <h1 className="text-2xl font-bold">{t("checkout")}</h1>
          <p className="mt-4">Your cart is empty.</p>

          <button
            onClick={() => navigate("/")}
            className="mt-4 rounded-lg bg-black px-5 py-2 text-white"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className="mb-6 text-3xl font-bold">{t("checkout")}</h1>

        <form onSubmit={handlePlaceOrder} className="space-y-6">
          <section className="rounded-xl bg-white p-6">
            <h2 className="mb-5 text-xl font-semibold">
              1. {t("deliveryAddress")}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["name", "fullName"],
                ["phone", "phone"],
                ["line1", "addressLine1"],
                ["line2", "addressLine2"],
                ["city", "city"],
                ["state", "state"],
                ["pincode", "pincode"],
              ].map(([name, labelKey]) => (
                <div key={name}>
                  <label
                    htmlFor={name}
                    className="mb-1 block text-sm font-medium"
                  >
                    {t(labelKey)}
                  </label>

                  <input
                    id={name}
                    name={name}
                    value={address[name]}
                    onChange={updateAddress}
                    maxLength={
                      name === "phone" ? 10 : name === "pincode" ? 6 : undefined
                    }
                    inputMode={
                      name === "phone" || name === "pincode"
                        ? "numeric"
                        : "text"
                    }
                    aria-describedby={
                      errors[name] ? `${name}-error` : undefined
                    }
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-black"
                  />

                  {errors[name] && (
                    <p
                      id={`${name}-error`}
                      className="mt-1 text-sm text-red-600"
                    >
                      {errors[name]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {quoteLoading && (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {quoteError && (
              <p className="mt-4 text-sm text-red-600">{quoteError}</p>
            )}

            {quote && (
              <div className="mt-4 space-y-2" aria-live="polite">
                {quote.groups.map((group) => (
                  <p
                    key={group.vendor.id}
                    className={`text-sm ${
                      group.serviceable ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {group.vendor.name}:{" "}
                    {group.serviceable
                      ? "Delivery available"
                      : "Delivery unavailable for this pincode"}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-6">
            <h2 className="mb-5 text-xl font-semibold">
              2. {t("deliverySummary")}
            </h2>

            {vendorOrders.map((order) => (
              <div
                key={order.vendorId}
                className="mb-5 border-b pb-5 last:border-0"
              >
                <h3 className="mb-3 font-semibold">{order.vendor}</h3>

                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="mb-2 flex justify-between text-sm"
                  >
                    <span>
                      {item.name}
                      {item.selectedSize && ` (${item.selectedSize})`} ×{" "}
                      {item.quantity}
                    </span>

                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}

                <div className="mt-3 flex justify-between text-sm">
                  <span>{t("subtotal")}</span>
                  <span>₹{order.subtotal}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>{t("delivery")}</span>
                  <span>
                    {order.shipping === 0
                      ? t("freeDelivery")
                      : `₹${order.shipping}`}
                  </span>
                </div>

                <div className="mt-2 flex justify-between font-semibold">
                  <span> {t("orderTotal")}</span>
                  <span>₹{order.total}</span>
                </div>
              </div>
            ))}

            {unserviceableGroups.map((group) => (
              <div
                key={group.vendor.id}
                className="mb-4 rounded-lg border border-red-200 p-4"
              >
                <h3 className="font-semibold">{group.vendor.name}</h3>

                <p className="mt-1 text-sm text-red-600">
                  {t("deliveryUnavailableMessage")}
                </p>

                {group.lines.map((line) => (
                  <p key={line.variantId} className="mt-2 text-sm">
                    {line.productTitle} × {line.quantity}
                  </p>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const variantIds = new Set(
                      group.lines.map((line) => line.variantId),
                    );

                    cartItems
                      .filter((item) =>
                        variantIds.has(item.variantId || item.id),
                      )
                      .forEach((item) => removeFromCart(item.id));
                  }}
                  className="mt-3 rounded-lg border border-black px-4 py-2 text-sm font-semibold"
                >
                  {t("removeUnavailableItems")}
                </button>
              </div>
            ))}

            {!quote && (
              <p className="text-sm text-gray-500">{t("enterPincode")}</p>
            )}

            <div className="flex justify-between text-xl font-bold">
              <span>{t("grandTotal")}</span>
              <span>₹{grandTotal}</span>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6">
            <h2 className="mb-5 text-xl font-semibold">
              3. {t("paymentMethod")}
            </h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  value="upi"
                  checked={paymentMethod === "upi"}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                />
                {t("upi")}
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                />
                {t("card")}
              </label>

              <label className="flex items-center gap-3 text-gray-500">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  disabled={!quote || !codAvailable}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                />
                {t("cashOnDelivery")}
                {quote && !codAvailable && " (Unavailable)"}
              </label>

              {quote && !codAvailable && (
                <p className="text-sm text-red-600">
                  Cash on Delivery is unavailable for:{" "}
                  {codUnavailableVendors.join(", ")}
                </p>
              )}

              {!quote && (
                <p className="text-sm text-gray-500">{t("enterPincodeCod")}</p>
              )}
            </div>
          </section>

          {message && (
            <p className="rounded-lg bg-white p-4 text-sm text-red-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              quoteLoading ||
              !quote ||
              unserviceableGroups.length > 0
            }
            className="w-full rounded-lg bg-black py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? t("placingOrder")
              : t("placeOrders", {
                  count: vendorOrders.length,
                  total: grandTotal,
                })}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Checkout;

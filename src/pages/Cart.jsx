import { useTranslation } from "react-i18next";
import useCartStore from "../store/cartStore";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function Cart() {
  const { t } = useTranslation();

  const { cartItems, increaseQuantity, decreaseQuantity, removeFromCart } =
    useCartStore();

  const navigate = useNavigate();

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const groupedItems = cartItems.reduce((groups, item) => {
    const vendor = item.vendor || "Other";

    if (!groups[vendor]) {
      groups[vendor] = [];
    }

    groups[vendor].push(item);

    return groups;
  }, {});

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
        <h1 className="mb-6 text-3xl font-bold">{t("shoppingCart")}</h1>

        {cartItems.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-gray-500">
            {t("cartEmpty")}
          </p>
        ) : (
          <>
            {Object.entries(groupedItems).map(([vendor, items]) => (
              <div key={vendor} className="mb-6 rounded-xl bg-white p-5">
                <h2 className="mb-4 text-xl font-semibold">{vendor}</h2>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b py-4"
                  >
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>

                      {item.selectedSize && (
                        <p className="mt-1 text-sm text-gray-600">
                          {t("size")}: {item.selectedSize}
                        </p>
                      )}

                      <p className="text-gray-500">₹{item.price}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => decreaseQuantity(item.id)}
                        aria-label="Decrease quantity"
                        className="rounded bg-gray-200 px-3 py-1"
                      >
                        -
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() => increaseQuantity(item.id)}
                        aria-label="Increase quantity"
                        className="rounded bg-gray-200 px-3 py-1"
                      >
                        +
                      </button>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="rounded-xl bg-white p-5">
              <h2 className="text-xl font-bold">
                {t("total")}: ₹{total.toFixed(2)}
              </h2>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="mt-5 w-full rounded-lg bg-black py-3 font-semibold text-white"
            >
              {t("proceedToCheckout")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;

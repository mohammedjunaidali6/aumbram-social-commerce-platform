import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOrdersApi } from "../services/orderApi";
import { useTranslation } from "react-i18next";
import Skeleton from "../components/common/Skeleton";

function OrderConfirmation() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const { t } = useTranslation();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Get order IDs from the latest checkout
        const savedOrders = JSON.parse(
          localStorage.getItem("aumbram-latest-orders") || "[]",
        );

        const orderIds = savedOrders.map((order) => order.orderId);

        if (orderIds.length === 0) {
          setOrders([]);
          setIsLoading(false);
          return;
        }

        // Fetch actual orders from PostgreSQL
        const response = await getOrdersApi(orderIds);

        if (!response.success) {
          throw new Error("Unable to fetch orders");
        }

        // Show only orders from the latest checkout
        setOrders(response.orders);
      } catch (error) {
        console.log(error, "Order confirmation error");
        setError("Unable to load your order details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-xl bg-white p-8">
            <Skeleton className="mx-auto h-12 w-12 rounded-full" />
            <Skeleton className="mx-auto mt-4 h-8 w-2/3" />
            <Skeleton className="mx-auto mt-3 h-4 w-1/2" />
          </div>

          <div className="rounded-xl bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="rounded-xl bg-white p-6 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">Order Details</h1>
          <p className="mt-4 text-red-600">{error}</p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-lg bg-black px-6 py-3 text-white"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">No recent order found</h1>
          <Link
            to="/"
            className="mt-5 inline-block rounded-lg bg-black px-6 py-3 text-white"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const grandTotal = orders.reduce(
    (total, order) => total + Number(order.total),
    0,
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl bg-white p-8 text-center">
          <div className="text-5xl text-green-600">✓</div>

          <h1 className="mt-4 text-3xl font-bold">{t("orderConfirmed")}</h1>

          <p className="mt-2 text-gray-500">{t("thankYou")}</p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-6">
          <h2 className="mb-5 text-xl font-bold">{t("orderDetails")}</h2>

          {orders.map((order) => (
            <div
              key={order.orderId}
              className="mb-5 border-b pb-5 last:border-0"
            >
              <p className="font-semibold">{order.vendor}</p>

              <p className="mt-1 text-sm text-gray-500">
                {t("orderId")}: {order.orderId}
              </p>

              <p className="mt-2 text-sm">
                {t("status")}:{" "}
                {order.status === "Confirmed"
                  ? t("confirmedStatus")
                  : order.status}
              </p>

              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="mt-2 flex justify-between gap-4 text-sm"
                >
                  <div>
                    <span>
                      {item.name}
                      {item.selectedSize && ` (${item.selectedSize})`} ×{" "}
                      {item.quantity}
                    </span>

                    {item.attribution && (
                      <div className="mt-1 text-xs text-gray-500">
                        {t("source")}: {item.attribution.source}
                        {item.attribution.storyId && (
                          <>
                            {" "}
                            | {t("story")}: {item.attribution.storyId}
                          </>
                        )}
                        {item.attribution.creatorId && (
                          <>
                            {" "}
                            | {t("creator")}: {item.attribution.creatorId}
                          </>
                        )}
                        | {t("product")}: {item.attribution.productId}
                      </div>
                    )}
                  </div>

                  <span className="shrink-0">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}

              <p className="mt-3 text-right font-semibold">
                {t("orderTotal")}: ₹{order.total}
              </p>
            </div>
          ))}

          <div className="flex justify-between text-xl font-bold">
            <span>{t("grandTotal")}</span>
            <span>₹{grandTotal}</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-6">
          <h2 className="font-bold">{t("deliveryAddressTitle")}</h2>

          <p className="mt-2 text-gray-600">
            {orders[0].address.name}
            <br />
            {orders[0].address.line1}
            <br />
            {orders[0].address.line2}
            <br />
            {orders[0].address.city}, {orders[0].address.state}
            <br />
            {orders[0].address.pincode}
            <br />
            {t("phone")}: {orders[0].address.phone}
          </p>
        </div>

        <Link
          to="/"
          className="mt-6 block rounded-lg bg-black py-4 text-center font-semibold text-white"
        >
          {t("continueShopping")}
        </Link>
      </div>
    </div>
  );
}

export default OrderConfirmation;

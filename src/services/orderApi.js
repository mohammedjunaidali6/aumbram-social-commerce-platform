import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Create order
export const createOrderApi = async (order, idempotencyKey) => {
  try {
    const response = await API.post("/orders", order, {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    });

    return response.data;
  } catch (error) {
    console.log(error, "Order API error");
    throw error;
  }
};

// Get selected orders
export const getOrdersApi = async (orderIds) => {
  try {
    const response = await API.get("/orders", {
      params: {
        ids: orderIds.join(","),
      },
    });

    return response.data;
  } catch (error) {
    console.log(error, "Get orders API error");
    throw error;
  }
};
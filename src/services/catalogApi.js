import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "https://aumbram-social-commerce-platform.onrender.com"
).replace(/\/+$/, "");

const API = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
});

export const getFeedApi = async () => {
  const response = await API.get("/feed");
  return response.data;
};

export const getStoryApi = async (storyId) => {
  const response = await API.get(`/stories/${storyId}`);
  return response.data;
};

export const getProductApi = async (productId) => {
  const response = await API.get(`/products/${productId}`);
  return response.data;
};

export const getCreatorStoriesApi = async (creatorId) => {
  const response = await API.get(`/creators/${creatorId}/stories`);
  return response.data;
};

export const getCheckoutQuoteApi = async (pincode, cartItems) => {
  const response = await API.post("/checkout/quote", {
    pincode,
    lines: cartItems.map((item) => ({
      variantId: item.variantId || item.id,
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      attribution: item.attribution,
    })),
  });

  return response.data;
};

export const getProductsApi = async () => {
  const response = await API.get("/products");
  return response.data;
};
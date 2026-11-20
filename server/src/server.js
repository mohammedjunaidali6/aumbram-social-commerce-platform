import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createOrder, getOrders } from "./controllers/orderController.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import process from "node:process";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/v1", catalogRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Aumbram backend is running",
  });
});

// Create order API
app.post("/api/orders", createOrder);
app.get("/api/orders", getOrders);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  void next;
  console.error("Backend error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Aumbram backend running at http://localhost:${PORT}`);
});

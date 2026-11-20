import express from "express";
import { createOrder } from "../controllers/orderController.js";

const router = express.Router();

router.post(
  "/",
  (req, res, next) => {
    console.log("POST /api/orders route reached");
    next();
  },
  createOrder,
);

export default router;

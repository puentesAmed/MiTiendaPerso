// routes/checkout.routes.js
import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/shipping-options", async (req, res) => {
  try {
    const { seller_id, product_id, sku_id, quantity, address } = req.body;

    if (!seller_id || !product_id || !sku_id || !quantity || !address?.country) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos para calcular el envío",
      });
    }

    const response = await axios.post(
      "https://api.milugui.com/shipping/quote",
      {
        seller_id,
        product_id,
        sku_id,
        quantity,
        address,
      }
    );

    return res.json({
      ok: true,
      options: response.data.options || [],
    });
  } catch (error) {
    console.error("❌ Error consultando shipping-options:", error.response?.data || error.message);

    return res.status(500).json({
      ok: false,
      message: "No se pudieron calcular las opciones de envío en este momento.",
    });
  }
});

export default router;

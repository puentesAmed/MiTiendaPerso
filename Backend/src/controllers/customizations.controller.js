import { Customization } from "../models/Customization.js";

export async function getCustomizationsByOrder(req, res) {
  try {
    const { orderId } = req.params;

    const list = await Customization.find({ orderId })
      .populate("productId", "name image")
      .populate("userId", "name email")
      .lean();

    res.json({ ok: true, customizations: list });
  } catch (err) {
    console.error("Error en getCustomizationsByOrder:", err);
    res.status(500).json({ ok: false, message: "Error al obtener personalizaciones" });
  }
}

export async function getAllCustomizations(req, res) {
  try {
    const list = await Customization.find({})
      .sort({ createdAt: -1 })
      .populate("productId", "name image")
      .populate("userId", "name email")
      .lean();

    res.json({ ok: true, customizations: list });
  } catch (err) {
    console.error("Error en getAllCustomizations:", err);
    res.status(500).json({ ok: false, message: "Error al obtener personalizaciones" });
  }
}

export async function updateCustomizationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "reviewing", "approved", "rejected", "completed"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, message: "Estado no válido" });
    }

    const updated = await Customization.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, message: "No encontrado" });
    }

    res.json({ ok: true, customization: updated });
  } catch (err) {
    console.error("Error en updateCustomizationStatus:", err);
    res.status(500).json({ ok: false, message: "Error interno" });
  }
}

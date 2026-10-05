import { Customization } from "../models/Customization.js";
import { Order } from "../models/Order.js";
import { sendTransactionalEmail } from "../services/transactional-email.service.js";

const V2_TRANSITIONS = Object.freeze({
  pending: new Set(["issue"]),
  ready: new Set(["in_production", "issue"]),
  in_production: new Set(["completed", "issue"]),
  completed: new Set([]),
  issue: new Set(["pending"]),
});

function toAdminCustomization(customization) {
  if (customization.schemaVersion !== 2) return customization;
  return {
    ...customization,
    designDocument: undefined,
    productionSurfaces: (customization.productionSurfaces || []).map((surface) => ({
      viewId: surface.viewId,
      surfaceId: surface.surfaceId,
      label: surface.label,
      artwork: {
        filename: surface.artwork?.filename,
        mimeType: surface.artwork?.mimeType,
        widthPx: surface.artwork?.widthPx,
        heightPx: surface.artwork?.heightPx,
        downloadUrl: `/api/customizations/${customization._id}/surfaces/${encodeURIComponent(surface.viewId)}/artwork`,
      },
      preview: surface.preview?.storageKey ? {
        filename: surface.preview.filename,
        mimeType: surface.preview.mimeType,
        widthPx: surface.preview.widthPx,
        heightPx: surface.preview.heightPx,
        url: `/api/customizations/${customization._id}/surfaces/${encodeURIComponent(surface.viewId)}/preview`,
      } : null,
      placementProof: surface.placementProof?.storageKey ? {
        filename: surface.placementProof.filename,
        mimeType: surface.placementProof.mimeType,
        widthPx: surface.placementProof.widthPx,
        heightPx: surface.placementProof.heightPx,
        url: `/api/customizations/${customization._id}/surfaces/${encodeURIComponent(surface.viewId)}/proof`,
      } : null,
      placementMetadata: surface.placementMetadata?.storageKey ? {
        filename: surface.placementMetadata.filename,
        mimeType: surface.placementMetadata.mimeType,
        schemaVersion: surface.placementMetadata.schemaVersion,
        downloadUrl: `/api/customizations/${customization._id}/surfaces/${encodeURIComponent(surface.viewId)}/placement`,
      } : null,
    })),
    productionBundle: {
      available: Boolean(customization.productionBundle?.zipStorageKey),
      generatedAt: customization.productionBundle?.generatedAt || null,
      version: customization.productionBundle?.version || null,
    },
  };
}

export async function getCustomizationsByOrder(req, res) {
  try {
    const { orderId } = req.params;

    const list = await Customization.find({ orderId })
      .populate("productId", "name image")
      .populate("userId", "name email")
      .lean();

    res.json({ ok: true, customizations: list.map(toAdminCustomization) });
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

    res.json({ ok: true, customizations: list.map(toAdminCustomization) });
  } catch (err) {
    console.error("Error en getAllCustomizations:", err);
    res.status(500).json({ ok: false, message: "Error al obtener personalizaciones" });
  }
}

export async function updateCustomizationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const customization = await Customization.findById(id);
    if (!customization) {
      return res.status(404).json({ ok: false, message: "No encontrado" });
    }

    const productionStarted = customization.schemaVersion === 2 && status === "in_production" && customization.productionStatus !== status;
    if (customization.schemaVersion === 2) {
      const current = customization.productionStatus || "pending";
      if (!V2_TRANSITIONS[current]?.has(status)) return res.status(409).json({ ok: false, message: "Transición de producción no permitida" });
      customization.productionStatus = status;
      customization.productionStatusUpdatedAt = new Date();
      customization.productionStatusUpdatedBy = req.userId || null;
    } else {
      const allowed = ["pending", "reviewing", "approved", "rejected", "completed"];
      if (!allowed.includes(status)) return res.status(400).json({ ok: false, message: "Estado no válido" });
      customization.status = status;
    }
    await customization.save();

    if (productionStarted && customization.orderId) {
      const order = await Order.findById(customization.orderId).catch(() => null);
      if (order) await sendTransactionalEmail(order, "ORDER_IN_PRODUCTION").catch(() => console.warn("[email] production log_unavailable", { orderId: String(order._id) }));
    }

    res.json({ ok: true, customization: toAdminCustomization(customization.toObject()) });
  } catch (err) {
    console.error("Error en updateCustomizationStatus:", err);
    res.status(500).json({ ok: false, message: "Error interno" });
  }
}

import { getProductionTemplate } from "../production/template-catalog.js";

export function isDesignerCustomization(customization) {
  return customization?.type === "designer";
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sameStringSelection(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length === 0 || left.length !== right.length) return false;
  if (left.some((value) => !isNonEmptyString(value)) || new Set(left).size !== left.length) return false;
  if (right.some((value) => !isNonEmptyString(value)) || new Set(right).size !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

export function validateDesignerCustomization(customization, product = null) {
  if (!isDesignerCustomization(customization)) {
    return { valid: false, reason: "Falta la personalización Designer" };
  }

  const designVersion = getCustomizationDesignVersion(customization);
  if (designVersion === 1) {
    if (!isRecord(customization.design)) return { valid: false, reason: "Diseño histórico incompleto" };
    if (customization.productId != null && product?._id != null && String(customization.productId) !== String(product._id)) {
      return { valid: false, reason: "El diseño pertenece a otro producto" };
    }
    return { valid: true, designVersion };
  }

  const document = customization.designDocument;
  if (customization.schemaVersion !== 2 || customization.designVersion !== 2) {
    return { valid: false, reason: "Versión Designer V2 incoherente" };
  }
  if (!isNonEmptyString(customization.clientId) || !isRecord(document)) {
    return { valid: false, reason: "Identidad Designer V2 incompleta" };
  }
  if (document.schemaVersion !== 1 || !isNonEmptyString(document.documentId)) {
    return { valid: false, reason: "DesignDocument no soportado" };
  }

  const productId = product?._id ?? product?.id;
  if (!isNonEmptyString(String(customization.productId || ""))
    || String(customization.productId) !== String(document.productId)
    || (productId != null && String(document.productId) !== String(productId))) {
    return { valid: false, reason: "El diseño pertenece a otro producto" };
  }

  const template = getProductionTemplate(product?.productTemplateId || document.templateId);
  if (!template
    || document.templateId !== template.templateId
    || (product?.productTemplateId && document.templateId !== product.productTemplateId)
    || document.templateRevision !== template.templateRevision) {
    return { valid: false, reason: "El ProductTemplate del diseño no es válido" };
  }
  if (!isRecord(document.assets) || !isRecord(document.views)
    || !document.metadata?.createdAt || !document.metadata?.updatedAt) {
    return { valid: false, reason: "DesignDocument incompleto" };
  }
  if (Object.values(document.assets).some((asset) => asset?.qualityStatus === "rejected")) {
    return { valid: false, reason: "El diseño contiene assets rechazados" };
  }

  const pricingEnabled = Boolean(product?.customizationPricing?.enabled);
  const payloadSurfaceIds = customization.selectedSurfaceIds;
  const documentSurfaceIds = document.selectedSurfaceIds;
  let selectedSurfaceIds = null;
  if (pricingEnabled) {
    if (!sameStringSelection(payloadSurfaceIds, documentSurfaceIds)) {
      return { valid: false, reason: "Las superficies seleccionadas no coinciden" };
    }
    selectedSurfaceIds = payloadSurfaceIds;
    if (customization.customizationPricing?.selectedSurfaceIds != null
      && !sameStringSelection(customization.customizationPricing.selectedSurfaceIds, selectedSurfaceIds)) {
      return { valid: false, reason: "El snapshot de precio no coincide con las superficies" };
    }
  } else if (payloadSurfaceIds != null || documentSurfaceIds != null) {
    if (!sameStringSelection(payloadSurfaceIds, documentSurfaceIds)) {
      return { valid: false, reason: "Las superficies seleccionadas no coinciden" };
    }
    selectedSurfaceIds = payloadSurfaceIds;
  }

  const selectedSurfaces = selectedSurfaceIds
    ? template.surfaces.filter((surface) => selectedSurfaceIds.includes(surface.surfaceId))
    : template.surfaces;
  if (selectedSurfaceIds && selectedSurfaces.length !== selectedSurfaceIds.length) {
    return { valid: false, reason: "El diseño contiene superficies no contratadas" };
  }
  const expectedViewIds = selectedSurfaces.map((surface) => surface.viewId);
  if (Object.keys(document.views).length !== expectedViewIds.length
    || expectedViewIds.some((viewId) => !Array.isArray(document.views[viewId]?.elements))) {
    return { valid: false, reason: "Las vistas no coinciden con las superficies contratadas" };
  }
  for (const viewId of expectedViewIds) {
    for (const element of document.views[viewId].elements) {
      if (element?.type === "image" && (!isNonEmptyString(element.assetId) || !document.assets[element.assetId])) {
        return { valid: false, reason: `La vista ${viewId} referencia un asset inexistente` };
      }
    }
  }

  if (!isRecord(customization.uploads?.assets) || !isRecord(customization.uploads?.surfaces)) {
    return { valid: false, reason: "Falta el handoff persistente del diseño" };
  }
  if (expectedViewIds.some((viewId) => {
    const handoff = customization.uploads.surfaces[viewId];
    return !isNonEmptyString(handoff?.artworkUploadId) || !isNonEmptyString(handoff?.proofUploadId);
  })) {
    return { valid: false, reason: "Faltan artifacts productivos del diseño" };
  }
  if (Object.keys(document.assets).some((assetId) => !isNonEmptyString(customization.uploads.assets[assetId]))) {
    return { valid: false, reason: "Falta un asset persistente del diseño" };
  }

  return { valid: true, designVersion, selectedSurfaceIds };
}

export function isValidDesignerCustomization(customization, product = null) {
  return validateDesignerCustomization(customization, product).valid;
}

export function getCustomizationDesignVersion(customization) {
  if (!isDesignerCustomization(customization)) return null;
  return customization.schemaVersion === 2 || customization.designVersion === 2 ? 2 : 1;
}

export function normalizeCustomizationPayload(customization) {
  if (!isDesignerCustomization(customization)) return null;

  const design = customization.design || null;
  const previewsBySide = customization.previewsBySide || design?.previewsBySide || null;
  const previewImage =
    customization.previewImage || previewsBySide?.front || previewsBySide?.back || null;

  return {
    ...customization,
    type: "designer",
    designVersion: getCustomizationDesignVersion(customization),
    design,
    previewsBySide,
    previewImage,
    schemaVersion: customization.schemaVersion === 2 ? 2 : 1,
    designDocument: customization.schemaVersion === 2 ? customization.designDocument || null : null,
    uploads: customization.schemaVersion === 2 ? customization.uploads || null : null,
  };
}

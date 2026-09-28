export function parseDesignerV2Flag(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

export const isProductDesignerV2Enabled = parseDesignerV2Flag(
  import.meta.env?.VITE_PRODUCT_DESIGNER_V2_ENABLED,
);

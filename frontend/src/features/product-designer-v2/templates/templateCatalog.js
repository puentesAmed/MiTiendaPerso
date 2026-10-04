export const PRODUCT_TEMPLATE_IDS = Object.freeze({
  GENERIC_FLAT_DEMO: "generic-flat-demo",
  MUG_CERAMIC_STANDARD_V1: "mug-ceramic-standard-v1",
  TSHIRT_BASIC_V1: "tshirt-basic-v1",
});

const productEligibleTemplateIds = new Set([
  PRODUCT_TEMPLATE_IDS.MUG_CERAMIC_STANDARD_V1,
  PRODUCT_TEMPLATE_IDS.TSHIRT_BASIC_V1,
]);

export function getProductEligibleTemplateIds() {
  return [...productEligibleTemplateIds];
}

export function canUseProductDesignerV2(product) {
  return Boolean(
    product?.customizable
    && typeof product.productTemplateId === "string"
    && productEligibleTemplateIds.has(product.productTemplateId.trim()),
  );
}

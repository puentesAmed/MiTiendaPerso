export function getOrderItemVariant(item) {
  return item?.variant ?? item?.selectedVariant ?? null;
}

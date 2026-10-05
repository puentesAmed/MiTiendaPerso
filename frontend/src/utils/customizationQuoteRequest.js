export function createCustomizationQuoteKey({ productId, canonicalVariantId = null, selectedSurfaceIds }) {
  if (!productId || !Array.isArray(selectedSurfaceIds) || selectedSurfaceIds.length === 0) return null;
  const surfaces = [...selectedSurfaceIds].sort();
  return `${productId}|${canonicalVariantId || "no-variant"}|${surfaces.join("~")}`;
}

export function createCustomizationQuoteCoordinator() {
  let current = null;
  return {
    request(key, request) {
      if (!key || typeof request !== "function") return Promise.reject(new Error("Quote request inválido."));
      if (current?.key === key) {
        if (current.promise) return current.promise;
        return Promise.resolve(current.result);
      }
      const entry = { key, promise: null, result: null };
      entry.promise = Promise.resolve().then(request).then((result) => {
        if (current === entry) {
          entry.result = result;
          entry.promise = null;
        }
        return result;
      });
      current = entry;
      return entry.promise;
    },
    reset() {
      current = null;
    },
  };
}

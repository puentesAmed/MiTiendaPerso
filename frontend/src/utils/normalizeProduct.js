/*

// src/utils/normalizeProduct.js
export function normalizeProduct(product) {
  // Si viene un doc raro, devolvemos tal cual
  if (!product) return product;

  const p = { ...product };

  // ===== NOMBRE (por si en affiliate guardaste title) =====
  if (!p.name && typeof p.title === "string") {
    p.name = p.title;
  }

  // ===== PRECIO -> Number =====
  // Soporta:
  // - price: Number
  // - price: "12.34"
  // - price: { value: 12.34 } / { value: "12.34" }
  // - price: { final: ... } (por compatibilidad con lógica anterior)
  if (p.price != null) {
    let rawPrice = p.price;

    if (typeof rawPrice === "object") {
      rawPrice =
        rawPrice.value ??
        rawPrice.final ??
        rawPrice.cost ?? // último recurso
        0;
    }

    const numPrice = Number(rawPrice);
    p.price = Number.isFinite(numPrice) ? numPrice : 0;
  } else {
    p.price = 0;
  }

  // ===== STOCK (CLAVE FINAL) =====
  // AliExpress NO tiene stock numérico → disponibilidad lógica
  if (typeof p.stock === "object" && p.stock !== null) {
    if (p.stock.available === true) {
      p.stock = 1; // 👉 stock virtual > 0
    } else {
      p.stock = 0;
    }
  } else {
    const num = Number(p.stock);
    p.stock = Number.isFinite(num) ? num : 0;
  }


  // ===== IMAGEN =====
  if (!p.image && Array.isArray(p.images) && p.images.length > 0) {
    p.image = p.images[0];
  }

  return p;
}
*/

export function normalizeProduct(product) {
  if (!product) return product;

  const p = { ...product };

  // ===== TÍTULO (CLAVE) =====
  // AliExpress usa `title`, la UI usa `name`
  if (!p.name && typeof p.title === "string") {
    p.name = p.title;
  }

  // ===== PRECIO =====
  if (typeof p.price === "object" && p.price !== null) {
    const raw =
      p.price.value ??
      p.price.final ??
      p.price.cost ??
      0;

    const num = Number(raw);
    p.price = Number.isFinite(num) ? num : 0;
  }

  // ===== STOCK (CLAVE) =====
  // AliExpress NO tiene stock → disponibilidad lógica
  if (p.provider === "aliexpress") {
    p.stock = 1; // 👈 SIEMPRE disponible
  } else {
    const num = Number(p.stock);
    p.stock = Number.isFinite(num) ? num : 0;
  }

  // ===== IMAGEN =====
  if (!p.image && Array.isArray(p.images) && p.images.length > 0) {
    p.image = p.images[0];
  }

  return p;
}

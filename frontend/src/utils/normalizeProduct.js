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

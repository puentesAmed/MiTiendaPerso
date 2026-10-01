export const VARIANT_COLOR_PRESENTATIONS = Object.freeze([
  Object.freeze({ id: "white", label: "Blanco", labels: Object.freeze(["blanco", "white"]), baseColor: "#ffffff" }),
  Object.freeze({ id: "black", label: "Negro", labels: Object.freeze(["negro", "black"]), baseColor: "#111111" }),
  Object.freeze({ id: "red", label: "Rojo", labels: Object.freeze(["rojo", "red"]), baseColor: "#b91c1c" }),
  Object.freeze({ id: "navy", label: "Azul marino", labels: Object.freeze(["azul marino", "navy"]), baseColor: "#172554" }),
  Object.freeze({ id: "royal-blue", label: "Azul royal", labels: Object.freeze(["azul royal", "royal blue", "royal-blue"]), baseColor: "#1d4ed8" }),
  Object.freeze({ id: "green", label: "Verde", labels: Object.freeze(["verde", "green"]), baseColor: "#166534" }),
  Object.freeze({ id: "yellow", label: "Amarillo", labels: Object.freeze(["amarillo", "yellow"]), baseColor: "#facc15" }),
  Object.freeze({ id: "grey", label: "Gris", labels: Object.freeze(["gris", "gray", "grey"]), baseColor: "#6b7280" }),
]);

export function normalizeVariantColorToken(value) {
  return typeof value === "string"
    ? value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    : "";
}

export function resolveVariantColor(value) {
  const token = normalizeVariantColorToken(value);
  return VARIANT_COLOR_PRESENTATIONS.find((definition) => definition.id === token || definition.labels.includes(token)) ?? null;
}

export function resolveVariantPresentation(variant) {
  const color = resolveVariantColor(variant?.colorId || variant?.color);
  return color ? Object.freeze({ colorId: color.id, colorLabel: color.label, baseColor: color.baseColor }) : null;
}

export function contrastingGuideColor(baseColor) {
  const hex = /^#[0-9a-f]{6}$/i.test(baseColor || "") ? baseColor.slice(1) : "ffffff";
  const channels = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  return luminance < 0.45 ? "#ffffff" : "#334155";
}

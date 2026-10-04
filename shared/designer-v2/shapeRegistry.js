export const DESIGNER_SHAPES = Object.freeze([
  Object.freeze({ id: "rectangle", label: "Rectángulo" }),
  Object.freeze({ id: "circle", label: "Círculo" }),
  Object.freeze({ id: "triangle", label: "Triángulo" }),
  Object.freeze({ id: "star", label: "Estrella" }),
  Object.freeze({ id: "heart", label: "Corazón" }),
  Object.freeze({ id: "line", label: "Línea" }),
]);

const shapeIds = new Set(DESIGNER_SHAPES.map((shape) => shape.id));

export function isDesignerShape(shapeType) {
  return shapeIds.has(shapeType);
}


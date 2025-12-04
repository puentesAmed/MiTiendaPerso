// src/config/designTemplates.js
export const DESIGN_TEMPLATES = {
  tshirt: {
    label: "Camiseta clásica",
    width: 500,
    height: 500,
    frontImage: "/mockups/tshirt-front.png",
    backImage: "/mockups/tshirt-back.png",
    // zona de impresión sobre el mockup
    printArea: { x: 140, y: 120, width: 220, height: 300 },
  },
  hoodie: {
    label: "Sudadera",
    width: 500,
    height: 500,
    frontImage: "/mockups/hoodie-front.png",
    backImage: "/mockups/hoodie-back.png",
    printArea: { x: 140, y: 130, width: 220, height: 280 },
  },
  mug: {
    label: "Taza",
    width: 500,
    height: 400,
    frontImage: "/mockups/mug-front.png",
    backImage: "/mockups/mug-back.png",
    printArea: { x: 80, y: 120, width: 340, height: 160 },
  },
};

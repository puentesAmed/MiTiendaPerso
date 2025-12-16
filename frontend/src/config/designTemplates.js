// src/config/designTemplates.js
import tshirtFront from "../../public/mockups/tshirt/frame-1.png";
import tshirtBack from "../../public/mockups/tshirt/frame-6.png";


export const DESIGN_TEMPLATES = {
  tshirt: {
    width: 550,
    height: 500,
    frontImage: tshirtFront,
    backImage: tshirtBack,
    printArea: { 
      front: {x: 152, y: 110, width: 220, height: 250 },
      back: {x: 140, y: 90, width: 220, height: 250 },
    },
    
    frames360: [
      { src: tshirtFront, side: "front" },
      // si tienes más frames, define cada uno con side apropiado
      { src: tshirtBack, side: "back" },
    ],
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
    width: 400,
    height: 400,
    frontImage: "/mockups/mug-front.png",
    backImage: "/mockups/mug-back.png",
    printArea: { x: 50, y: 90, width: 200, height: 250 },
  },
};

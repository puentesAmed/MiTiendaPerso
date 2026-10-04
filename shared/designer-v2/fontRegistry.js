export const DEFAULT_DESIGNER_FONT_ID = "inter";
export const DESIGNER_FONT_CATEGORIES = Object.freeze(["Modernas", "Elegantes", "Decorativas / manuscritas", "Display"]);

const designerFonts = [
  {
    id: "inter",
    label: "Inter",
    family: "MiTienda Inter",
    category: "Modernas",
    weights: [400, 500, 600, 700],
    fallback: "ui-sans-serif, system-ui, sans-serif",
    source: "/fonts/designer/inter-latin.woff2",
    license: "/fonts/designer/inter-OFL.txt",
    enabled: true,
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: "MiTienda Montserrat",
    category: "Modernas",
    weights: [400, 500, 600, 700],
    fallback: "ui-sans-serif, system-ui, sans-serif",
    source: "/fonts/designer/montserrat-latin.woff2",
    license: "/fonts/designer/montserrat-OFL.txt",
    enabled: true,
  },
  {
    id: "poppins",
    label: "Poppins",
    family: "MiTienda Poppins",
    category: "Modernas",
    weights: [400, 500, 600, 700],
    fallback: "ui-sans-serif, system-ui, sans-serif",
    sources: {
      400: "/fonts/designer/poppins-400-latin.woff2",
      500: "/fonts/designer/poppins-500-latin.woff2",
      600: "/fonts/designer/poppins-600-latin.woff2",
      700: "/fonts/designer/poppins-700-latin.woff2",
    },
    license: "/fonts/designer/poppins-OFL.txt",
    enabled: true,
  },
  {
    id: "roboto",
    label: "Roboto",
    family: "MiTienda Roboto",
    category: "Modernas",
    weights: [400, 500, 700],
    fallback: "ui-sans-serif, system-ui, sans-serif",
    source: "/fonts/designer/roboto-latin.woff2",
    license: "/fonts/designer/roboto-OFL.txt",
    enabled: true,
  },
  {
    id: "open-sans",
    label: "Open Sans",
    family: "MiTienda Open Sans",
    category: "Modernas",
    weights: [400, 500, 600, 700],
    fallback: "ui-sans-serif, system-ui, sans-serif",
    source: "/fonts/designer/open-sans-latin.woff2",
    license: "/fonts/designer/open-sans-OFL.txt",
    enabled: true,
  },
  {
    id: "playfair-display",
    label: "Playfair Display",
    family: "MiTienda Playfair Display",
    category: "Elegantes",
    weights: [400, 600, 700],
    fallback: "ui-serif, Georgia, serif",
    source: "/fonts/designer/playfair-display-latin.woff2",
    license: "/fonts/designer/playfair-display-OFL.txt",
    enabled: true,
  },
  {
    id: "merriweather",
    label: "Merriweather",
    family: "MiTienda Merriweather",
    category: "Elegantes",
    weights: [400, 700],
    fallback: "ui-serif, Georgia, serif",
    source: "/fonts/designer/merriweather-latin.woff2",
    license: "/fonts/designer/merriweather-OFL.txt",
    enabled: true,
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville",
    family: "MiTienda Libre Baskerville",
    category: "Elegantes",
    weights: [400, 700],
    fallback: "ui-serif, Georgia, serif",
    source: "/fonts/designer/libre-baskerville-latin.woff2",
    license: "/fonts/designer/libre-baskerville-OFL.txt",
    enabled: true,
  },
  {
    id: "bebas-neue",
    label: "Bebas Neue",
    family: "MiTienda Bebas Neue",
    category: "Display",
    weights: [400],
    fallback: "Impact, ui-sans-serif, sans-serif",
    source: "/fonts/designer/bebas-neue-latin.woff2",
    license: "/fonts/designer/bebas-neue-OFL.txt",
    enabled: true,
  },
  {
    id: "pacifico",
    label: "Pacifico",
    family: "MiTienda Pacifico",
    category: "Decorativas / manuscritas",
    weights: [400],
    fallback: "cursive",
    source: "/fonts/designer/pacifico-latin.woff2",
    license: "/fonts/designer/pacifico-OFL.txt",
    enabled: true,
  },
  {
    id: "dancing-script",
    label: "Dancing Script",
    family: "MiTienda Dancing Script",
    category: "Decorativas / manuscritas",
    weights: [400, 500, 600, 700],
    fallback: "cursive",
    source: "/fonts/designer/dancing-script-latin.woff2",
    license: "/fonts/designer/dancing-script-OFL.txt",
    enabled: true,
  },
  {
    id: "caveat",
    label: "Caveat",
    family: "MiTienda Caveat",
    category: "Decorativas / manuscritas",
    weights: [400, 500, 600, 700],
    fallback: "cursive",
    source: "/fonts/designer/caveat-latin.woff2",
    license: "/fonts/designer/caveat-OFL.txt",
    enabled: true,
  },
];

export const DESIGNER_FONTS = Object.freeze(designerFonts.map((font) => Object.freeze({
  ...font,
  weights: Object.freeze([...font.weights]),
  ...(font.sources ? { sources: Object.freeze({ ...font.sources }) } : {}),
})));
const fontsById = new Map(DESIGNER_FONTS.map((font) => [font.id, font]));

export function getDesignerFont(fontId = DEFAULT_DESIGNER_FONT_ID) {
  return fontsById.get(fontId) || null;
}

export function isDesignerFontWeightAllowed(fontId, weight) {
  const font = getDesignerFont(fontId);
  return Boolean(font?.enabled && font.weights.includes(weight) && (font.source || font.sources?.[weight]));
}

export function getDesignerFontSource(fontId, weight) {
  const font = getDesignerFont(fontId);
  if (!font?.enabled || !font.weights.includes(weight)) return null;
  return font.sources?.[weight] || font.source || null;
}

export function resolveDesignerFontFamily(fontId = DEFAULT_DESIGNER_FONT_ID) {
  const font = getDesignerFont(fontId);
  return font ? `'${font.family}', ${font.fallback}` : null;
}


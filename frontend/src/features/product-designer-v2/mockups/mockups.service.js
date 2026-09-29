import { apiBaseUrl, http } from "@/services/http";

const errorMessages = {
  ENGINE_DISABLED: "La generación de mockups no está disponible ahora.",
  INVALID_ARTWORK: "No se pudo preparar una imagen válida del diseño.",
  INVALID_MANIFEST: "Este mockup no está configurado correctamente.",
  RENDERING_FAILED: "No se pudo generar el mockup.",
  RENDER_TIMEOUT: "La generación tardó demasiado. Inténtalo de nuevo.",
  STORAGE_FAILED: "El mockup se generó, pero no pudo almacenarse.",
  ENGINE_BUSY: "El generador está ocupado. Inténtalo en unos segundos.",
};

export async function requestMockup({ artwork, templateId, definition, signal, client = http }) {
  const form = new FormData();
  form.append("artwork", artwork, "preview-artwork.png");
  form.append("templateId", templateId);
  form.append("mockupId", definition.mockupId);
  form.append("sourceViewId", definition.sourceViewId);
  try {
    const { data } = await client.post("/api/designer-v2/mockups", form, { signal });
    const base = apiBaseUrl || globalThis.location?.origin || "http://localhost";
    return { ...data.mockup, url: new URL(data.mockup.url, base).toString() };
  } catch (error) {
    if (error.name === "CanceledError" || error.name === "AbortError") throw error;
    const code = error.response?.data?.code || "RENDERING_FAILED";
    throw new Error(errorMessages[code] || errorMessages.RENDERING_FAILED);
  }
}


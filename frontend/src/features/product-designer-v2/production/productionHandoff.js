import { http } from "../../../services/http.js";
import { renderPreviewArtwork } from "../mockups/ArtworkRenderer.js";

async function uploadBlob(blob, filename) {
  const form = new FormData();
  form.append("file", blob, filename);
  const { data } = await http.post("/api/uploads/designer-v2", form);
  if (!data?.uploadId) throw new Error("El servidor no devolvió la referencia persistente del artifact.");
  return data.uploadId;
}

export async function prepareProductionHandoff({ document, template, assetRegistry }) {
  const surfaceEntries = await Promise.all(template.views.map(async (view) => {
    const artwork = await renderPreviewArtwork({ document, template, sourceViewId: view.id, assetRegistry });
    return [view.id, { artworkUploadId: await uploadBlob(artwork, `${view.id}.png`) }];
  }));
  const assetEntries = await Promise.all(Object.keys(document.assets || {}).map(async (assetId) => {
    const blob = assetRegistry.getBlob(assetId);
    if (!blob) throw new Error(`No está disponible el asset ${assetId}.`);
    return [assetId, await uploadBlob(blob, "asset")];
  }));
  return { surfaces: Object.fromEntries(surfaceEntries), assets: Object.fromEntries(assetEntries) };
}

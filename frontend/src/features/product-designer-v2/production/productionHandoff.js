import { http } from "../../../services/http.js";
import { assertNoRejectedImageAssets } from "../assets/imageQuality.js";
import { renderPreviewArtwork } from "../mockups/ArtworkRenderer.js";
import { renderPlacementProof } from "./PlacementProofRenderer.js";
import { ensureDocumentFonts } from "../fonts/fontLoader.js";

async function uploadBlob(blob, filename) {
  const form = new FormData();
  form.append("file", blob, filename);
  const { data } = await http.post("/api/uploads/designer-v2", form);
  if (!data?.uploadId) throw new Error("El servidor no devolvió la referencia persistente del artifact.");
  return data.uploadId;
}

export async function prepareProductionHandoff({ document, template, assetRegistry }) {
  assertNoRejectedImageAssets(document);
  await ensureDocumentFonts(document);
  const surfaceEntries = await Promise.all(template.views.map(async (view) => {
    const [artwork, proof] = await Promise.all([
      renderPreviewArtwork({ document, template, sourceViewId: view.id, assetRegistry }),
      renderPlacementProof({ document, template, view, assetRegistry, productLabel: template.label }),
    ]);
    const [artworkUploadId, proofUploadId] = await Promise.all([
      uploadBlob(artwork, `${view.id}.png`),
      uploadBlob(proof, `${view.id}-placement.png`),
    ]);
    return [view.id, { artworkUploadId, proofUploadId }];
  }));
  const assetEntries = await Promise.all(Object.keys(document.assets || {}).map(async (assetId) => {
    const blob = assetRegistry.getBlob(assetId);
    if (!blob) throw new Error(`No está disponible el asset ${assetId}.`);
    return [assetId, await uploadBlob(blob, "asset")];
  }));
  return { surfaces: Object.fromEntries(surfaceEntries), assets: Object.fromEntries(assetEntries) };
}

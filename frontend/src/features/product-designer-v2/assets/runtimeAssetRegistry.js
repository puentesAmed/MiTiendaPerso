export const IMAGE_MIME_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function createRuntimeAssetRegistry() {
  const urls = new Map();
  return {
    get: (assetId) => urls.get(assetId) || null,
    set(assetId, objectUrl) {
      const previous = urls.get(assetId);
      if (previous && previous !== objectUrl) URL.revokeObjectURL(previous);
      urls.set(assetId, objectUrl);
    },
    remove(assetId) {
      const objectUrl = urls.get(assetId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      urls.delete(assetId);
    },
    dispose() {
      urls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      urls.clear();
    },
  };
}

function decodeImage(objectUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ widthPx: image.naturalWidth, heightPx: image.naturalHeight });
    image.onerror = () => reject(new Error("No se pudo decodificar la imagen."));
    image.src = objectUrl;
  });
}

export function validateImageFile(file) {
  if (!file || !IMAGE_MIME_TYPES.includes(file.type)) throw new Error("Usa una imagen JPEG, PNG o WebP válida.");
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error("La imagen debe ocupar como máximo 10 MiB.");
  return true;
}

export async function prepareImageAsset(file, { idFactory = () => globalThis.crypto.randomUUID() } = {}) {
  validateImageFile(file);
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await decodeImage(objectUrl);
    if (!dimensions.widthPx || !dimensions.heightPx) throw new Error("La imagen no tiene dimensiones válidas.");
    const assetId = idFactory();
    return {
      objectUrl,
      asset: {
        assetId,
        kind: "image",
        mimeType: file.type,
        widthPx: dimensions.widthPx,
        heightPx: dimensions.heightPx,
        sizeBytes: file.size,
        name: file.name || "imagen",
      },
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

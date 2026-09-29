export const IMAGE_MIME_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function createRuntimeAssetRegistry({ urlApi = URL } = {}) {
  const urls = new Map();
  const blobs = new Map();
  return {
    get: (assetId) => urls.get(assetId) || null,
    getBlob: (assetId) => blobs.get(assetId) || null,
    registerBlob(assetId, blob) {
      if (!(blob instanceof Blob)) throw new Error("Blob de asset inválido.");
      const existing = urls.get(assetId);
      if (existing && blobs.get(assetId) === blob) return existing;
      if (existing) urlApi.revokeObjectURL(existing);
      const objectUrl = urlApi.createObjectURL(blob);
      blobs.set(assetId, blob);
      urls.set(assetId, objectUrl);
      return objectUrl;
    },
    set(assetId, objectUrl) {
      const previous = urls.get(assetId);
      if (previous && previous !== objectUrl) urlApi.revokeObjectURL(previous);
      urls.set(assetId, objectUrl);
    },
    remove(assetId) {
      const objectUrl = urls.get(assetId);
      if (objectUrl) urlApi.revokeObjectURL(objectUrl);
      urls.delete(assetId);
      blobs.delete(assetId);
    },
    dispose() {
      urls.forEach((objectUrl) => urlApi.revokeObjectURL(objectUrl));
      urls.clear();
      blobs.clear();
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

function sanitizeOriginalName(name) {
  const sanitized = Array.from(String(name || "imagen"), (character) => {
    const code = character.charCodeAt(0);
    return character === "/" || character === "\\" || code < 32 || code === 127 ? "_" : character;
  }).join("");
  return sanitized.slice(0, 120) || "imagen";
}

export async function prepareImageAsset(file, { idFactory = () => globalThis.crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
  validateImageFile(file);
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await decodeImage(objectUrl);
    if (!dimensions.widthPx || !dimensions.heightPx) throw new Error("La imagen no tiene dimensiones válidas.");
    const assetId = idFactory();
    return {
      blob: file,
      asset: {
        assetId,
        kind: "image",
        mimeType: file.type,
        widthPx: dimensions.widthPx,
        heightPx: dimensions.heightPx,
        sizeBytes: file.size,
        createdAt: now(),
        originalName: sanitizeOriginalName(file.name),
      },
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function restoreRuntimeAssets(document, assetRepository, registry) {
  const missing = [];
  for (const assetId of Object.keys(document.assets || {})) {
    const record = await assetRepository.loadAsset(assetId);
    if (!record?.blob) missing.push(assetId);
    else registry.registerBlob(assetId, record.blob);
  }
  if (missing.length) throw new Error("Faltan assets locales necesarios para continuar el diseño.");
  return true;
}

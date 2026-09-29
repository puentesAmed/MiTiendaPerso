function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

export function createMockupFingerprintInput({ document, template, definition }) {
  const sourceView = document.views[definition.sourceViewId] || { elements: [] };
  const referencedAssetIds = [...new Set(sourceView.elements.filter((element) => element.type === "image").map((element) => element.assetId))].sort();
  return JSON.stringify(canonicalize({
    document: { schemaVersion: document.schemaVersion, templateId: document.templateId, templateRevision: document.templateRevision, view: sourceView, assets: Object.fromEntries(referencedAssetIds.map((id) => [id, document.assets[id]])) },
    template: { templateId: template.templateId, templateRevision: template.templateRevision },
    mockup: { mockupId: definition.mockupId, sourceViewId: definition.sourceViewId, manifestRevision: definition.manifestRevision, previewWidth: definition.previewWidth },
  }));
}

export async function hashMockupFingerprint(input, cryptoApi = globalThis.crypto) {
  const bytes = new TextEncoder().encode(input);
  const digest = await cryptoApi.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function deriveMockupStatus({ result, loading, error, currentFingerprintInput }) {
  if (loading) return "loading";
  if (error) return "error";
  if (!result) return "empty";
  return result.fingerprintInput === currentFingerprintInput ? "ready" : "stale";
}


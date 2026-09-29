function referencedAssetIds(document) {
  const ids = new Set(Object.keys(document?.assets || {}));
  Object.values(document?.views || {}).forEach((view) => view.elements?.forEach((element) => {
    if (element.assetId) ids.add(element.assetId);
  }));
  return ids;
}

export function collectAssetReferenceCounts({ document, history, drafts = [] } = {}) {
  const counts = new Map();
  const addDocument = (candidate) => referencedAssetIds(candidate).forEach((assetId) => counts.set(assetId, (counts.get(assetId) || 0) + 1));
  addDocument(document);
  history?.past?.forEach(addDocument);
  history?.future?.forEach(addDocument);
  drafts.forEach((draft) => {
    const ids = new Set([...(draft.assetIds || []), ...referencedAssetIds(draft.document)]);
    ids.forEach((assetId) => counts.set(assetId, (counts.get(assetId) || 0) + 1));
  });
  return counts;
}

export async function garbageCollectAssets({ assetRepository, draftRepository, document, history, runtimeAssetRegistry }) {
  const [assets, drafts] = await Promise.all([assetRepository.listAssets(), draftRepository.listDrafts()]);
  const counts = collectAssetReferenceCounts({ document, history, drafts });
  const removed = [];
  for (const asset of assets) {
    if ((counts.get(asset.assetId) || 0) === 0) {
      await assetRepository.deleteAsset(asset.assetId);
      runtimeAssetRegistry?.remove(asset.assetId);
      removed.push(asset.assetId);
    }
  }
  return removed;
}


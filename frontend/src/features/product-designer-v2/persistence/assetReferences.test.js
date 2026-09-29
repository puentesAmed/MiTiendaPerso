import test from "node:test";
import assert from "node:assert/strict";
import { collectAssetReferenceCounts, garbageCollectAssets } from "./assetReferences.js";

const documentWith = (assetId) => ({ assets: assetId ? { [assetId]: { assetId } } : {}, views: { primary: { elements: assetId ? [{ assetId }] : [] } } });

test("referencias consideran current, past, future y drafts", () => {
  const counts = collectAssetReferenceCounts({
    document: documentWith("current"),
    history: { past: [documentWith("past")], future: [documentWith("future")] },
    drafts: [{ assetIds: ["draft"], document: documentWith("shared") }],
  });
  ["current", "past", "future", "draft", "shared"].forEach((id) => assert.ok(counts.get(id) > 0));
  assert.equal(counts.get("orphan"), undefined);
});

test("GC conserva referencias y elimina únicamente huérfanos tras delete draft", async () => {
  const assets = new Map(["current", "past", "future", "draft", "orphan"].map((assetId) => [assetId, { assetId }]));
  let drafts = [{ draftId: "draft-1", assetIds: ["draft"], document: documentWith("draft") }];
  const removedRuntime = [];
  const assetRepository = { listAssets: async () => [...assets.values()], deleteAsset: async (id) => assets.delete(id) };
  const draftRepository = { listDrafts: async () => drafts };
  let removed = await garbageCollectAssets({ assetRepository, draftRepository, document: documentWith("current"), history: { past: [documentWith("past")], future: [documentWith("future")] }, runtimeAssetRegistry: { remove: (id) => removedRuntime.push(id) } });
  assert.deepEqual(removed, ["orphan"]);
  drafts = [];
  removed = await garbageCollectAssets({ assetRepository, draftRepository, document: documentWith("current"), history: { past: [documentWith("past")], future: [documentWith("future")] } });
  assert.deepEqual(removed, ["draft"]);
});


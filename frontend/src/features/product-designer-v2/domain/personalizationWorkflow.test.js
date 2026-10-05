import test from "node:test";
import assert from "node:assert/strict";
import { createPersonalizationWorkflow, getCurrentDesignQuantity, nextPersonalizationDesign, nextPersonalizationRouteState, normalizePersonalizationWorkflow } from "./personalizationWorkflow.js";

const workflowId = "ca1452de-1111-4111-8111-123456789abc";

test("una unidad mantiene flujo simple; mismo diseño asigna cantidad total", () => {
  assert.equal(createPersonalizationWorkflow(1, "same"), null);
  const workflow = createPersonalizationWorkflow(3, "same", () => workflowId);
  assert.equal(getCurrentDesignQuantity(workflow), 3);
  assert.equal(nextPersonalizationDesign(workflow), null);
});

test("diseños diferentes avanzan con identidad estable y una unidad por paso", () => {
  const first = createPersonalizationWorkflow(3, "different", () => workflowId);
  const second = nextPersonalizationDesign(first);
  const third = nextPersonalizationDesign(second);
  assert.deepEqual([first.currentIndex, second.currentIndex, third.currentIndex], [1, 2, 3]);
  assert.equal(new Set([first.workflowId, second.workflowId, third.workflowId]).size, 1);
  assert.equal(getCurrentDesignQuantity(third), 1);
  assert.equal(nextPersonalizationDesign(third), null);
  assert.deepEqual(normalizePersonalizationWorkflow(second), second);
  assert.equal(normalizePersonalizationWorkflow({ ...second, currentIndex: 4 }), null);
  const routeState = { variant: { size: "M", color: "BLANCO" }, selectedSurfaceIds: ["tshirt-front"], customizationQuote: { unitPrice: 19.9 }, personalizationWorkflow: first };
  const nextState = nextPersonalizationRouteState(routeState);
  assert.equal(nextState.personalizationWorkflow.currentIndex, 2);
  assert.equal(nextState.variant, routeState.variant);
  assert.equal(nextState.selectedSurfaceIds, routeState.selectedSurfaceIds);
  assert.equal(nextState.customizationQuote, routeState.customizationQuote);
});

export function normalizePersonalizationWorkflow(value) {
  if (!value || !["same", "different"].includes(value.mode)) return null;
  if (!Number.isInteger(value.totalQuantity) || value.totalQuantity < 2) return null;
  if (!Number.isInteger(value.currentIndex) || value.currentIndex < 1 || value.currentIndex > value.totalQuantity) return null;
  if (typeof value.workflowId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.workflowId)) return null;
  if (value.mode === "same" && value.currentIndex !== 1) return null;
  return { mode: value.mode, totalQuantity: value.totalQuantity, currentIndex: value.currentIndex, workflowId: value.workflowId };
}

export function createPersonalizationWorkflow(quantity, mode, idFactory = () => globalThis.crypto.randomUUID()) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Cantidad inválida.");
  if (quantity === 1) return null;
  if (!["same", "different"].includes(mode)) throw new Error("Modo de personalización inválido.");
  return { mode, totalQuantity: quantity, currentIndex: 1, workflowId: idFactory() };
}

export function getCurrentDesignQuantity(workflow) {
  return workflow?.mode === "same" ? workflow.totalQuantity : 1;
}

export function nextPersonalizationDesign(workflow) {
  return workflow?.mode === "different" && workflow.currentIndex < workflow.totalQuantity
    ? { ...workflow, currentIndex: workflow.currentIndex + 1 }
    : null;
}

export function nextPersonalizationRouteState(state) {
  const nextDesign = nextPersonalizationDesign(normalizePersonalizationWorkflow(state?.personalizationWorkflow));
  return nextDesign ? { ...state, personalizationWorkflow: nextDesign } : null;
}

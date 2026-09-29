import { addImage, addText, deleteElements, duplicateElement, moveElementLayer, updateElement, updateElements } from "../domain/designDocumentActions.js";
import { createDocumentHistory, pushDocument, redoDocument, undoDocument } from "./documentHistory.js";
import { getViewPrintAreas } from "../contracts/printSurface.js";

export const initialDesignerV2State = Object.freeze({
  documentState: { document: null },
  sessionState: { activeViewId: null, activePrintAreaId: null, selectedElementIds: [], zoom: 1, pan: { x: 0, y: 0 }, activeTool: "select", mode: "design", dirty: false, saveStatus: "idle", savedDocument: null, lastSavedAt: null, saveError: null, conflict: false },
  historyState: createDocumentHistory(null),
  asyncState: { status: "loading", product: null, template: null, assets: null, error: null },
});

function selectedIdsInActiveView(state, document) {
  const ids = new Set(document?.views[state.sessionState.activeViewId]?.elements.map((element) => element.id) || []);
  return state.sessionState.selectedElementIds.filter((id) => ids.has(id));
}

function commitDocument(state, document, { selectedElementIds, groupKey = null } = {}) {
  if (!document || document === state.documentState.document) return state;
  const historyState = pushDocument(state.historyState, document, groupKey);
  return {
    ...state,
    documentState: { document },
    historyState,
    sessionState: { ...state.sessionState, dirty: document !== state.sessionState.savedDocument, saveStatus: "dirty", saveError: null, conflict: false, selectedElementIds: selectedElementIds ?? selectedIdsInActiveView(state, document) },
  };
}

function restoreHistory(state, historyState) {
  if (historyState === state.historyState) return state;
  return {
    ...state,
    documentState: { document: historyState.present },
    historyState,
    sessionState: { ...state.sessionState, dirty: historyState.present !== state.sessionState.savedDocument, saveStatus: historyState.present === state.sessionState.savedDocument ? "clean" : "dirty", saveError: null, conflict: false, selectedElementIds: selectedIdsInActiveView(state, historyState.present) },
  };
}

export function designerV2Reducer(state, action) {
  switch (action.type) {
    case "loading":
      return { ...state, asyncState: { status: "loading", product: null, template: null, assets: null, error: null } };
    case "ready": {
      const document = action.payload.document;
      return {
        documentState: { document },
        sessionState: { ...initialDesignerV2State.sessionState, activeViewId: action.payload.template.views[0].id, activePrintAreaId: getViewPrintAreas(action.payload.template, action.payload.template.views[0])[0].id },
        historyState: createDocumentHistory(document),
        asyncState: { status: "ready", product: action.payload.product, template: action.payload.template, assets: action.payload.assets ?? null, error: null },
      };
    }
    case "failed":
      return { ...state, asyncState: { status: "error", product: action.payload.product ?? null, template: null, assets: null, error: action.payload.error } };
    case "document-restored": {
      const document = action.payload.document;
      const view = state.asyncState.template.views[0];
      return {
        ...state,
        documentState: { document },
        historyState: createDocumentHistory(document),
        sessionState: { ...initialDesignerV2State.sessionState, activeViewId: view.id, activePrintAreaId: getViewPrintAreas(state.asyncState.template, view)[0].id, savedDocument: action.payload.savedAt ? document : null, saveStatus: action.payload.savedAt ? "clean" : "idle", lastSavedAt: action.payload.savedAt ?? null },
      };
    }
    case "view-selected": {
      const view = state.asyncState.template?.views.find((candidate) => candidate.id === action.payload);
      if (!view) return state;
      return { ...state, historyState: { ...state.historyState, lastGroupKey: null }, sessionState: { ...state.sessionState, activeViewId: view.id, activePrintAreaId: getViewPrintAreas(state.asyncState.template, view)[0].id, selectedElementIds: [] } };
    }
    case "selection-changed": {
      const selectedElementIds = Array.isArray(action.payload) ? [...new Set(action.payload.filter(Boolean))] : action.payload ? [action.payload] : [];
      return { ...state, historyState: { ...state.historyState, lastGroupKey: null }, sessionState: { ...state.sessionState, selectedElementIds } };
    }
    case "print-area-selected":
      return { ...state, historyState: { ...state.historyState, lastGroupKey: null }, sessionState: { ...state.sessionState, activePrintAreaId: action.payload } };
    case "viewport-changed":
      return { ...state, historyState: { ...state.historyState, lastGroupKey: null }, sessionState: { ...state.sessionState, zoom: action.payload.zoom, pan: action.payload.pan } };
    case "mode-changed":
      if (!["design", "mockup", "three-d"].includes(action.payload)) return state;
      return { ...state, sessionState: { ...state.sessionState, mode: action.payload, selectedElementIds: action.payload === "design" ? state.sessionState.selectedElementIds : [] } };
    case "text-added": {
      const result = addText(state.documentState.document, action.payload);
      return commitDocument(state, result.document, { selectedElementIds: [result.element.id] });
    }
    case "image-added": {
      const result = addImage(state.documentState.document, action.payload);
      return commitDocument(state, result.document, { selectedElementIds: [result.element.id] });
    }
    case "element-updated": {
      const result = updateElement(state.documentState.document, action.payload);
      return result.element ? commitDocument(state, result.document, { groupKey: action.meta?.groupKey }) : state;
    }
    case "elements-updated": {
      const result = updateElements(state.documentState.document, action.payload);
      return result.elements.length ? commitDocument(state, result.document, { groupKey: action.meta?.groupKey }) : state;
    }
    case "elements-deleted": {
      const result = deleteElements(state.documentState.document, action.payload);
      return result.removed.length ? commitDocument(state, result.document, { selectedElementIds: [] }) : state;
    }
    case "element-duplicated": {
      const result = duplicateElement(state.documentState.document, action.payload);
      return result.element ? commitDocument(state, result.document, { selectedElementIds: [result.element.id] }) : state;
    }
    case "layer-moved": {
      const result = moveElementLayer(state.documentState.document, action.payload);
      return result.moved ? commitDocument(state, result.document) : state;
    }
    case "undo":
      return restoreHistory(state, undoDocument(state.historyState));
    case "redo":
      return restoreHistory(state, redoDocument(state.historyState));
    case "save-started":
      return { ...state, sessionState: { ...state.sessionState, saveStatus: "saving", saveError: null, conflict: false } };
    case "save-succeeded": {
      const clean = state.documentState.document === action.payload.document;
      return { ...state, sessionState: { ...state.sessionState, savedDocument: action.payload.document, dirty: !clean, saveStatus: clean ? "clean" : "dirty", lastSavedAt: action.payload.savedAt, saveError: null, conflict: false } };
    }
    case "save-failed":
      return { ...state, sessionState: { ...state.sessionState, dirty: true, saveStatus: "error", saveError: action.payload.message, conflict: Boolean(action.payload.conflict) } };
    default:
      return state;
  }
}

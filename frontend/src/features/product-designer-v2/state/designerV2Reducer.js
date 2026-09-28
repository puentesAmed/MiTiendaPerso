import { addImage, addText, deleteElement, duplicateElement, updateElement } from "../domain/designDocumentActions.js";

export const initialDesignerV2State = Object.freeze({
  documentState: { document: null },
  sessionState: { activeViewId: null, activePrintAreaId: null, selectedElementId: null, zoom: 1, mode: "design" },
  asyncState: { status: "loading", product: null, template: null, error: null },
});

export function designerV2Reducer(state, action) {
  switch (action.type) {
    case "loading":
      return { ...state, asyncState: { status: "loading", product: null, template: null, error: null } };
    case "ready":
      return {
        documentState: { document: action.payload.document },
        sessionState: {
          ...state.sessionState,
          activeViewId: action.payload.template.views[0].id,
          activePrintAreaId: action.payload.template.views[0].printAreas[0].id,
          selectedElementId: null,
        },
        asyncState: { status: "ready", product: action.payload.product, template: action.payload.template, error: null },
      };
    case "failed":
      return { ...state, asyncState: { status: "error", product: action.payload.product ?? null, template: null, error: action.payload.error } };
    case "view-selected":
      if (!state.asyncState.template?.views.some((view) => view.id === action.payload)) return state;
      return {
        ...state,
        sessionState: {
          ...state.sessionState,
          activeViewId: action.payload,
          activePrintAreaId: state.asyncState.template.views.find((view) => view.id === action.payload).printAreas[0].id,
          selectedElementId: null,
        },
      };
    case "selection-changed":
      return { ...state, sessionState: { ...state.sessionState, selectedElementId: action.payload } };
    case "print-area-selected":
      return { ...state, sessionState: { ...state.sessionState, activePrintAreaId: action.payload } };
    case "text-added": {
      const result = addText(state.documentState.document, action.payload);
      return {
        ...state,
        documentState: { document: result.document },
        sessionState: { ...state.sessionState, selectedElementId: result.element.id },
      };
    }
    case "image-added": {
      const result = addImage(state.documentState.document, action.payload);
      return {
        ...state,
        documentState: { document: result.document },
        sessionState: { ...state.sessionState, selectedElementId: result.element.id },
      };
    }
    case "element-updated": {
      const result = updateElement(state.documentState.document, action.payload);
      return result.element ? { ...state, documentState: { document: result.document } } : state;
    }
    case "element-deleted": {
      const result = deleteElement(state.documentState.document, action.payload);
      return result.removed ? {
        ...state,
        documentState: { document: result.document },
        sessionState: { ...state.sessionState, selectedElementId: null },
      } : state;
    }
    case "element-duplicated": {
      const result = duplicateElement(state.documentState.document, action.payload);
      return result.element ? {
        ...state,
        documentState: { document: result.document },
        sessionState: { ...state.sessionState, selectedElementId: result.element.id },
      } : state;
    }
    default:
      return state;
  }
}

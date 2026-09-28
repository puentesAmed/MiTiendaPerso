export const initialDesignerV2State = Object.freeze({
  documentState: { document: null },
  sessionState: { activeViewId: null, selection: [], zoom: 1, mode: "design" },
  asyncState: { status: "loading", product: null, template: null, error: null },
});

export function designerV2Reducer(state, action) {
  switch (action.type) {
    case "loading":
      return { ...state, asyncState: { status: "loading", product: null, template: null, error: null } };
    case "ready":
      return {
        documentState: { document: action.payload.document },
        sessionState: { ...state.sessionState, activeViewId: action.payload.template.views[0].id },
        asyncState: { status: "ready", product: action.payload.product, template: action.payload.template, error: null },
      };
    case "failed":
      return { ...state, asyncState: { status: "error", product: action.payload.product ?? null, template: null, error: action.payload.error } };
    case "view-selected":
      if (!state.asyncState.template?.views.some((view) => view.id === action.payload)) return state;
      return { ...state, sessionState: { ...state.sessionState, activeViewId: action.payload, selection: [] } };
    default:
      return state;
  }
}

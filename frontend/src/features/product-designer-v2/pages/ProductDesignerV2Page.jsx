import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/ui/PageContainer";
import { apiGetProductById } from "@/services/products.service";
import { createDesignDocument } from "../contracts/designDocument.js";
import { validateProductTemplate } from "../contracts/productTemplate.js";
import { DesignerV2Shell } from "../components/DesignerV2Shell.jsx";
import { designerV2Reducer, initialDesignerV2State } from "../state/designerV2Reducer.js";
import { resolveProductTemplate } from "../templates/templateRepository.js";
import { isProductDesignerV2Enabled } from "../utils/featureFlag.js";
import { createRuntimeAssetRegistry, prepareImageAsset } from "../assets/runtimeAssetRegistry.js";

const statusCopy = {
  disabled: ["Designer V2 no disponible", "Activa VITE_PRODUCT_DESIGNER_V2_ENABLED para acceder a esta foundation."],
  "not-found": ["Producto no encontrado", "No existe un producto para esta ruta."],
  incompatible: ["Producto sin template compatible", "Este producto todavía no tiene una relación de desarrollo con ProductTemplate."],
  "invalid-template": ["Template inválido", "El ProductTemplate no supera la validación del contrato v1."],
  load: ["No se pudo abrir Designer V2", "No se pudo cargar el producto. Inténtalo de nuevo."],
};

export function ProductDesignerV2Page() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(designerV2Reducer, initialDesignerV2State);
  const [editorError, setEditorError] = useState("");
  const assetRegistry = useMemo(() => createRuntimeAssetRegistry(), []);

  useEffect(() => () => assetRegistry.dispose(), [assetRegistry]);

  useEffect(() => {
    let active = true;
    if (!isProductDesignerV2Enabled) {
      dispatch({ type: "failed", payload: { error: { code: "disabled" } } });
      return () => { active = false; };
    }

    dispatch({ type: "loading" });
    apiGetProductById(productId)
      .then((product) => {
        if (!active) return;
        if (!product) {
          dispatch({ type: "failed", payload: { error: { code: "not-found" } } });
          return;
        }
        const template = resolveProductTemplate(product);
        if (!template) {
          dispatch({ type: "failed", payload: { product, error: { code: "incompatible" } } });
          return;
        }
        const validation = validateProductTemplate(template);
        if (!validation.valid) {
          dispatch({ type: "failed", payload: { product, error: { code: "invalid-template", details: validation.errors } } });
          return;
        }
        const document = createDesignDocument({
          template,
          productId: product.id || product._id,
          variant: location.state?.variant || null,
        });
        dispatch({ type: "ready", payload: { product, template, document } });
      })
      .catch(() => {
        if (active) dispatch({ type: "failed", payload: { error: { code: "load" } } });
      });

    return () => { active = false; };
  }, [location.state?.variant, productId]);

  const handleBack = () => {
    if (location.state?.fromProductDetail) navigate(-1);
    else navigate(`/productos/${productId}`);
  };

  const handleAddText = useCallback(() => {
    setEditorError("");
    dispatch({
      type: "text-added",
      payload: {
        viewId: state.sessionState.activeViewId,
        printAreaId: state.sessionState.activePrintAreaId,
      },
    });
  }, [state.sessionState.activePrintAreaId, state.sessionState.activeViewId]);

  const handleChooseImage = useCallback(async (file) => {
    setEditorError("");
    try {
      const { asset, objectUrl } = await prepareImageAsset(file);
      assetRegistry.set(asset.assetId, objectUrl);
      const activeView = state.asyncState.template.views.find((view) => view.id === state.sessionState.activeViewId);
      const activeArea = activeView.printAreas.find((area) => area.id === state.sessionState.activePrintAreaId);
      dispatch({
        type: "image-added",
        payload: {
          viewId: state.sessionState.activeViewId,
          printAreaId: state.sessionState.activePrintAreaId,
          asset,
          aspectRatio: asset.widthPx / asset.heightPx,
          printAreaAspectRatio: (activeArea.width * activeView.canvas.aspectRatio) / activeArea.height,
        },
      });
    } catch (error) {
      setEditorError(error.message || "No se pudo añadir la imagen.");
    }
  }, [assetRegistry, state.asyncState.template, state.sessionState.activePrintAreaId, state.sessionState.activeViewId]);

  const handleUpdateElement = useCallback((elementIdOrPatch, possiblePatch, options) => {
    const fromAdapter = typeof elementIdOrPatch === "string";
    const elementId = fromAdapter ? elementIdOrPatch : state.sessionState.selectedElementIds[0];
    const patch = fromAdapter ? possiblePatch : elementIdOrPatch;
    const meta = fromAdapter ? options : possiblePatch;
    if (!elementId || !patch) return;
    dispatch({ type: "element-updated", payload: { viewId: state.sessionState.activeViewId, elementId, patch }, meta });
  }, [state.sessionState.activeViewId, state.sessionState.selectedElementIds]);

  const handleUpdateElements = useCallback((updates) => {
    dispatch({ type: "elements-updated", payload: { viewId: state.sessionState.activeViewId, updates } });
  }, [state.sessionState.activeViewId]);

  const handleDuplicate = useCallback(() => {
    if (state.sessionState.selectedElementIds.length !== 1) return;
    dispatch({ type: "element-duplicated", payload: { viewId: state.sessionState.activeViewId, elementId: state.sessionState.selectedElementIds[0] } });
  }, [state.sessionState.activeViewId, state.sessionState.selectedElementIds]);

  const handleDelete = useCallback(() => {
    if (!state.sessionState.selectedElementIds.length) return;
    dispatch({ type: "elements-deleted", payload: { viewId: state.sessionState.activeViewId, elementIds: state.sessionState.selectedElementIds } });
  }, [state.sessionState.activeViewId, state.sessionState.selectedElementIds]);

  const handleLayerAction = useCallback((elementId, action) => {
    const element = state.documentState.document.views[state.sessionState.activeViewId]?.elements.find((candidate) => candidate.id === elementId);
    if (!element) return;
    if (action === "forward" || action === "backward") {
      dispatch({ type: "layer-moved", payload: { viewId: state.sessionState.activeViewId, elementId, direction: action } });
    } else if (action === "lock") {
      dispatch({ type: "element-updated", payload: { viewId: state.sessionState.activeViewId, elementId, patch: { locked: !element.locked } } });
    } else if (action === "hide") {
      dispatch({ type: "element-updated", payload: { viewId: state.sessionState.activeViewId, elementId, patch: { hidden: !element.hidden } } });
    } else if (action === "delete") {
      dispatch({ type: "elements-deleted", payload: { viewId: state.sessionState.activeViewId, elementIds: [elementId] } });
    }
  }, [state.documentState.document, state.sessionState.activeViewId]);

  const handleViewportChange = useCallback((viewport) => {
    dispatch({ type: "viewport-changed", payload: viewport });
  }, []);

  const handleZoomChange = useCallback((zoom) => {
    const nextZoom = Math.min(2, Math.max(0.5, zoom));
    dispatch({ type: "viewport-changed", payload: { zoom: nextZoom, pan: nextZoom === 1 ? { x: 0, y: 0 } : state.sessionState.pan } });
  }, [state.sessionState.pan]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const key = event.key.toLowerCase();
      if (event.key === "Escape") dispatch({ type: "selection-changed", payload: [] });
      if ((event.key === "Delete" || event.key === "Backspace") && state.sessionState.selectedElementIds.length) {
        event.preventDefault();
        handleDelete();
      }
      if ((event.ctrlKey || event.metaKey) && key === "d" && state.sessionState.selectedElementIds.length === 1) {
        event.preventDefault();
        handleDuplicate();
      }
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
      }
      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDelete, handleDuplicate, state.sessionState.selectedElementIds]);

  useEffect(() => {
    if (!state.sessionState.dirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.sessionState.dirty]);

  if (state.asyncState.status === "loading") {
    return <PageContainer><LoadingState message="Preparando Designer V2…" className="min-h-[60vh]" /></PageContainer>;
  }

  if (state.asyncState.status === "error") {
    const code = state.asyncState.error?.code || "load";
    const [title, description] = statusCopy[code] || statusCopy.load;
    const action = <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft aria-hidden="true" /> Volver al producto</Button>;
    return (
      <PageContainer className="min-h-[60vh] py-10">
        {code === "load" || code === "invalid-template" ? (
          <div className="space-y-4"><ErrorState title={title} description={description} />{action}</div>
        ) : (
          <EmptyState title={title} description={description} action={action} />
        )}
      </PageContainer>
    );
  }

  return (
    <DesignerV2Shell
      product={state.asyncState.product}
      template={state.asyncState.template}
      document={state.documentState.document}
      activeViewId={state.sessionState.activeViewId}
      activePrintAreaId={state.sessionState.activePrintAreaId}
      selectedElementIds={state.sessionState.selectedElementIds}
      zoom={state.sessionState.zoom}
      pan={state.sessionState.pan}
      dirty={state.sessionState.dirty}
      canUndo={state.historyState.past.length > 0}
      canRedo={state.historyState.future.length > 0}
      assetRegistry={assetRegistry}
      editorError={editorError}
      onSelectView={(viewId) => dispatch({ type: "view-selected", payload: viewId })}
      onSelectElement={(elementId) => dispatch({ type: "selection-changed", payload: elementId })}
      onAddText={handleAddText}
      onChooseImage={handleChooseImage}
      onUpdateElement={handleUpdateElement}
      onUpdateElements={handleUpdateElements}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
      onLayerAction={handleLayerAction}
      onUndo={() => dispatch({ type: "undo" })}
      onRedo={() => dispatch({ type: "redo" })}
      onZoomChange={handleZoomChange}
      onViewportChange={handleViewportChange}
      onEditorError={setEditorError}
      onBack={handleBack}
    />
  );
}

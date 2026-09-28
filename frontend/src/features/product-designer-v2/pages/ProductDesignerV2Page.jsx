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

  const handleUpdateElement = useCallback((elementIdOrPatch, possiblePatch) => {
    const fromAdapter = typeof elementIdOrPatch === "string";
    const elementId = fromAdapter ? elementIdOrPatch : state.sessionState.selectedElementId;
    const patch = fromAdapter ? possiblePatch : elementIdOrPatch;
    if (!elementId || !patch) return;
    dispatch({ type: "element-updated", payload: { viewId: state.sessionState.activeViewId, elementId, patch } });
  }, [state.sessionState.activeViewId, state.sessionState.selectedElementId]);

  const handleDuplicate = useCallback(() => {
    if (!state.sessionState.selectedElementId) return;
    dispatch({ type: "element-duplicated", payload: { viewId: state.sessionState.activeViewId, elementId: state.sessionState.selectedElementId } });
  }, [state.sessionState.activeViewId, state.sessionState.selectedElementId]);

  const handleDelete = useCallback(() => {
    const elementId = state.sessionState.selectedElementId;
    if (!elementId) return;
    const element = state.documentState.document?.views[state.sessionState.activeViewId]?.elements.find((candidate) => candidate.id === elementId);
    dispatch({ type: "element-deleted", payload: { viewId: state.sessionState.activeViewId, elementId } });
    if (element?.assetId) {
      const references = Object.values(state.documentState.document.views)
        .flatMap((view) => view.elements)
        .filter((candidate) => candidate.assetId === element.assetId).length;
      if (references === 1) assetRegistry.remove(element.assetId);
    }
  }, [assetRegistry, state.documentState.document, state.sessionState.activeViewId, state.sessionState.selectedElementId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.key === "Escape") dispatch({ type: "selection-changed", payload: null });
      if ((event.key === "Delete" || event.key === "Backspace") && state.sessionState.selectedElementId) {
        event.preventDefault();
        handleDelete();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && state.sessionState.selectedElementId) {
        event.preventDefault();
        handleDuplicate();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDelete, handleDuplicate, state.sessionState.selectedElementId]);

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
      selectedElementId={state.sessionState.selectedElementId}
      assetRegistry={assetRegistry}
      editorError={editorError}
      onSelectView={(viewId) => dispatch({ type: "view-selected", payload: viewId })}
      onSelectElement={(elementId) => dispatch({ type: "selection-changed", payload: elementId })}
      onAddText={handleAddText}
      onChooseImage={handleChooseImage}
      onUpdateElement={handleUpdateElement}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
      onEditorError={setEditorError}
      onBack={handleBack}
    />
  );
}

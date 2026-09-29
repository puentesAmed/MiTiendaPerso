import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
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
import { DraftRecoveryDialog } from "../components/DraftRecoveryDialog.jsx";
import { designerV2Reducer, initialDesignerV2State } from "../state/designerV2Reducer.js";
import { resolveProductTemplate } from "../templates/templateRepository.js";
import { isProductDesignerV2Enabled } from "../utils/featureFlag.js";
import { createRuntimeAssetRegistry, prepareImageAsset, restoreRuntimeAssets } from "../assets/runtimeAssetRegistry.js";
import { createIndexedDbStorage, isQuotaError } from "../persistence/indexedDbStorage.js";
import { createDraftRepository, DraftConflictError, IncompatibleDraftError } from "../persistence/DraftRepository.js";
import { createAssetRepository } from "../persistence/AssetRepository.js";
import { createDraft } from "../persistence/draftModel.js";
import { createAutosaveScheduler } from "../persistence/autosaveScheduler.js";
import { garbageCollectAssets } from "../persistence/assetReferences.js";

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
  const [recoveryDraft, setRecoveryDraft] = useState(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryCompatible, setRecoveryCompatible] = useState(true);
  const assetRegistry = useMemo(() => createRuntimeAssetRegistry(), []);
  const storage = useMemo(() => createIndexedDbStorage(), []);
  const draftRepository = useMemo(() => createDraftRepository(storage), [storage]);
  const assetRepository = useMemo(() => createAssetRepository(storage), [storage]);
  const activeDraftRef = useRef(null);
  const savedRevisionRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const historyRef = useRef(state.historyState);
  const saveHandlerRef = useRef(null);
  const autosaveScheduler = useMemo(() => createAutosaveScheduler((document) => saveHandlerRef.current?.(document)), []);

  const draftReferenceKey = useCallback((document) => `designer-v2:draft-ref:${document.productId}:${document.templateId}:${document.templateRevision}`, []);

  useEffect(() => () => {
    autosaveScheduler.cancel();
    assetRegistry.dispose();
  }, [assetRegistry, autosaveScheduler]);

  useEffect(() => {
    historyRef.current = state.historyState;
  }, [state.historyState]);

  useEffect(() => {
    let active = true;
    if (!isProductDesignerV2Enabled) {
      dispatch({ type: "failed", payload: { error: { code: "disabled" } } });
      return () => { active = false; };
    }

    dispatch({ type: "loading" });
    activeDraftRef.current = null;
    savedRevisionRef.current = null;
    setRecoveryDraft(null);
    setRecoveryError("");
    setRecoveryCompatible(true);
    apiGetProductById(productId)
      .then(async (product) => {
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
        try {
          const referencedDraftId = localStorage.getItem(draftReferenceKey(document));
          if (!referencedDraftId) return;
          const draft = await draftRepository.loadDraft(referencedDraftId, { template, productId: document.productId });
          if (active && draft) setRecoveryDraft(draft);
        } catch (error) {
          if (!active) return;
          if (error instanceof IncompatibleDraftError) {
            setRecoveryDraft(error.draft);
            setRecoveryCompatible(false);
            setRecoveryError("El diseño guardado no es compatible con esta versión. No se restaurará; puedes descartarlo explícitamente para empezar de nuevo.");
          }
          else setEditorError("No se puede guardar automáticamente en este dispositivo.");
        }
      })
      .catch(() => {
        if (active) dispatch({ type: "failed", payload: { error: { code: "load" } } });
      });

    return () => { active = false; };
  }, [draftReferenceKey, draftRepository, location.state?.variant, productId]);

  const handleBack = () => {
    if (location.state?.fromProductDetail) navigate(-1);
    else navigate(`/productos/${productId}`);
  };

  const persistDocument = useCallback(async (document, { force = false } = {}) => {
    dispatch({ type: "save-started" });
    try {
      const assetIds = Object.keys(document.assets || {});
      const assetChecks = await Promise.all(assetIds.map((assetId) => assetRepository.hasAsset(assetId)));
      if (assetChecks.some((exists) => !exists)) throw new Error("Faltan assets locales para guardar este diseño.");
      const baseDraft = activeDraftRef.current || createDraft({ document });
      const saved = await draftRepository.saveDraft({ ...baseDraft, document }, { expectedRevision: savedRevisionRef.current, force });
      activeDraftRef.current = saved;
      savedRevisionRef.current = saved.revision;
      try { localStorage.setItem(draftReferenceKey(document), saved.draftId); } catch { /* referencia opcional */ }
      dispatch({ type: "save-succeeded", payload: { document, savedAt: saved.updatedAt } });
      await garbageCollectAssets({ assetRepository, draftRepository, document, history: historyRef.current, runtimeAssetRegistry: assetRegistry });
      return saved;
    } catch (error) {
      const conflict = error instanceof DraftConflictError;
      const message = conflict
        ? "Este diseño cambió en otra pestaña. Recarga la copia guardada o sobrescribe explícitamente."
        : isQuotaError(error)
          ? "No hay espacio suficiente para guardar en este dispositivo. La edición actual sigue en memoria."
          : "No se puede guardar automáticamente en este dispositivo.";
      dispatch({ type: "save-failed", payload: { message, conflict } });
      return null;
    }
  }, [assetRegistry, assetRepository, draftReferenceKey, draftRepository]);

  const enqueueSave = useCallback((document, options) => {
    const queued = saveQueueRef.current.catch(() => undefined).then(() => persistDocument(document, options));
    saveQueueRef.current = queued;
    return queued;
  }, [persistDocument]);

  saveHandlerRef.current = enqueueSave;

  const handleSaveNow = useCallback((force = false) => {
    if (force) {
      autosaveScheduler.cancel();
      return enqueueSave(state.documentState.document, { force: true });
    }
    return autosaveScheduler.flush(state.documentState.document);
  }, [autosaveScheduler, enqueueSave, state.documentState.document]);

  const handleContinueDraft = useCallback(async () => {
    if (!recoveryDraft) return;
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      await restoreRuntimeAssets(recoveryDraft.document, assetRepository, assetRegistry);
      activeDraftRef.current = recoveryDraft;
      savedRevisionRef.current = recoveryDraft.revision;
      dispatch({ type: "document-restored", payload: { document: recoveryDraft.document, savedAt: recoveryDraft.updatedAt } });
      setRecoveryDraft(null);
    } catch (error) {
      setRecoveryError(error.message || "No se pudo recuperar el diseño.");
    } finally {
      setRecoveryBusy(false);
    }
  }, [assetRegistry, assetRepository, recoveryDraft]);

  const handleStartNew = useCallback(async () => {
    if (!recoveryDraft || !state.asyncState.template) return;
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      await draftRepository.deleteDraft(recoveryDraft.draftId);
      try { localStorage.removeItem(draftReferenceKey(state.documentState.document)); } catch { /* referencia opcional */ }
      const document = createDesignDocument({ template: state.asyncState.template, productId: state.asyncState.product.id || state.asyncState.product._id, variant: location.state?.variant || null });
      activeDraftRef.current = null;
      savedRevisionRef.current = null;
      dispatch({ type: "document-restored", payload: { document } });
      await garbageCollectAssets({ assetRepository, draftRepository, document, history: null, runtimeAssetRegistry: assetRegistry });
      setRecoveryDraft(null);
    } catch {
      setRecoveryError("No se pudo descartar el draft guardado. No se ha eliminado silenciosamente.");
    } finally {
      setRecoveryBusy(false);
    }
  }, [assetRegistry, assetRepository, draftReferenceKey, draftRepository, location.state?.variant, recoveryDraft, state.asyncState.product, state.asyncState.template, state.documentState.document]);

  const handleReloadStored = useCallback(async () => {
    const draftId = activeDraftRef.current?.draftId;
    if (!draftId || !state.asyncState.template) return;
    try {
      const draft = await draftRepository.loadDraft(draftId, { template: state.asyncState.template, productId: state.documentState.document.productId });
      await restoreRuntimeAssets(draft.document, assetRepository, assetRegistry);
      activeDraftRef.current = draft;
      savedRevisionRef.current = draft.revision;
      dispatch({ type: "document-restored", payload: { document: draft.document, savedAt: draft.updatedAt } });
    } catch {
      dispatch({ type: "save-failed", payload: { message: "No se pudo recargar la versión almacenada.", conflict: true } });
    }
  }, [assetRegistry, assetRepository, draftRepository, state.asyncState.template, state.documentState.document]);

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
      const { asset, blob } = await prepareImageAsset(file);
      try {
        await assetRepository.saveAsset({ ...asset, blob });
      } catch (error) {
        setEditorError(isQuotaError(error) ? "No hay espacio para guardar la imagen; seguirá disponible mientras esta página permanezca abierta." : "No se puede guardar automáticamente en este dispositivo; la imagen seguirá disponible en memoria.");
      }
      assetRegistry.registerBlob(asset.assetId, blob);
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
  }, [assetRegistry, assetRepository, state.asyncState.template, state.sessionState.activePrintAreaId, state.sessionState.activeViewId]);

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
    if (state.asyncState.status === "ready" && state.sessionState.dirty && !recoveryDraft) autosaveScheduler.schedule(state.documentState.document);
  }, [autosaveScheduler, recoveryDraft, state.asyncState.status, state.documentState.document, state.sessionState.dirty]);

  useEffect(() => {
    if (!state.sessionState.dirty && state.sessionState.saveStatus !== "saving" && state.sessionState.saveStatus !== "error") return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.sessionState.dirty, state.sessionState.saveStatus]);

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
    <>
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
      saveStatus={state.sessionState.saveStatus}
      saveError={state.sessionState.saveError}
      saveConflict={state.sessionState.conflict}
      lastSavedAt={state.sessionState.lastSavedAt}
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
      onSaveNow={() => handleSaveNow(false)}
      onReloadStored={handleReloadStored}
      onOverwriteStored={() => handleSaveNow(true)}
      onZoomChange={handleZoomChange}
      onViewportChange={handleViewportChange}
      onEditorError={setEditorError}
      onBack={handleBack}
      />
      <DraftRecoveryDialog
        draft={recoveryDraft}
        productName={state.asyncState.product.name || "Producto"}
        templateLabel={state.asyncState.template.label}
        busy={recoveryBusy}
        error={recoveryError}
        canContinue={recoveryCompatible}
        onContinue={handleContinueDraft}
        onStartNew={handleStartNew}
      />
    </>
  );
}

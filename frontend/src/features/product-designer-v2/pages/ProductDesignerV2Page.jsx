import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageContainer } from "@/components/ui/PageContainer";
import { apiGetProductById } from "@/services/products.service";
import { createDesignDocument, validateDesignDocument } from "../contracts/designDocument.js";
import { validateProductTemplate } from "../contracts/productTemplate.js";
import { getViewAspectRatio, getViewPrintAreas, getViewPrintSurface } from "../contracts/printSurface.js";
import { DesignerV2Shell } from "../components/DesignerV2Shell.jsx";
import { DraftRecoveryDialog } from "../components/DraftRecoveryDialog.jsx";
import { designerV2Reducer, initialDesignerV2State } from "../state/designerV2Reducer.js";
import { resolveProductTemplate } from "../templates/templateRepository.js";
import { isProductDesignerV2Enabled } from "../utils/featureFlag.js";
import { createRuntimeAssetRegistry, prepareImageAsset, restoreRuntimeAssets } from "../assets/runtimeAssetRegistry.js";
import { assertNoRejectedImageAssets, getReferencedImageAssets, IMAGE_QUALITY_COPY } from "../assets/imageQuality.js";
import { createIndexedDbStorage, isQuotaError } from "../persistence/indexedDbStorage.js";
import { createDraftRepository, DraftConflictError, IncompatibleDraftError } from "../persistence/DraftRepository.js";
import { createAssetRepository } from "../persistence/AssetRepository.js";
import { createDraft } from "../persistence/draftModel.js";
import { createAutosaveScheduler } from "../persistence/autosaveScheduler.js";
import { garbageCollectAssets } from "../persistence/assetReferences.js";
import { createDraftReferenceKey, findDraftReference } from "../persistence/draftReferences.js";
import { getMockupDefinition, isMockupModeAvailable } from "../mockups/mockupCatalog.js";
import { createMockupFingerprintInput, deriveMockupStatus, hashMockupFingerprint } from "../mockups/mockupState.js";
import { renderPreviewArtwork } from "../mockups/ArtworkRenderer.js";
import { requestMockup } from "../mockups/mockups.service.js";
import { getProduct3DProfileForTemplate, isThreeDModeAvailable } from "../three/threeModelRegistry.js";
import { resolveDesignerVariantContext } from "../domain/variantContext.js";
import { filterTemplateBySelectedSurfaceIds, getCommercialSurfaces, normalizeSelectedSurfaceIds } from "../domain/customizationSurfaces.js";
import { getCurrentDesignQuantity, nextPersonalizationRouteState, normalizePersonalizationWorkflow } from "../domain/personalizationWorkflow.js";
import { useCart } from "../../../hooks/useCart.js";
import { createDesignerV2CustomizationPayload } from "../../../utils/customizationAdapter.js";
import { prepareProductionHandoff } from "../production/productionHandoff.js";

const statusCopy = {
  disabled: ["Designer V2 no disponible", "Activa VITE_PRODUCT_DESIGNER_V2_ENABLED para acceder a esta foundation."],
  "not-found": ["Producto no encontrado", "No existe un producto para esta ruta."],
  incompatible: ["Producto sin template compatible", "Este producto no tiene un productTemplateId registrado para Designer V2."],
  "invalid-template": ["Template inválido", "El ProductTemplate no supera la validación del contrato v1."],
  "invalid-variant": ["Selecciona una variante", "Abre el diseñador desde la ficha y selecciona primero la talla y el color requeridos."],
  "invalid-surfaces": ["Selección de superficies inválida", "Vuelve a la ficha del producto y elige superficies disponibles."],
  load: ["No se pudo abrir Designer V2", "No se pudo cargar el producto. Inténtalo de nuevo."],
};

export function ProductDesignerV2Page() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const personalizationWorkflow = useMemo(() => normalizePersonalizationWorkflow(location.state?.personalizationWorkflow), [location.state?.personalizationWorkflow]);
  const { addItem, updateCustomization } = useCart();
  const [state, dispatch] = useReducer(designerV2Reducer, initialDesignerV2State);
  const [editorError, setEditorError] = useState("");
  const [imageQualityFeedback, setImageQualityFeedback] = useState(null);
  const [recoveryDraft, setRecoveryDraft] = useState(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryCompatible, setRecoveryCompatible] = useState(true);
  const [mockupState, setMockupState] = useState({ loading: false, result: null, error: "" });
  const [handoffBusy, setHandoffBusy] = useState(false);
  const assetRegistry = useMemo(() => createRuntimeAssetRegistry(), []);
  const storage = useMemo(() => createIndexedDbStorage(), []);
  const draftRepository = useMemo(() => createDraftRepository(storage), [storage]);
  const assetRepository = useMemo(() => createAssetRepository(storage), [storage]);
  const activeDraftRef = useRef(null);
  const savedRevisionRef = useRef(null);
  const recoveryReferenceKeyRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const historyRef = useRef(state.historyState);
  const saveHandlerRef = useRef(null);
  const mockupAbortRef = useRef(null);
  const autosaveScheduler = useMemo(() => createAutosaveScheduler((document) => saveHandlerRef.current?.(document)), []);

  useEffect(() => () => {
    autosaveScheduler.cancel();
    mockupAbortRef.current?.abort();
    assetRegistry.dispose();
  }, [assetRegistry, autosaveScheduler]);

  const mockupDefinition = useMemo(() => isMockupModeAvailable(state.asyncState.template) ? getMockupDefinition(state.asyncState.template) : null, [state.asyncState.template]);
  const product3DProfile = useMemo(() => getProduct3DProfileForTemplate(state.asyncState.template), [state.asyncState.template]);
  const mockupFingerprintInput = useMemo(() => {
    if (!mockupDefinition || !state.documentState.document || !state.asyncState.template) return "";
    return createMockupFingerprintInput({ document: state.documentState.document, template: state.asyncState.template, definition: mockupDefinition });
  }, [mockupDefinition, state.asyncState.template, state.documentState.document]);
  const mockupStatus = deriveMockupStatus({ ...mockupState, currentFingerprintInput: mockupFingerprintInput });
  const qualityBlocked = useMemo(() => getReferencedImageAssets(state.documentState.document).some((asset) => asset.qualityStatus === "rejected"), [state.documentState.document]);

  useEffect(() => {
    historyRef.current = state.historyState;
  }, [state.historyState]);

  useEffect(() => {
    mockupAbortRef.current?.abort();
    setMockupState({ loading: false, result: null, error: "" });
    setImageQualityFeedback(null);
  }, [productId, personalizationWorkflow?.currentIndex, personalizationWorkflow?.workflowId]);

  useEffect(() => {
    let active = true;
    if (!isProductDesignerV2Enabled) {
      dispatch({ type: "failed", payload: { error: { code: "disabled" } } });
      return () => { active = false; };
    }

    dispatch({ type: "loading" });
    activeDraftRef.current = null;
    savedRevisionRef.current = null;
    recoveryReferenceKeyRef.current = null;
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
        const fullTemplate = resolveProductTemplate(product);
        if (!fullTemplate) {
          dispatch({ type: "failed", payload: { product, error: { code: "incompatible" } } });
          return;
        }
        const requestedSurfaceIds = location.state?.selectedSurfaceIds
          ?? location.state?.customization?.selectedSurfaceIds
          ?? location.state?.customization?.designDocument?.selectedSurfaceIds
          ?? null;
        let selectedSurfaceIds = null;
        let template = fullTemplate;
        if (requestedSurfaceIds === null && getCommercialSurfaces(product).length > 0 && !location.state?.customization) {
          dispatch({ type: "failed", payload: { product, error: { code: "invalid-surfaces" } } });
          return;
        }
        if (requestedSurfaceIds !== null) {
          try {
            selectedSurfaceIds = normalizeSelectedSurfaceIds(getCommercialSurfaces(product), requestedSurfaceIds);
            template = filterTemplateBySelectedSurfaceIds(fullTemplate, selectedSurfaceIds);
          } catch (error) {
            dispatch({ type: "failed", payload: { product, error: { code: "invalid-surfaces", details: [error.message] } } });
            return;
          }
        }
        const validation = validateProductTemplate(template);
        if (!validation.valid) {
          dispatch({ type: "failed", payload: { product, error: { code: "invalid-template", details: validation.errors } } });
          return;
        }
        const variant = resolveDesignerVariantContext(product, { search: location.search, stateVariant: location.state?.variant || null });
        const requiresVariant = Boolean(product?.variants?.sizes?.length || product?.variants?.colors?.length);
        if (requiresVariant && !variant) {
          dispatch({ type: "failed", payload: { product, error: { code: "invalid-variant" } } });
          return;
        }
        let document = createDesignDocument({
          template,
          productId: product.id || product._id,
          variant,
          selectedSurfaceIds,
        });
        const cartDocument = location.state?.customization?.schemaVersion === 2
          ? location.state.customization.designDocument
          : null;
        if (cartDocument && validateDesignDocument(cartDocument, template).valid) {
          try {
            await restoreRuntimeAssets(cartDocument, assetRepository, assetRegistry);
            document = cartDocument;
          } catch {
            setEditorError("No se puede reabrir este diseño porque faltan sus assets locales; se ha iniciado una copia nueva.");
          }
        }
        dispatch({ type: "ready", payload: { product, template, document } });
        try {
          const reference = findDraftReference(localStorage, document, personalizationWorkflow);
          if (!reference) return;
          recoveryReferenceKeyRef.current = reference.key;
          const draft = await draftRepository.loadDraft(reference.draftId, { template, productId: document.productId, variant: document.variant, selectedSurfaceIds: document.selectedSurfaceIds });
          if (active && draft) setRecoveryDraft(draft);
        } catch (error) {
          if (!active) return;
          if (error instanceof IncompatibleDraftError) {
            setRecoveryDraft(error.draft);
            setRecoveryCompatible(false);
            setRecoveryError(error.errors?.some((message) => message.includes("otra variante"))
              ? "El diseño guardado pertenece a otra talla o color. No se restaurará sobre la variante actual; vuelve a abrir su variante original o empieza de nuevo explícitamente."
              : "El diseño guardado no es compatible con esta versión. No se restaurará; puedes descartarlo explícitamente para empezar de nuevo.");
          }
          else setEditorError("No se puede guardar automáticamente en este dispositivo.");
        }
      })
      .catch(() => {
        if (active) dispatch({ type: "failed", payload: { error: { code: "load" } } });
      });

    return () => { active = false; };
  }, [assetRegistry, assetRepository, draftRepository, location.search, location.state?.customization, location.state?.selectedSurfaceIds, location.state?.variant, personalizationWorkflow, productId]);

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
      try { localStorage.setItem(createDraftReferenceKey(document, personalizationWorkflow), saved.draftId); } catch { /* referencia opcional */ }
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
  }, [assetRegistry, assetRepository, draftRepository, personalizationWorkflow]);

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
      recoveryReferenceKeyRef.current = null;
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
      try { localStorage.removeItem(recoveryReferenceKeyRef.current || createDraftReferenceKey(state.documentState.document, personalizationWorkflow)); } catch { /* referencia opcional */ }
      const document = createDesignDocument({ template: state.asyncState.template, productId: state.asyncState.product.id || state.asyncState.product._id, variant: state.documentState.document.variant, selectedSurfaceIds: state.documentState.document.selectedSurfaceIds ?? null });
      activeDraftRef.current = null;
      savedRevisionRef.current = null;
      dispatch({ type: "document-restored", payload: { document } });
      await garbageCollectAssets({ assetRepository, draftRepository, document, history: null, runtimeAssetRegistry: assetRegistry });
      recoveryReferenceKeyRef.current = null;
      setRecoveryDraft(null);
    } catch {
      setRecoveryError("No se pudo descartar el draft guardado. No se ha eliminado silenciosamente.");
    } finally {
      setRecoveryBusy(false);
    }
  }, [assetRegistry, assetRepository, draftRepository, personalizationWorkflow, recoveryDraft, state.asyncState.product, state.asyncState.template, state.documentState.document]);

  const handleReloadStored = useCallback(async () => {
    const draftId = activeDraftRef.current?.draftId;
    if (!draftId || !state.asyncState.template) return;
    try {
      const draft = await draftRepository.loadDraft(draftId, { template: state.asyncState.template, productId: state.documentState.document.productId, selectedSurfaceIds: state.documentState.document.selectedSurfaceIds });
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

  const handleAddShape = useCallback((shapeType) => {
    setEditorError("");
    dispatch({
      type: "shape-added",
      payload: {
        viewId: state.sessionState.activeViewId,
        printAreaId: state.sessionState.activePrintAreaId,
        shapeType,
      },
    });
  }, [state.sessionState.activePrintAreaId, state.sessionState.activeViewId]);

  const handleChooseImage = useCallback(async (file) => {
    setEditorError("");
    try {
      const { asset, blob } = await prepareImageAsset(file);
      setImageQualityFeedback({ qualityStatus: asset.qualityStatus, ...IMAGE_QUALITY_COPY[asset.qualityStatus] });
      if (asset.qualityStatus === "rejected") return;
      try {
        await assetRepository.saveAsset({ ...asset, blob });
      } catch (error) {
        setEditorError(isQuotaError(error) ? "No hay espacio para guardar la imagen; seguirá disponible mientras esta página permanezca abierta." : "No se puede guardar automáticamente en este dispositivo; la imagen seguirá disponible en memoria.");
      }
      assetRegistry.registerBlob(asset.assetId, blob);
      const activeView = state.asyncState.template.views.find((view) => view.id === state.sessionState.activeViewId);
      const activeArea = getViewPrintAreas(state.asyncState.template, activeView).find((area) => area.id === state.sessionState.activePrintAreaId);
      const activeSurface = getViewPrintSurface(state.asyncState.template, activeView);
      dispatch({
        type: "image-added",
        payload: {
          viewId: state.sessionState.activeViewId,
          printAreaId: state.sessionState.activePrintAreaId,
          asset,
          aspectRatio: asset.widthPx / asset.heightPx,
          printAreaAspectRatio: (activeArea.width * getViewAspectRatio(state.asyncState.template, activeView)) / activeArea.height,
          printAreaPixelSize: activeSurface?.previewTextureResolution ? {
            width: activeSurface.previewTextureResolution.width * activeArea.width,
            height: activeSurface.previewTextureResolution.height * activeArea.height,
          } : null,
        },
      });
    } catch (error) {
      setImageQualityFeedback({ qualityStatus: "rejected", ...IMAGE_QUALITY_COPY.rejected });
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

  const handleGenerateMockup = useCallback(async () => {
    if (!mockupDefinition) return;
    mockupAbortRef.current?.abort();
    const controller = new AbortController();
    mockupAbortRef.current = controller;
    setMockupState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const fingerprintInput = createMockupFingerprintInput({ document: state.documentState.document, template: state.asyncState.template, definition: mockupDefinition });
      const [artwork, documentHash] = await Promise.all([
        renderPreviewArtwork({ document: state.documentState.document, template: state.asyncState.template, sourceViewId: mockupDefinition.sourceViewId, assetRegistry, previewWidth: mockupDefinition.previewWidth }),
        hashMockupFingerprint(fingerprintInput),
      ]);
      const result = await requestMockup({ artwork, templateId: state.asyncState.template.templateId, definition: mockupDefinition, signal: controller.signal });
      if (!controller.signal.aborted) setMockupState({ loading: false, error: "", result: { ...result, documentHash, fingerprintInput } });
    } catch (error) {
      if (!controller.signal.aborted) setMockupState((current) => ({ ...current, loading: false, error: error.message || "No se pudo generar el mockup." }));
    } finally {
      if (mockupAbortRef.current === controller) mockupAbortRef.current = null;
    }
  }, [assetRegistry, mockupDefinition, state.asyncState.template, state.documentState.document]);

  const handleAddToCart = useCallback(async () => {
    if (handoffBusy) return;
    setEditorError("");
    setHandoffBusy(true);
    try {
      assertNoRejectedImageAssets(state.documentState.document);
      const uploads = await prepareProductionHandoff({ document: state.documentState.document, template: state.asyncState.template, assetRegistry });
      if (personalizationWorkflow?.mode === "different") {
        autosaveScheduler.cancel();
        const saved = await enqueueSave(state.documentState.document);
        if (!saved) throw new Error("No se pudo guardar este diseño. Inténtalo de nuevo antes de continuar.");
      }
      const product = state.asyncState.product;
      const customization = createDesignerV2CustomizationPayload({
        clientId: location.state?.customization?.clientId || crypto.randomUUID(),
        designDocument: state.documentState.document,
        uploads,
        productId: product._id || product.id,
        productSnapshot: { _id: product._id || product.id, name: product.name },
        selectedSurfaceIds: state.documentState.document.selectedSurfaceIds,
        customizationPricing: location.state?.customizationQuote || location.state?.customization?.customizationPricing || null,
      });
      if (location.state?.lineKey) updateCustomization(location.state.lineKey, customization);
      else addItem({ product, quantity: getCurrentDesignQuantity(personalizationWorkflow), variant: state.documentState.document.variant, customization });
      const nextState = nextPersonalizationRouteState(location.state);
      if (nextState && !location.state?.lineKey) {
        navigate(`${location.pathname}${location.search}`, { replace: true, state: nextState });
      } else navigate(location.state?.returnTo || "/carrito");
    } catch (error) {
      setEditorError(error.response?.data?.message || error.message || "No se pudo preparar el diseño para producción.");
    } finally {
      setHandoffBusy(false);
    }
  }, [addItem, assetRegistry, autosaveScheduler, enqueueSave, handoffBusy, location.pathname, location.search, location.state, navigate, personalizationWorkflow, state.asyncState.product, state.asyncState.template, state.documentState.document, updateCustomization]);

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
      mode={state.sessionState.mode}
      mockupAvailable={isMockupModeAvailable(state.asyncState.template)}
      mockupStatus={mockupStatus}
      mockupResult={mockupState.result}
      mockupError={mockupState.error}
      threeDAvailable={isThreeDModeAvailable(state.asyncState.template)}
      product3DProfile={product3DProfile}
      dirty={state.sessionState.dirty}
      saveStatus={state.sessionState.saveStatus}
      saveError={state.sessionState.saveError}
      saveConflict={state.sessionState.conflict}
      lastSavedAt={state.sessionState.lastSavedAt}
      canUndo={state.historyState.past.length > 0}
      canRedo={state.historyState.future.length > 0}
      assetRegistry={assetRegistry}
      editorError={editorError}
      imageQualityFeedback={imageQualityFeedback || (qualityBlocked ? { qualityStatus: "rejected", ...IMAGE_QUALITY_COPY.rejected } : null)}
      onSelectView={(viewId) => dispatch({ type: "view-selected", payload: viewId })}
      onSelectMode={(mode) => dispatch({ type: "mode-changed", payload: mode })}
      onGenerateMockup={handleGenerateMockup}
      onSelectElement={(elementId) => dispatch({ type: "selection-changed", payload: elementId })}
      onAddText={handleAddText}
      onChooseImage={handleChooseImage}
      onAddShape={handleAddShape}
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
      onAddToCart={handleAddToCart}
      personalizationWorkflow={personalizationWorkflow}
      handoffBusy={handoffBusy}
      qualityBlocked={qualityBlocked}
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

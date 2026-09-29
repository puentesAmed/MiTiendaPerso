import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { FabricAdapter } from "../adapters/FabricAdapter.js";
import { getViewAspectRatio, getViewPrintAreas, getViewPrintSurface } from "../contracts/printSurface.js";

function percentage(value) {
  return `${value * 100}%`;
}

export function EditableDesignStage({
  template,
  document,
  activeViewId,
  selectedElementIds,
  zoom,
  pan,
  assetRegistry,
  outOfBounds,
  onSelectionChange,
  onElementChange,
  onElementsChange,
  onViewportChange,
  onError,
}) {
  const surfaceRef = useRef(null);
  const canvasRef = useRef(null);
  const adapterRef = useRef(null);
  const selectedIdsRef = useRef(selectedElementIds);
  const callbacksRef = useRef({ onSelectionChange, onElementChange, onElementsChange, onViewportChange, onError });
  const view = template.views.find((candidate) => candidate.id === activeViewId) || template.views[0];
  const printAreas = getViewPrintAreas(template, view);
  const unifiedSurface = Boolean(getViewPrintSurface(template, view));

  useEffect(() => {
    callbacksRef.current = { onSelectionChange, onElementChange, onElementsChange, onViewportChange, onError };
  }, [onElementChange, onElementsChange, onError, onSelectionChange, onViewportChange]);

  useEffect(() => {
    selectedIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  useEffect(() => {
    if (!canvasRef.current || !surfaceRef.current) return undefined;
    let adapter;
    try {
      adapter = new FabricAdapter(canvasRef.current, {
        onSelectionChange: (...args) => callbacksRef.current.onSelectionChange?.(...args),
        onElementChange: (...args) => callbacksRef.current.onElementChange?.(...args),
        onElementsChange: (...args) => callbacksRef.current.onElementsChange?.(...args),
        onViewportChange: (...args) => callbacksRef.current.onViewportChange?.(...args),
        onError: (...args) => callbacksRef.current.onError?.(...args),
      });
      adapterRef.current = adapter;
      const resizeObserver = new ResizeObserver(([entry]) => {
        adapter.resize(Math.round(entry.contentRect.width), Math.round(entry.contentRect.height));
      });
      resizeObserver.observe(surfaceRef.current);
      return () => {
        resizeObserver.disconnect();
        adapterRef.current = null;
        void adapter.dispose();
      };
    } catch {
      callbacksRef.current.onError?.("No se pudo iniciar Fabric.");
      return undefined;
    }
  }, []);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    void adapter.reconcile(document, activeViewId, template, assetRegistry)
      .then(() => adapter.select(selectedIdsRef.current));
  }, [activeViewId, assetRegistry, document, template]);

  useEffect(() => {
    adapterRef.current?.select(selectedElementIds);
  }, [selectedElementIds]);

  useEffect(() => {
    adapterRef.current?.setViewport(zoom, pan);
  }, [pan, zoom]);

  useEffect(() => {
    const setPan = (enabled, event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.code !== "Space" || zoom <= 1) return;
      event.preventDefault();
      adapterRef.current?.setPanEnabled(enabled);
    };
    const onKeyDown = (event) => setPan(true, event);
    const onKeyUp = (event) => setPan(false, event);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [zoom]);

  return (
    <figure className="min-w-0" data-mobile-canvas-layout="contained">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate font-semibold">{view.surface?.label || view.label}</span>
        <span className="shrink-0">Área editable</span>
      </div>
      <div
        className="relative mx-auto w-full max-w-[46rem] overflow-hidden rounded-xl border bg-muted/35 shadow-inner"
        style={{ aspectRatio: getViewAspectRatio(template, view) }}
      >
        <div aria-hidden="true" className="absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div ref={surfaceRef} className={`absolute overflow-hidden rounded-lg border bg-white text-zinc-950 ${unifiedSurface ? "inset-0" : "inset-3 sm:inset-5"}`}>
          <canvas ref={canvasRef} role="img" aria-label={`${view.label}. Lienzo de edición con ${printAreas.length} área imprimible.`} />
          {printAreas.map((area) => (
            <div
              key={area.id}
              aria-hidden="true"
              className={`pointer-events-none absolute z-10 border-2 border-dashed ${outOfBounds ? "border-destructive bg-destructive/5" : "border-primary/80 bg-primary/[0.03]"} ${area.shape.type === "ellipse" ? "rounded-full" : "rounded-md"}`}
              style={{ left: percentage(area.x), top: percentage(area.y), width: percentage(area.width), height: percentage(area.height) }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 min-h-5">
        {outOfBounds ? (
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-destructive" role="status">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> Parte del elemento queda fuera del área imprimible.
          </p>
        ) : (
          <figcaption className="text-center text-xs text-muted-foreground">Selecciona, mueve, redimensiona o rota dentro del área imprimible.</figcaption>
        )}
      </div>
    </figure>
  );
}

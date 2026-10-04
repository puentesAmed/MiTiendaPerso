import { createElement, lazy, Suspense, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Box, Boxes, CheckCircle2, Copy, Ellipsis, Eye, EyeOff, Image, Layers3, Lock, Minus, MousePointer2, PanelRight, Plus, Redo2, Save, Shapes, ShoppingCart, Trash2, Type, Undo2, Unlock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EditableDesignStage } from "./EditableDesignStage.jsx";
import { MockupPanel } from "./MockupPanel.jsx";
import { calculateInitialImageBounds, isElementOutOfBounds } from "../domain/designDocumentActions.js";
import { getViewAspectRatio, getViewPrintAreas, getViewPrintSurface } from "../contracts/printSurface.js";
import { DESIGNER_FONT_CATEGORIES, DESIGNER_FONTS, getDesignerFont, resolveDesignerFontFamily } from "../../../../../shared/designer-v2/fontRegistry.js";
import { DESIGNER_SHAPES } from "../../../../../shared/designer-v2/shapeRegistry.js";

const ThreeProductPreview = lazy(() => import("./ThreeProductPreview.jsx").then((module) => ({ default: module.ThreeProductPreview })));

function ShapePicker({ onAddShape }) {
  return <div className="grid grid-cols-2 gap-2" aria-label="Formas disponibles">{DESIGNER_SHAPES.map((shape) => (
    <Button key={shape.id} type="button" variant="outline" size="sm" onClick={() => onAddShape(shape.id)}>{shape.label}</Button>
  ))}</div>;
}

function ToolButtons({ mobile = false, onAddText, onChooseImage, onAddShape }) {
  const tools = [
    { label: "Texto", icon: Type, onClick: onAddText },
    { label: "Imagen", icon: Image, upload: true },
  ];
  return (
    <div className={mobile ? "grid grid-cols-2 gap-2" : "space-y-2"} aria-label="Herramientas de edición">
      {tools.map(({ label, icon, onClick, upload, disabled }) => upload ? (
        <Button key={label} as="label" variant="outline" size="sm" className={`${mobile ? "w-full" : "w-full justify-start"} cursor-pointer`}>
          {createElement(icon, { "aria-hidden": true })} {label}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onChooseImage(file); event.target.value = ""; }} />
        </Button>
      ) : (
        <Button key={label} type="button" variant="outline" size="sm" className={mobile ? "w-full" : "w-full justify-start"} onClick={onClick} disabled={disabled}>
          {createElement(icon, { "aria-hidden": true })} {label}
        </Button>
      ))}
      <div className={mobile ? "col-span-2" : "pt-1"}><p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Shapes className="size-4" aria-hidden="true" /> Formas</p><ShapePicker onAddShape={onAddShape} /></div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="grid gap-1 text-xs font-medium text-muted-foreground"><span>{label}</span>{children}</label>;
}

function elementLabel(element) {
  if (element.type === "text") return element.content || "Texto vacío";
  if (element.type === "shape") return DESIGNER_SHAPES.find((shape) => shape.id === element.shapeType)?.label || "Forma";
  return `Imagen · ${element.id.slice(0, 6)}`;
}

function FontSelector({ element, onUpdateElement }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return normalized ? DESIGNER_FONTS.filter((font) => `${font.label} ${font.category}`.toLocaleLowerCase("es").includes(normalized)) : DESIGNER_FONTS;
  }, [query]);
  const categories = DESIGNER_FONT_CATEGORIES.filter((category) => filtered.some((font) => font.category === category));
  const activeFont = getDesignerFont(element.fontId) || DESIGNER_FONTS[0];
  const changeFont = (fontId) => {
    const font = getDesignerFont(fontId);
    if (!font) return;
    onUpdateElement({ fontId, fontWeight: font.weights.includes(element.fontWeight) ? element.fontWeight : font.weights[0] });
  };
  return <div className="space-y-2 rounded-lg border p-2">
    <Field label="Buscar fuente"><Input type="search" value={query} placeholder="Moderna, elegante, manuscrita…" onChange={(event) => setQuery(event.target.value)} /></Field>
    <Field label="Fuente"><Select value={activeFont.id} onChange={(event) => changeFont(event.target.value)} style={{ fontFamily: resolveDesignerFontFamily(activeFont.id) }}>
      {categories.map((category) => <optgroup key={category} label={category}>{filtered.filter((font) => font.category === category).map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}</optgroup>)}
    </Select></Field>
  </div>;
}

function LayersPanel({ elements, selectedElementIds, onSelectElement, onLayerAction }) {
  const maxZ = Math.max(-1, ...elements.map((element) => element.zIndex));
  const selected = new Set(selectedElementIds);
  const selectLayer = (event, elementId) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      onSelectElement(selected.has(elementId) ? selectedElementIds.filter((id) => id !== elementId) : [...selectedElementIds, elementId]);
    } else onSelectElement([elementId]);
  };
  return (
    <div>
      <div className="flex items-center gap-2"><Layers3 className="size-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-semibold">Capas</h2><Badge variant="secondary" className="ml-auto">{elements.length}</Badge></div>
      {elements.length ? (
        <div className="mt-3 space-y-1.5" role="list" aria-label="Capas de la vista activa">
          {[...elements].sort((a, b) => b.zIndex - a.zIndex).map((element) => {
            const active = selected.has(element.id);
            const overflow = isElementOutOfBounds(element);
            return (
              <div key={element.id} role="listitem" className={`rounded-lg border p-1.5 ${active ? "border-primary bg-primary/10" : "bg-background"}`}>
                <button type="button" onClick={(event) => selectLayer(event, element.id)} aria-pressed={active} className="flex w-full min-w-0 items-center gap-1.5 rounded px-1 py-1 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {overflow ? <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-label="Fuera del área imprimible" /> : null}
                  <span className={`min-w-0 flex-1 truncate ${element.hidden ? "text-muted-foreground line-through" : ""}`}>{elementLabel(element)}</span>
                  {element.locked ? <Lock className="size-3.5 shrink-0" aria-label="Bloqueada" /> : null}
                </button>
                <div className="mt-1 grid grid-cols-5 gap-1">
                  <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => onLayerAction(element.id, "hide")} aria-label={element.hidden ? `Mostrar ${elementLabel(element)}` : `Ocultar ${elementLabel(element)}`}>{element.hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => onLayerAction(element.id, "lock")} aria-label={element.locked ? `Desbloquear ${elementLabel(element)}` : `Bloquear ${elementLabel(element)}`}>{element.locked ? <Lock aria-hidden="true" /> : <Unlock aria-hidden="true" />}</Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" disabled={element.zIndex === maxZ} onClick={() => onLayerAction(element.id, "forward")} aria-label={`Subir ${elementLabel(element)}`}><ArrowUp aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" disabled={element.zIndex === 0} onClick={() => onLayerAction(element.id, "backward")} aria-label={`Bajar ${elementLabel(element)}`}><ArrowDown aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => onLayerAction(element.id, "delete")} aria-label={`Eliminar ${elementLabel(element)}`}><Trash2 aria-hidden="true" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : <p className="mt-3 text-xs text-muted-foreground">Añade texto o una imagen para empezar.</p>}
    </div>
  );
}

function PropertiesPanel({ selectedElements, view, printAreas, activePrintAreaId, onUpdateElement, onFitImage, onDuplicate, onDelete }) {
  if (selectedElements.length > 1) return (
    <div aria-live="polite">
      <div className="flex items-center gap-2"><PanelRight className="size-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-semibold">Propiedades</h2></div>
      <div className="mt-3 rounded-lg border p-3 text-xs"><strong>{selectedElements.length} elementos</strong><p className="mt-1 text-muted-foreground">Muévelos juntos en el lienzo o elimínalos como una sola acción.</p></div>
      <Button type="button" variant="destructive" size="sm" className="mt-3 w-full" onClick={onDelete}><Trash2 aria-hidden="true" /> Eliminar selección</Button>
    </div>
  );
  const selectedElement = selectedElements[0];
  return (
    <div aria-live="polite">
      <div className="flex items-center gap-2"><PanelRight className="size-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-semibold">Propiedades</h2></div>
      {selectedElement ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Seleccionado: <strong className="text-foreground">{elementLabel(selectedElement)}</strong></p>
          {selectedElement.type === "text" ? (
            <>
              <Field label="Contenido"><Input value={selectedElement.content} onChange={(event) => onUpdateElement({ content: event.target.value }, { groupKey: `property:${selectedElement.id}:content` })} /></Field>
              <FontSelector element={selectedElement} onUpdateElement={onUpdateElement} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tamaño"><Input type="number" min="0.02" max="0.3" step="0.01" value={selectedElement.fontSize} onChange={(event) => onUpdateElement({ fontSize: Number(event.target.value) }, { groupKey: `property:${selectedElement.id}:fontSize` })} /></Field>
                <Field label="Color"><Input type="color" className="p-1" value={selectedElement.color} onChange={(event) => onUpdateElement({ color: event.target.value }, { groupKey: `property:${selectedElement.id}:color` })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Alineación"><Select value={selectedElement.textAlign} onChange={(event) => onUpdateElement({ textAlign: event.target.value })}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></Select></Field>
                <Field label="Peso"><Select value={selectedElement.fontWeight} onChange={(event) => onUpdateElement({ fontWeight: Number(event.target.value) })}>{(getDesignerFont(selectedElement.fontId) || DESIGNER_FONTS[0]).weights.map((weight) => <option key={weight} value={weight}>{weight}</option>)}</Select></Field>
              </div>
            </>
          ) : selectedElement.type === "shape" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Relleno"><Input type="color" className="p-1" disabled={selectedElement.shapeType === "line"} value={selectedElement.fill === "none" ? "#000000" : selectedElement.fill} onChange={(event) => onUpdateElement({ fill: event.target.value }, { groupKey: `property:${selectedElement.id}:fill` })} /></Field>
                <Field label="Contorno"><Input type="color" className="p-1" value={selectedElement.stroke} onChange={(event) => onUpdateElement({ stroke: event.target.value }, { groupKey: `property:${selectedElement.id}:stroke` })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Grosor"><Input type="number" min="0" max="0.05" step="0.001" value={selectedElement.strokeWidth} onChange={(event) => onUpdateElement({ strokeWidth: Number(event.target.value) }, { groupKey: `property:${selectedElement.id}:strokeWidth` })} /></Field>
                <Field label="Opacidad"><Input type="number" min="0" max="1" step="0.05" value={selectedElement.opacity} onChange={(event) => onUpdateElement({ opacity: Number(event.target.value) }, { groupKey: `property:${selectedElement.id}:opacity` })} /></Field>
              </div>
              <dl className="grid grid-cols-2 gap-2 rounded-lg border p-2 text-xs"><div><dt className="text-muted-foreground">Ancho</dt><dd>{Math.round(selectedElement.width * 100)}%</dd></div><div><dt className="text-muted-foreground">Alto</dt><dd>{Math.round(selectedElement.height * 100)}%</dd></div></dl>
            </>
          ) : (
            <><dl className="grid grid-cols-2 gap-2 rounded-lg border p-2 text-xs">
              <div><dt className="text-muted-foreground">Ancho</dt><dd>{Math.round(selectedElement.width * 100)}%</dd></div><div><dt className="text-muted-foreground">Alto</dt><dd>{Math.round(selectedElement.height * 100)}%</dd></div>
              <div><dt className="text-muted-foreground">Rotación</dt><dd>{Math.round(selectedElement.rotation)}°</dd></div><div><dt className="text-muted-foreground">Opacidad</dt><dd>{Math.round(selectedElement.opacity * 100)}%</dd></div>
            </dl><Button type="button" variant="outline" size="sm" className="w-full" onClick={onFitImage}>Ajustar al área</Button></>
          )}
          <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" size="sm" onClick={onDuplicate}><Copy aria-hidden="true" /> Duplicar</Button><Button type="button" variant="destructive" size="sm" onClick={onDelete}><Trash2 aria-hidden="true" /> Eliminar</Button></div>
        </div>
      ) : <div className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Vista: {view.label}. Área activa: {printAreas.find((area) => area.id === activePrintAreaId)?.label || "Sin área"}.</div>}
    </div>
  );
}

function ZoomControls({ zoom, onZoomChange }) {
  return <div className="flex items-center gap-1" aria-label="Zoom del lienzo"><Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onZoomChange(zoom - 0.1)} disabled={zoom <= 0.5} aria-label="Reducir zoom"><Minus aria-hidden="true" /></Button><output className="w-12 text-center text-xs font-semibold" aria-live="polite">{Math.round(zoom * 100)}%</output><Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onZoomChange(zoom + 0.1)} disabled={zoom >= 2} aria-label="Aumentar zoom"><Plus aria-hidden="true" /></Button><Button type="button" variant="outline" size="sm" onClick={() => onZoomChange(1)}>Ajustar</Button></div>;
}

function saveStatusLabel(status) {
  if (status === "saving") return "Guardando…";
  if (status === "clean") return "Guardado en este dispositivo";
  if (status === "error") return "Error al guardar";
  if (status === "idle") return "Sin cambios pendientes";
  return "Cambios pendientes";
}

function MobileToolbar({ elements, layers, properties, saveStatus, onAddText, onChooseImage, onAddShape, onSaveNow }) {
  return (
    <section className="relative z-20 mt-3 grid grid-cols-5 gap-1 rounded-xl border bg-card p-2 shadow-sm lg:hidden" aria-label="Herramientas móviles" data-mobile-toolbar="outside-canvas">
      <Button type="button" variant="ghost" size="sm" className="h-12 flex-col gap-0.5 text-[11px]" onClick={onAddText}><Type aria-hidden="true" /> Texto</Button>
      <Button as="label" variant="ghost" size="sm" className="h-12 cursor-pointer flex-col gap-0.5 text-[11px]"><Image aria-hidden="true" /> Imagen<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) onChooseImage(file); event.target.value = ""; }} /></Button>
      <Sheet><SheetTrigger render={<Button type="button" variant="ghost" size="sm" className="h-12 flex-col gap-0.5 text-[11px]" />}><Shapes aria-hidden="true" /> Formas</SheetTrigger><SheetContent side="left"><SheetHeader><SheetTitle>Añadir forma</SheetTitle></SheetHeader><ShapePicker onAddShape={onAddShape} /></SheetContent></Sheet>
      <Sheet><SheetTrigger render={<Button type="button" variant="ghost" size="sm" className="h-12 flex-col gap-0.5 text-[11px]" />}><Layers3 aria-hidden="true" /> Capas ({elements.length})</SheetTrigger><SheetContent side="left"><SheetHeader><SheetTitle>Capas</SheetTitle></SheetHeader><LayersPanel {...layers} /></SheetContent></Sheet>
      <Sheet><SheetTrigger render={<Button type="button" variant="ghost" size="sm" className="h-12 flex-col gap-0.5 text-[11px]" />}><Ellipsis aria-hidden="true" /> Más</SheetTrigger><SheetContent><SheetHeader><SheetTitle>Más acciones</SheetTitle></SheetHeader><p className="mb-3 text-xs text-muted-foreground" role="status">{saveStatusLabel(saveStatus)}</p><Button type="button" className="mb-5 w-full" onClick={onSaveNow} disabled={saveStatus === "saving"}><Save aria-hidden="true" /> Guardar en este dispositivo</Button><PropertiesPanel {...properties} /></SheetContent></Sheet>
    </section>
  );
}

export function DesignerV2Shell({ product, template, document, activeViewId, activePrintAreaId, selectedElementIds, zoom, pan, mode, mockupAvailable, mockupStatus, mockupResult, mockupError, threeDAvailable, product3DProfile, dirty, saveStatus, saveError, saveConflict, lastSavedAt, canUndo, canRedo, assetRegistry, editorError, imageQualityFeedback, onSelectView, onSelectMode, onGenerateMockup, onSelectElement, onAddText, onChooseImage, onAddShape, onUpdateElement, onUpdateElements, onDuplicate, onDelete, onLayerAction, onUndo, onRedo, onSaveNow, onReloadStored, onOverwriteStored, onZoomChange, onViewportChange, onEditorError, onBack, onAddToCart, handoffBusy, qualityBlocked }) {
  const view = template.views.find((candidate) => candidate.id === activeViewId) || template.views[0];
  const printAreas = getViewPrintAreas(template, view);
  const elements = document.views[view.id]?.elements || [];
  const selectedElements = elements.filter((element) => selectedElementIds.includes(element.id));
  const outOfBounds = selectedElements.some(isElementOutOfBounds);
  const layers = { elements, selectedElementIds, onSelectElement, onLayerAction };
  const handleFitImage = () => {
    const element = selectedElements[0];
    const asset = element?.type === "image" ? document.assets[element.assetId] : null;
    const area = printAreas.find((candidate) => candidate.id === element?.printAreaId);
    if (!asset || !area) return;
    const surface = getViewPrintSurface(template, view);
    const bounds = calculateInitialImageBounds({
      widthPx: asset.widthPx,
      heightPx: asset.heightPx,
      printAreaAspectRatio: (area.width * getViewAspectRatio(template, view)) / area.height,
      printAreaPixelSize: surface?.previewTextureResolution ? {
        width: surface.previewTextureResolution.width * area.width,
        height: surface.previewTextureResolution.height * area.height,
      } : null,
    });
    onUpdateElement({ ...bounds, rotation: 0 });
  };
  const properties = { selectedElements, view, printAreas, activePrintAreaId, onUpdateElement, onFitImage: handleFitImage, onDuplicate, onDelete };

  return (
    <main className="min-h-[calc(100vh-4rem)] min-w-0 bg-muted/20" aria-labelledby="designer-v2-title">
      <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col px-3 py-3 sm:px-4 lg:px-5">
        <header className="flex min-w-0 items-center gap-2 border-b bg-background/95 pb-3">
          <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Volver al producto"><ArrowLeft aria-hidden="true" /></Button>
          <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><h1 id="designer-v2-title" className="truncate text-base font-bold tracking-tight sm:text-lg">Designer V2</h1><Badge variant="outline" className="hidden sm:inline-flex">{saveStatusLabel(saveStatus)}</Badge></div><p className="truncate text-xs text-muted-foreground">{product.name || "Producto"}{document.variant?.size ? ` · Talla ${document.variant.size}` : ""}{document.variant?.color ? ` · Color ${document.variant.color}` : ""}{lastSavedAt && !dirty ? ` · ${new Date(lastSavedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}</p></div>
          <div className="flex items-center gap-1" aria-label="Historial de edición"><Button type="button" variant="ghost" size="icon" disabled={!canUndo} onClick={onUndo} aria-label="Deshacer"><Undo2 aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" disabled={!canRedo} onClick={onRedo} aria-label="Rehacer"><Redo2 aria-hidden="true" /></Button></div>
          <Button type="button" size="sm" onClick={onSaveNow} disabled={saveStatus === "saving"} title="Guarda localmente mediante IndexedDB"><Save aria-hidden="true" /> <span className="hidden sm:inline">Guardar en este dispositivo</span></Button>
          <Button type="button" size="sm" onClick={onAddToCart} disabled={handoffBusy || qualityBlocked}><ShoppingCart aria-hidden="true" /> <span className="hidden sm:inline">{handoffBusy ? "Preparando…" : "Añadir al carrito"}</span></Button>
        </header>

        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground" role="status"><strong>{saveStatusLabel(saveStatus)}.</strong> El diseño se conserva localmente en este navegador.</div>
        {editorError ? <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{editorError}</div> : null}
        {imageQualityFeedback ? <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${imageQualityFeedback.qualityStatus === "good" ? "border-success/40 bg-success/10 text-success" : imageQualityFeedback.qualityStatus === "warning" ? "border-amber-500/40 bg-amber-500/10 text-amber-800" : "border-destructive/40 bg-destructive/10 text-destructive"}`} role={imageQualityFeedback.qualityStatus === "rejected" ? "alert" : "status"}>{imageQualityFeedback.qualityStatus === "good" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : imageQualityFeedback.qualityStatus === "warning" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}<span><strong className="block">{imageQualityFeedback.title}</strong>{imageQualityFeedback.description}</span></div> : null}
        {saveError ? <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert"><span className="flex-1">{saveError}</span>{saveConflict ? <><Button type="button" variant="outline" size="sm" onClick={onReloadStored}>Recargar copia guardada</Button><Button type="button" variant="destructive" size="sm" onClick={onOverwriteStored}>Sobrescribir</Button></> : <Button type="button" variant="outline" size="sm" onClick={onSaveNow}>Reintentar</Button>}</div> : null}

        {mode === "design" ? <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_16rem]">
          <aside className="hidden space-y-5 rounded-xl border bg-card p-3 lg:block" aria-label="Herramientas y capas"><div><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Herramientas</p><ToolButtons onAddText={onAddText} onChooseImage={onChooseImage} onAddShape={onAddShape} /></div><LayersPanel {...layers} /></aside>
          <section className="min-w-0 rounded-xl border bg-card p-3 sm:p-4" aria-labelledby="canvas-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><h2 id="canvas-title" className="text-sm font-semibold">Lienzo</h2><p className="truncate text-xs text-muted-foreground">{template.label}{zoom > 1 ? " · Espacio + arrastre para desplazar" : ""}</p></div><ZoomControls zoom={zoom} onZoomChange={onZoomChange} /></div>
            <EditableDesignStage template={template} document={document} activeViewId={activeViewId} selectedElementIds={selectedElementIds} zoom={zoom} pan={pan} assetRegistry={assetRegistry} outOfBounds={outOfBounds} onSelectionChange={onSelectElement} onElementChange={onUpdateElement} onElementsChange={onUpdateElements} onViewportChange={onViewportChange} onError={onEditorError} />
          </section>
          <aside className="hidden rounded-xl border bg-card p-3 lg:block" aria-label="Propiedades"><PropertiesPanel {...properties} /></aside>
        </div> : mode === "mockup" ? <div className="mt-3"><MockupPanel status={mockupStatus} result={mockupResult} error={mockupError} onGenerate={onGenerateMockup} /></div> : <div className="mt-3"><Suspense fallback={<div className="flex min-h-[22rem] items-center justify-center rounded-xl border bg-card text-sm" role="status">Cargando motor 3D…</div>}><ThreeProductPreview profile={product3DProfile} document={document} template={template} assetRegistry={assetRegistry} onBackToDesign={() => onSelectMode("design")} onShowMockup={mockupAvailable ? () => onSelectMode("mockup") : null} /></Suspense></div>}

        {mode === "design" ? <MobileToolbar elements={elements} layers={layers} properties={properties} saveStatus={saveStatus} onAddText={onAddText} onChooseImage={onChooseImage} onAddShape={onAddShape} onSaveNow={onSaveNow} /> : null}

        <footer className="mt-3 grid min-w-0 gap-3 rounded-xl border bg-card p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vistas</p><div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Vistas del producto">{template.views.map((candidate) => { const count = document.views[candidate.id]?.elements.length || 0; return <button key={candidate.id} type="button" role="tab" aria-selected={activeViewId === candidate.id} onClick={() => onSelectView(candidate.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeViewId === candidate.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>{candidate.label} <span aria-label={`${count} elementos`}>({count})</span></button>; })}</div></div>
          <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modo</p><div className="flex gap-1 rounded-lg border bg-muted/35 p-1" role="tablist" aria-label="Modos del diseñador"><Button type="button" size="sm" variant={mode === "design" ? "secondary" : "ghost"} role="tab" aria-selected={mode === "design"} onClick={() => onSelectMode("design")}><MousePointer2 aria-hidden="true" /> Design</Button><Button type="button" size="sm" variant={mode === "mockup" ? "secondary" : "ghost"} role="tab" aria-selected={mode === "mockup"} disabled={!mockupAvailable} aria-label={mockupAvailable ? "Abrir modo Mockup" : "Mockup no disponible para este producto"} onClick={() => onSelectMode("mockup")}><Box aria-hidden="true" /> Mockup</Button>{threeDAvailable ? <Button type="button" size="sm" variant={mode === "three-d" ? "secondary" : "ghost"} role="tab" aria-selected={mode === "three-d"} aria-label="Abrir preview 3D" onClick={() => onSelectMode("three-d")}><Boxes aria-hidden="true" /> 3D</Button> : null}</div></div>
        </footer>
      </div>
    </main>
  );
}

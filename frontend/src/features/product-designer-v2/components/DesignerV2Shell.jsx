import { createElement } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Box, Copy, Eye, EyeOff, Image, Layers3, Lock, Minus, MousePointer2, PanelRight, Plus, Redo2, Save, Shapes, Trash2, Type, Undo2, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EditableDesignStage } from "./EditableDesignStage.jsx";
import { isElementOutOfBounds } from "../domain/designDocumentActions.js";

function ToolButtons({ mobile = false, onAddText, onChooseImage }) {
  const tools = [
    { label: "Texto", icon: Type, onClick: onAddText },
    { label: "Imagen", icon: Image, upload: true },
    { label: "Formas", icon: Shapes, disabled: true },
  ];
  return (
    <div className={mobile ? "grid grid-cols-3 gap-2" : "space-y-2"} aria-label="Herramientas de edición">
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
    </div>
  );
}

function Field({ label, children }) {
  return <label className="grid gap-1 text-xs font-medium text-muted-foreground"><span>{label}</span>{children}</label>;
}

function elementLabel(element) {
  return element.type === "text" ? element.content || "Texto vacío" : `Imagen · ${element.id.slice(0, 6)}`;
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

function PropertiesPanel({ selectedElements, view, activePrintAreaId, onUpdateElement, onDuplicate, onDelete }) {
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
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tamaño"><Input type="number" min="0.02" max="0.3" step="0.01" value={selectedElement.fontSize} onChange={(event) => onUpdateElement({ fontSize: Number(event.target.value) }, { groupKey: `property:${selectedElement.id}:fontSize` })} /></Field>
                <Field label="Color"><Input type="color" className="p-1" value={selectedElement.color} onChange={(event) => onUpdateElement({ color: event.target.value }, { groupKey: `property:${selectedElement.id}:color` })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Alineación"><Select value={selectedElement.textAlign} onChange={(event) => onUpdateElement({ textAlign: event.target.value })}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></Select></Field>
                <Field label="Peso"><Select value={selectedElement.fontWeight} onChange={(event) => onUpdateElement({ fontWeight: Number(event.target.value) })}><option value="400">Regular</option><option value="500">Medio</option><option value="600">Semibold</option><option value="700">Bold</option></Select></Field>
              </div>
            </>
          ) : (
            <dl className="grid grid-cols-2 gap-2 rounded-lg border p-2 text-xs">
              <div><dt className="text-muted-foreground">Ancho</dt><dd>{Math.round(selectedElement.width * 100)}%</dd></div><div><dt className="text-muted-foreground">Alto</dt><dd>{Math.round(selectedElement.height * 100)}%</dd></div>
              <div><dt className="text-muted-foreground">Rotación</dt><dd>{Math.round(selectedElement.rotation)}°</dd></div><div><dt className="text-muted-foreground">Opacidad</dt><dd>{Math.round(selectedElement.opacity * 100)}%</dd></div>
            </dl>
          )}
          <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" size="sm" onClick={onDuplicate}><Copy aria-hidden="true" /> Duplicar</Button><Button type="button" variant="destructive" size="sm" onClick={onDelete}><Trash2 aria-hidden="true" /> Eliminar</Button></div>
        </div>
      ) : <div className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Vista: {view.label}. Área activa: {view.printAreas.find((area) => area.id === activePrintAreaId)?.label || "Sin área"}.</div>}
    </div>
  );
}

function ZoomControls({ zoom, onZoomChange }) {
  return <div className="flex items-center gap-1" aria-label="Zoom del lienzo"><Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onZoomChange(zoom - 0.1)} disabled={zoom <= 0.5} aria-label="Reducir zoom"><Minus aria-hidden="true" /></Button><output className="w-12 text-center text-xs font-semibold" aria-live="polite">{Math.round(zoom * 100)}%</output><Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onZoomChange(zoom + 0.1)} disabled={zoom >= 2} aria-label="Aumentar zoom"><Plus aria-hidden="true" /></Button><Button type="button" variant="outline" size="sm" onClick={() => onZoomChange(1)}>Ajustar</Button></div>;
}

export function DesignerV2Shell({ product, template, document, activeViewId, activePrintAreaId, selectedElementIds, zoom, pan, dirty, canUndo, canRedo, assetRegistry, editorError, onSelectView, onSelectElement, onAddText, onChooseImage, onUpdateElement, onUpdateElements, onDuplicate, onDelete, onLayerAction, onUndo, onRedo, onZoomChange, onViewportChange, onEditorError, onBack }) {
  const view = template.views.find((candidate) => candidate.id === activeViewId) || template.views[0];
  const elements = document.views[view.id]?.elements || [];
  const selectedElements = elements.filter((element) => selectedElementIds.includes(element.id));
  const outOfBounds = selectedElements.some(isElementOutOfBounds);
  const layers = { elements, selectedElementIds, onSelectElement, onLayerAction };
  const properties = { selectedElements, view, activePrintAreaId, onUpdateElement, onDuplicate, onDelete };

  return (
    <main className="min-h-[calc(100vh-4rem)] min-w-0 bg-muted/20" aria-labelledby="designer-v2-title">
      <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col px-3 py-3 sm:px-4 lg:px-5">
        <header className="flex min-w-0 items-center gap-2 border-b bg-background/95 pb-3">
          <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Volver al producto"><ArrowLeft aria-hidden="true" /></Button>
          <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><h1 id="designer-v2-title" className="truncate text-base font-bold tracking-tight sm:text-lg">Designer V2</h1>{dirty ? <Badge variant="outline">Cambios sin guardar</Badge> : null}</div><p className="truncate text-xs text-muted-foreground">{product.name || "Producto"}</p></div>
          <div className="flex items-center gap-1" aria-label="Historial de edición"><Button type="button" variant="ghost" size="icon" disabled={!canUndo} onClick={onUndo} aria-label="Deshacer"><Undo2 aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" disabled={!canRedo} onClick={onRedo} aria-label="Rehacer"><Redo2 aria-hidden="true" /></Button></div>
          <Button type="button" size="sm" disabled title="La persistencia llegará en una fase posterior"><Save aria-hidden="true" /> <span className="hidden sm:inline">Guardar</span></Button>
        </header>

        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground" role="note"><strong>Edición local:</strong> las imágenes y cambios se pierden al cerrar esta página.</div>
        {editorError ? <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{editorError}</div> : null}

        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_16rem]">
          <aside className="hidden space-y-5 rounded-xl border bg-card p-3 lg:block" aria-label="Herramientas y capas"><div><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Herramientas</p><ToolButtons onAddText={onAddText} onChooseImage={onChooseImage} /></div><LayersPanel {...layers} /></aside>
          <section className="min-w-0 rounded-xl border bg-card p-3 sm:p-4" aria-labelledby="canvas-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><h2 id="canvas-title" className="text-sm font-semibold">Lienzo</h2><p className="truncate text-xs text-muted-foreground">{template.label}{zoom > 1 ? " · Espacio + arrastre para desplazar" : ""}</p></div><ZoomControls zoom={zoom} onZoomChange={onZoomChange} /></div>
            <EditableDesignStage template={template} document={document} activeViewId={activeViewId} selectedElementIds={selectedElementIds} zoom={zoom} pan={pan} assetRegistry={assetRegistry} outOfBounds={outOfBounds} onSelectionChange={onSelectElement} onElementChange={onUpdateElement} onElementsChange={onUpdateElements} onViewportChange={onViewportChange} onError={onEditorError} />
          </section>
          <aside className="hidden rounded-xl border bg-card p-3 lg:block" aria-label="Propiedades"><PropertiesPanel {...properties} /></aside>
        </div>

        <section className="mt-3 rounded-xl border bg-card p-3 lg:hidden" aria-label="Herramientas compactas"><ToolButtons mobile onAddText={onAddText} onChooseImage={onChooseImage} /><div className="mt-2 grid grid-cols-2 gap-2"><Sheet><SheetTrigger render={<Button type="button" variant="outline" size="sm" />}><Layers3 aria-hidden="true" /> Capas ({elements.length})</SheetTrigger><SheetContent side="left"><SheetHeader><SheetTitle>Capas</SheetTitle></SheetHeader><LayersPanel {...layers} /></SheetContent></Sheet><Sheet><SheetTrigger render={<Button type="button" variant="outline" size="sm" />}><PanelRight aria-hidden="true" /> Propiedades</SheetTrigger><SheetContent><SheetHeader><SheetTitle>Propiedades</SheetTitle></SheetHeader><PropertiesPanel {...properties} /></SheetContent></Sheet></div></section>

        <footer className="mt-3 grid min-w-0 gap-3 rounded-xl border bg-card p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vistas</p><div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Vistas del producto">{template.views.map((candidate) => { const count = document.views[candidate.id]?.elements.length || 0; return <button key={candidate.id} type="button" role="tab" aria-selected={activeViewId === candidate.id} onClick={() => onSelectView(candidate.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeViewId === candidate.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>{candidate.label} <span aria-label={`${count} elementos`}>({count})</span></button>; })}</div></div>
          <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modo</p><div className="flex gap-1 rounded-lg border bg-muted/35 p-1" role="tablist" aria-label="Modos del diseñador"><Button type="button" size="sm" variant="secondary" role="tab" aria-selected="true"><MousePointer2 aria-hidden="true" /> Design</Button><Button type="button" size="sm" variant="ghost" role="tab" disabled aria-label="Mockup próximamente"><Box aria-hidden="true" /> Mockup</Button></div></div>
        </footer>
      </div>
    </main>
  );
}

import { createElement } from "react";
import { ArrowLeft, Box, Copy, Image, Layers3, MousePointer2, Redo2, Save, Shapes, Trash2, Type, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

function PropertiesPanel({ selectedElement, view, activePrintAreaId, elements, onSelectElement, onUpdateElement, onDuplicate, onDelete }) {
  return (
    <div aria-live="polite">
      <div className="flex items-center gap-2"><Layers3 className="size-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-semibold">Propiedades y elementos</h2></div>
      {selectedElement ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Seleccionado: <strong className="text-foreground">{selectedElement.type === "text" ? selectedElement.content : "Imagen"}</strong></p>
          {selectedElement.type === "text" ? (
            <>
              <Field label="Contenido"><Input value={selectedElement.content} onChange={(event) => onUpdateElement({ content: event.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tamaño relativo"><Input type="number" min="0.02" max="0.3" step="0.01" value={selectedElement.fontSize} onChange={(event) => onUpdateElement({ fontSize: Number(event.target.value) })} /></Field>
                <Field label="Color"><Input type="color" className="p-1" value={selectedElement.color} onChange={(event) => onUpdateElement({ color: event.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Alineación"><Select value={selectedElement.textAlign} onChange={(event) => onUpdateElement({ textAlign: event.target.value })}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></Select></Field>
                <Field label="Peso"><Select value={selectedElement.fontWeight} onChange={(event) => onUpdateElement({ fontWeight: Number(event.target.value) })}><option value="400">Regular</option><option value="500">Medio</option><option value="600">Semibold</option><option value="700">Bold</option></Select></Field>
              </div>
            </>
          ) : (
            <dl className="grid grid-cols-2 gap-2 rounded-lg border p-2 text-xs">
              <div><dt className="text-muted-foreground">Ancho</dt><dd>{Math.round(selectedElement.width * 100)}%</dd></div>
              <div><dt className="text-muted-foreground">Alto</dt><dd>{Math.round(selectedElement.height * 100)}%</dd></div>
              <div><dt className="text-muted-foreground">Rotación</dt><dd>{Math.round(selectedElement.rotation)}°</dd></div>
              <div><dt className="text-muted-foreground">Opacidad</dt><dd>{Math.round(selectedElement.opacity * 100)}%</dd></div>
            </dl>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onDuplicate}><Copy aria-hidden="true" /> Duplicar</Button>
            <Button type="button" variant="destructive" size="sm" onClick={onDelete}><Trash2 aria-hidden="true" /> Eliminar</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Vista: {view.label}. Área activa: {view.printAreas.find((area) => area.id === activePrintAreaId)?.label || "Sin área"}.</div>
      )}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Elementos ({elements.length})</p>
        {elements.length ? (
          <div className="space-y-1" role="list" aria-label="Elementos de la vista activa">
            {[...elements].sort((a, b) => b.zIndex - a.zIndex).map((element) => (
              <button key={element.id} type="button" role="listitem" onClick={() => onSelectElement(element.id)} className={`w-full truncate rounded-md border px-2 py-2 text-left text-xs hover:bg-accent ${selectedElement?.id === element.id ? "border-primary bg-primary/10" : "bg-background"}`}>
                {element.type === "text" ? element.content : `Imagen · ${element.id.slice(0, 6)}`}
              </button>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">Añade texto o una imagen para empezar.</p>}
      </div>
    </div>
  );
}

export function DesignerV2Shell({ product, template, document, activeViewId, activePrintAreaId, selectedElementId, assetRegistry, editorError, onSelectView, onSelectElement, onAddText, onChooseImage, onUpdateElement, onDuplicate, onDelete, onEditorError, onBack }) {
  const view = template.views.find((candidate) => candidate.id === activeViewId) || template.views[0];
  const elements = document.views[view.id]?.elements || [];
  const selectedElement = elements.find((element) => element.id === selectedElementId) || null;
  const outOfBounds = selectedElement ? isElementOutOfBounds(selectedElement) : false;
  const properties = { selectedElement, view, activePrintAreaId, elements, onSelectElement, onUpdateElement, onDuplicate, onDelete };

  return (
    <main className="min-h-[calc(100vh-4rem)] min-w-0 bg-muted/20" aria-labelledby="designer-v2-title">
      <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col px-3 py-3 sm:px-4 lg:px-5">
        <header className="flex min-w-0 items-center gap-2 border-b bg-background/95 pb-3">
          <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Volver al producto"><ArrowLeft aria-hidden="true" /></Button>
          <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><h1 id="designer-v2-title" className="truncate text-base font-bold tracking-tight sm:text-lg">Designer V2</h1><Badge variant="outline" className="hidden sm:inline-flex">Fabric core</Badge></div><p className="truncate text-xs text-muted-foreground">{product.name || "Producto"}</p></div>
          <div className="hidden items-center gap-1 sm:flex" aria-label="Historial de edición"><Button type="button" variant="ghost" size="icon" disabled aria-label="Deshacer no disponible"><Undo2 aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" disabled aria-label="Rehacer no disponible"><Redo2 aria-hidden="true" /></Button></div>
          <Button type="button" size="sm" disabled title="La persistencia llegará en una fase posterior"><Save aria-hidden="true" /> <span className="hidden sm:inline">Guardar</span></Button>
        </header>

        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground" role="note"><strong>Edición local:</strong> las imágenes y cambios se pierden al cerrar esta página.</div>
        {editorError ? <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{editorError}</div> : null}

        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
          <aside className="hidden rounded-xl border bg-card p-3 lg:block" aria-label="Herramientas"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Herramientas</p><ToolButtons onAddText={onAddText} onChooseImage={onChooseImage} /><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Doble click sobre texto para editarlo.</p></aside>
          <section className="min-w-0 rounded-xl border bg-card p-3 sm:p-4" aria-labelledby="canvas-title">
            <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><h2 id="canvas-title" className="text-sm font-semibold">Lienzo</h2><p className="truncate text-xs text-muted-foreground">{template.label}</p></div><Badge variant="secondary">Editable</Badge></div>
            <EditableDesignStage template={template} document={document} activeViewId={activeViewId} selectedElementId={selectedElementId} assetRegistry={assetRegistry} outOfBounds={outOfBounds} onSelectionChange={onSelectElement} onElementChange={onUpdateElement} onError={onEditorError} />
          </section>
          <aside className="hidden rounded-xl border bg-card p-3 lg:block" aria-label="Propiedades y elementos"><PropertiesPanel {...properties} /></aside>
        </div>

        <section className="mt-3 rounded-xl border bg-card p-3 lg:hidden" aria-label="Herramientas compactas"><ToolButtons mobile onAddText={onAddText} onChooseImage={onChooseImage} /></section>
        <section className="mt-3 rounded-xl border bg-card p-3 lg:hidden" aria-label="Propiedades y elementos móviles"><PropertiesPanel {...properties} /></section>

        <footer className="mt-3 grid min-w-0 gap-3 rounded-xl border bg-card p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vistas</p><div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Vistas del producto">{template.views.map((candidate) => <button key={candidate.id} type="button" role="tab" aria-selected={activeViewId === candidate.id} onClick={() => onSelectView(candidate.id)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeViewId === candidate.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>{candidate.label}</button>)}</div></div>
          <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modo</p><div className="flex gap-1 rounded-lg border bg-muted/35 p-1" role="tablist" aria-label="Modos del diseñador"><Button type="button" size="sm" variant="secondary" role="tab" aria-selected="true"><MousePointer2 aria-hidden="true" /> Design</Button><Button type="button" size="sm" variant="ghost" role="tab" disabled aria-label="Mockup próximamente"><Box aria-hidden="true" /> Mockup</Button><Button type="button" size="sm" variant="ghost" role="tab" disabled aria-label="3D próximamente">3D</Button></div></div>
        </footer>
      </div>
    </main>
  );
}

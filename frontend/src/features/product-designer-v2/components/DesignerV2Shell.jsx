import { createElement } from "react";
import {
  ArrowLeft,
  Box,
  Image,
  Layers3,
  MousePointer2,
  Redo2,
  Save,
  Shapes,
  Type,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReadOnlyDesignStage } from "./ReadOnlyDesignStage.jsx";

const tools = [
  { label: "Texto", icon: Type },
  { label: "Imagen", icon: Image },
  { label: "Formas", icon: Shapes },
];

function DisabledTools({ mobile = false }) {
  return (
    <div className={mobile ? "grid grid-cols-3 gap-2" : "space-y-2"} aria-label="Herramientas disponibles en próximas fases">
      {tools.map(({ label, icon }) => (
        <Button key={label} type="button" variant="outline" size="sm" className={mobile ? "w-full" : "w-full justify-start"} disabled>
          {createElement(icon, { "aria-hidden": true })} {label}
        </Button>
      ))}
    </div>
  );
}

export function DesignerV2Shell({ product, template, document, activeViewId, onSelectView, onBack }) {
  return (
    <main className="min-h-[calc(100vh-4rem)] min-w-0 bg-muted/20" aria-labelledby="designer-v2-title">
      <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col px-3 py-3 sm:px-4 lg:px-5">
        <header className="flex min-w-0 items-center gap-2 border-b bg-background/95 pb-3">
          <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Volver al producto">
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 id="designer-v2-title" className="truncate text-base font-bold tracking-tight sm:text-lg">Designer V2</h1>
              <Badge variant="outline" className="hidden sm:inline-flex">Foundation</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">{product.name || "Producto"}</p>
          </div>
          <div className="hidden items-center gap-1 sm:flex" aria-label="Historial de edición">
            <Button type="button" variant="ghost" size="icon" disabled aria-label="Deshacer no disponible"><Undo2 aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled aria-label="Rehacer no disponible"><Redo2 aria-hidden="true" /></Button>
          </div>
          <Button type="button" size="sm" disabled title="El guardado llegará en una fase posterior">
            <Save aria-hidden="true" /> <span className="hidden sm:inline">Guardar</span>
          </Button>
        </header>

        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground" role="note">
          <strong>Fixture de desarrollo:</strong> no representa medidas, impresión ni assets comerciales.
        </div>

        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[11rem_minmax(0,1fr)_15rem]">
          <aside className="hidden rounded-xl border bg-card p-3 lg:block" aria-label="Herramientas">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Herramientas</p>
            <DisabledTools />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">La edición se implementará en SPEC-020B.</p>
          </aside>

          <section className="min-w-0 rounded-xl border bg-card p-3 sm:p-4" aria-labelledby="canvas-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 id="canvas-title" className="text-sm font-semibold">Lienzo</h2>
                <p className="truncate text-xs text-muted-foreground">{template.label}</p>
              </div>
              <Badge variant="secondary">Solo lectura</Badge>
            </div>
            <ReadOnlyDesignStage template={template} activeViewId={activeViewId} />
          </section>

          <aside className="hidden rounded-xl border bg-card p-3 lg:block" aria-label="Propiedades y capas">
            <div className="flex items-center gap-2"><Layers3 className="size-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-semibold">Propiedades y capas</h2></div>
            <div className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Selecciona un elemento cuando las herramientas estén disponibles.
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Documento</dt><dd className="max-w-28 truncate font-mono" title={document.documentId}>{document.documentId.slice(0, 8)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Schema</dt><dd>v{document.schemaVersion}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Elementos</dt><dd>0</dd></div>
            </dl>
          </aside>
        </div>

        <section className="mt-3 rounded-xl border bg-card p-3 lg:hidden" aria-label="Herramientas compactas">
          <DisabledTools mobile />
        </section>

        <footer className="mt-3 grid min-w-0 gap-3 rounded-xl border bg-card p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vistas</p>
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Vistas del producto">
              {template.views.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  role="tab"
                  aria-selected={activeViewId === view.id}
                  onClick={() => onSelectView(view.id)}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeViewId === view.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modo</p>
            <div className="flex gap-1 rounded-lg border bg-muted/35 p-1" role="tablist" aria-label="Modos del diseñador">
              <Button type="button" size="sm" variant="secondary" role="tab" aria-selected="true"><MousePointer2 aria-hidden="true" /> Design</Button>
              <Button type="button" size="sm" variant="ghost" role="tab" disabled aria-label="Mockup próximamente"><Box aria-hidden="true" /> Mockup</Button>
              <Button type="button" size="sm" variant="ghost" role="tab" disabled aria-label="3D próximamente">3D</Button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

import { LockKeyhole } from "lucide-react";
import { getViewAspectRatio, getViewPrintAreas, getViewPrintSurface } from "../contracts/printSurface.js";

function percentage(value) {
  return `${value * 100}%`;
}

export function ReadOnlyDesignStage({ template, activeViewId }) {
  const view = template.views.find((candidate) => candidate.id === activeViewId) || template.views[0];
  const printAreas = getViewPrintAreas(template, view);
  const unifiedSurface = Boolean(getViewPrintSurface(template, view));

  return (
    <figure className="min-w-0">
      <div
        className="relative mx-auto w-full max-w-[46rem] overflow-hidden rounded-xl border bg-muted/35 shadow-inner"
        style={{ aspectRatio: getViewAspectRatio(template, view) }}
        role="img"
        aria-label={`${view.label}. Superficie de diseño de solo lectura con ${printAreas.length} área imprimible.`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <div className={`absolute rounded-lg border bg-background/85 ${unifiedSurface ? "inset-0" : "inset-4 sm:inset-6"}`}>
          <div className="absolute left-3 top-3 rounded-md border bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            {view.surface?.label || view.label}
          </div>
          {printAreas.map((area) => (
            <div
              key={area.id}
              className={`absolute grid place-items-center border-2 border-dashed border-primary bg-primary/5 ${area.shape.type === "ellipse" ? "rounded-full" : "rounded-md"}`}
              style={{
                left: percentage(area.x),
                top: percentage(area.y),
                width: percentage(area.width),
                height: percentage(area.height),
              }}
            >
              <div className="flex max-w-[90%] items-center gap-1.5 rounded-md border bg-background/95 px-2 py-1 text-center text-[11px] font-semibold text-foreground shadow-sm sm:text-xs">
                <LockKeyhole className="size-3.5 text-primary" aria-hidden="true" />
                <span>{area.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        Superficie read-only para validar el contrato y las coordenadas. No se exporta este overlay.
      </figcaption>
    </figure>
  );
}

import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MockupPanel({ status, result, error, onGenerate }) {
  const hasImage = Boolean(result?.url);
  return (
    <section className="flex min-h-[28rem] min-w-0 flex-col items-center justify-center rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="mockup-title">
      <div className="mb-4 w-full max-w-4xl text-center"><h2 id="mockup-title" className="text-base font-semibold">Mockup de producto</h2><p className="mt-1 text-xs text-muted-foreground">Preview básico de desarrollo · sin curvatura ni escala productiva</p></div>
      {hasImage ? <div className="flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-2"><img src={result.url} alt="Mockup derivado de la taza personalizada" className="max-h-[62vh] w-full object-contain" /></div> : null}
      {status === "loading" ? <div className="flex items-center gap-2 py-8 text-sm" role="status" aria-live="polite"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Generando mockup…</div> : null}
      {status === "error" ? <div className="mt-4 flex max-w-xl items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{error}</span></div> : null}
      {status === "stale" ? <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm" role="status"><strong>Mockup desactualizado.</strong> El diseño ha cambiado desde esta generación.</div> : null}
      {status !== "loading" ? <Button type="button" className="mt-4" onClick={onGenerate}><RefreshCw aria-hidden="true" /> {hasImage ? "Actualizar mockup" : "Generar mockup"}</Button> : null}
    </section>
  );
}


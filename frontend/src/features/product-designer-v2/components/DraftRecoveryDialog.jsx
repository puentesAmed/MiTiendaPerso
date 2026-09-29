import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countDraftElements } from "../persistence/draftModel.js";

export function DraftRecoveryDialog({ draft, productName, templateLabel, busy, error, canContinue = true, onContinue, onStartNew }) {
  if (!draft) return null;
  const modified = new Date(draft.updatedAt).toLocaleString("es-ES");
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} aria-describedby="draft-recovery-description">
        <DialogHeader>
          <DialogTitle>Continuar diseño</DialogTitle>
          <DialogDescription id="draft-recovery-description">Hay un diseño guardado en este dispositivo. Elige cómo continuar; no se restaurará ni descartará sin tu decisión.</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Producto</dt><dd className="font-medium">{productName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Plantilla</dt><dd>{templateLabel}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Última modificación</dt><dd>{modified}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Contenido</dt><dd>{countDraftElements(draft)} elementos</dd></div>
        </dl>
        {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={onStartNew}>Empezar de nuevo</Button>
          <Button type="button" disabled={busy || !canContinue} onClick={onContinue}>{busy ? "Recuperando…" : "Continuar diseño"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

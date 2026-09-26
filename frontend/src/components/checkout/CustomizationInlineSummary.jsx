import { Pencil, Sparkles } from "lucide-react";
import { Button } from "../ui/button";

export function CustomizationInlineSummary({ item, onEdit }) {
  const customization = item?.customization;
  if (!customization) return null;

  const texts = Array.isArray(customization.textSummary)
    ? customization.textSummary.filter(Boolean).slice(0, 2)
    : [];

  return (
    <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 truncate">
        Personalizado{texts.length > 0 ? ` · ${texts.join(" · ")}` : ""}
      </span>
      <Button type="button" variant="link" size="sm" className="h-auto shrink-0 p-0 text-xs" onClick={onEdit}>
        <Pencil aria-hidden="true" /> Editar
      </Button>
    </div>
  );
}

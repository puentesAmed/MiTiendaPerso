import { Pencil, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { ProductImage } from "../ui/ProductImage";

export function CartCustomizationSummary({ item, onEdit }) {
  const customization = item?.customization;
  if (!customization) return null;

  const preview = customization.previewImage || null;
  const texts = Array.isArray(customization.textSummary)
    ? customization.textSummary.filter(Boolean).slice(0, 2)
    : [];
  const selectedSurfaces = customization.customizationPricing?.selectedSurfaces || [];

  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
      {preview && (
        <ProductImage
          src={preview}
          alt={`Vista previa de la personalización de ${item.presentation.name}`}
          ratio="1 / 1"
          className="w-14 shrink-0 rounded-md border bg-background"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          Producto personalizado
        </p>
        {texts.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Texto: {texts.map((text) => `“${text}”`).join(" · ")}
          </p>
        )}
        {selectedSurfaces.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Superficies: {selectedSurfaces.map((surface) => surface.label).join(" · ")}
          </p>
        )}
        {Number(customization.customizationPricing?.customizationAmount) > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Personalización: +{Number(customization.customizationPricing.customizationAmount).toFixed(2)} €
          </p>
        )}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto p-0 text-xs"
          onClick={onEdit}
        >
          <Pencil aria-hidden="true" /> Editar personalización
        </Button>
      </div>
    </div>
  );
}

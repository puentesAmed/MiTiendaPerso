import { Palette } from "lucide-react";
import { Price } from "../ui/Price";
import { ProductImage } from "../ui/ProductImage";

export function OrderItemsList({ items = [] }) {
  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map((item, index) => {
        const variant = item?.variant || item?.selectedVariant || null;
        const customization = item.customization;
        const titleId = `order-item-${index}`;
        return (
          <article key={item._id || `${item.productId}-${index}`} className="flex min-w-0 gap-3 p-3 sm:gap-4 sm:p-4" aria-labelledby={titleId}>
            <ProductImage src={customization?.previewImage} alt={customization?.previewImage ? `Vista previa de ${item.name}` : ""} ratio="1 / 1" className="size-16 shrink-0 rounded-lg border sm:size-20" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 id={titleId} className="break-words text-sm font-semibold sm:text-base">{item.name || "Producto"}</h3>
                  {(variant?.size || variant?.color) && <p className="mt-0.5 text-xs text-muted-foreground">{variant.size && `Talla: ${variant.size}`}{variant.size && variant.color && " · "}{variant.color && `Color: ${variant.color}`}</p>}
                </div>
                <Price value={Number(item.price || 0) * Number(item.quantity || 0)} className="shrink-0 text-base" />
              </div>
              {customization && (
                <div className="mt-2 rounded-lg bg-primary/5 p-2.5 text-xs">
                  <p className="flex items-center gap-1.5 font-semibold"><Palette className="size-3.5 text-primary" aria-hidden="true" /> Personalización</p>
                  {customization.textSummary?.length > 0 && <p className="mt-1 break-words text-muted-foreground">Texto: {customization.textSummary.join(" · ")}</p>}
                  {customization.notes && <p className="mt-1 break-words text-muted-foreground">Notas: {customization.notes}</p>}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Cantidad: {item.quantity}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

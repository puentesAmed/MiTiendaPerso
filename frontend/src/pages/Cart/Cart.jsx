import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { CartCustomizationSummary } from "../../components/cart/CartCustomizationSummary";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageContainer } from "../../components/ui/PageContainer";
import { Price } from "../../components/ui/Price";
import { ProductImage } from "../../components/ui/ProductImage";

function VariantSummary({ variant }) {
  if (!variant?.size && !variant?.color) return null;

  return (
    <p className="mt-0.5 text-xs text-muted-foreground">
      {variant.size && `Talla: ${variant.size}`}
      {variant.size && variant.color && " · "}
      {variant.color && `Color: ${variant.color}`}
    </p>
  );
}

function QuantityControl({ item, onUpdate }) {
  return (
    <div
      className="flex h-10 w-fit items-stretch overflow-hidden rounded-lg border bg-background"
      role="group"
      aria-label={`Cantidad de ${item.presentation.name}`}
    >
      <button
        type="button"
        onClick={() => onUpdate(item.lineKey, item.quantity - 1)}
        disabled={item.quantity <= 1}
        aria-label={`Reducir cantidad de ${item.presentation.name}`}
        className="inline-flex w-10 items-center justify-center transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="inline-flex min-w-10 items-center justify-center border-x px-2 text-sm font-semibold" aria-live="polite">
        {item.quantity}
      </span>
      <button
        type="button"
        onClick={() => onUpdate(item.lineKey, item.quantity + 1)}
        aria-label={`Aumentar cantidad de ${item.presentation.name}`}
        className="inline-flex w-10 items-center justify-center transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Cart() {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Compra</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tu carrito</h1>
        </div>
        {items.length > 0 && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {totalItems} {totalItems === 1 ? "artículo" : "artículos"}
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Tu carrito está vacío"
          description="Explora el catálogo para añadir productos a tu compra."
          action={<Button as={Link} to="/productos">Ver productos <ArrowRight aria-hidden="true" /></Button>}
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-7">
          <div className="min-w-0">
            <Card className="overflow-hidden shadow-none">
              <div className="divide-y">
                {items.map((item, index) => {
                  const lineTotal = item.quantity * item.presentation.displayPrice;
                  const titleId = `cart-line-title-${index}`;

                  return (
                    <article key={item.lineKey} className="p-3 sm:p-4" aria-labelledby={titleId}>
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <ProductImage
                          src={item.presentation.image}
                          alt={item.presentation.name}
                          ratio="1 / 1"
                          className="w-20 shrink-0 rounded-lg border sm:w-24"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 id={titleId} className="truncate text-sm font-semibold sm:text-base">
                                {item.presentation.name}
                              </h2>
                              <VariantSummary variant={item.variant} />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="-mr-2 -mt-2 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(item.lineKey)}
                              aria-label={`Eliminar ${item.presentation.name} del carrito`}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>

                          {item.customization && (
                            <CartCustomizationSummary
                              item={item}
                              onEdit={() => navigate(`/personalizar-v2/${item.productId}`, {
                                state: {
                                  lineKey: item.lineKey,
                                  variant: item.variant,
                                  customization: item.customization,
                                  returnTo: "/carrito",
                                },
                              })}
                            />
                          )}

                          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                            <QuantityControl item={item} onUpdate={updateQuantity} />
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground">Importe estimado</span>
                              <Price value={lineTotal} className="text-base sm:text-lg" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Card>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button as={Link} to="/productos" variant="ghost" size="sm">
                Seguir comprando
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={clearCart}>
                <Trash2 aria-hidden="true" /> Vaciar carrito
              </Button>
            </div>
          </div>

          <Card className="p-4 shadow-none lg:sticky lg:top-20">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Resumen</h2>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Artículos</dt>
                <dd className="font-medium">{totalItems}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Envío</dt>
                <dd className="max-w-40 text-right font-medium">Calculado en checkout</dd>
              </div>
            </dl>

            <div className="my-4 border-t" />

            <div className="flex items-end justify-between gap-3">
              <span className="text-sm font-semibold">Subtotal estimado</span>
              <Price value={totalAmount} className="text-xl" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              El importe definitivo se validará en checkout.
            </p>

            <Button type="button" size="lg" className="mt-4 w-full" onClick={() => navigate("/checkout")}>
              Continuar al checkout <ArrowRight aria-hidden="true" />
            </Button>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}

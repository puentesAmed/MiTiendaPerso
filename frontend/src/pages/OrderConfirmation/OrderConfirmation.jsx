import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Clipboard, Clock3, PackageCheck } from "lucide-react";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { PageContainer } from "../../components/ui/PageContainer";
import { Price } from "../../components/ui/Price";
import { ProductImage } from "../../components/ui/ProductImage";
import { displayOrderNumber } from "../../utils/orderNumber";

function formatMoney(value, currency = "EUR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString("es-ES", { style: "currency", currency });
}

function CopyValue({ label, value, copied, onCopy }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 break-all text-sm font-semibold">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-mr-1 -mt-1 h-8 shrink-0 px-2"
          onClick={() => onCopy(value, label)}
          aria-label={`Copiar ${label.toLowerCase()}`}
        >
          {copied === label ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
          <span className="sr-only sm:not-sr-only">{copied === label ? "Copiado" : "Copiar"}</span>
        </Button>
      </dd>
    </div>
  );
}

export function OrderConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState("");

  if (!state?.orderId) {
    return (
      <PageContainer size="narrow" className="py-10">
        <Card className="p-5 shadow-none">
          <Alert className="flex items-start gap-2 border-warning/30 bg-warning/10">
            <PackageCheck className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h1 className="font-semibold">No encontramos la confirmación</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Las instrucciones solo están disponibles justo después de crear el pedido. No inventaremos ni mostraremos datos de pago sin esa respuesta segura.
              </p>
            </div>
          </Alert>
          <Button type="button" className="mt-4" onClick={() => navigate("/")}>Volver a la tienda</Button>
        </Card>
      </PageContainer>
    );
  }

  const { order, orderId, isGuest, email, emailHasAccount } = state;
  const orderNumber = displayOrderNumber({ orderNumber: state.orderNumber || order?.orderNumber, _id: orderId });
  const method = order?.payment?.method;
  const paymentMethodLabel = method === "bank_transfer" ? "Transferencia bancaria" : method === "bizum" ? "Bizum" : "Pago manual";
  const amount = order?.total;
  const currency = "EUR";
  const itemCount = order?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0;

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  };

  return (
    <PageContainer size="default" className="py-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-success">Pedido creado</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gracias por tu pedido</h1>
            <p className="mt-1 break-words text-sm text-muted-foreground">Pedido: <strong className="text-foreground">{orderNumber}</strong></p>
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-7">
          <main className="min-w-0 space-y-4">
            <Card className="p-4 shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Importe final</p>
                  <Price value={amount} currency={currency} className="text-2xl" />
                </div>
                <Badge variant="warning" className="gap-1.5 px-2.5 py-1 text-xs">
                  <Clock3 className="size-3.5" aria-hidden="true" /> Pendiente de pago
                </Badge>
              </div>
              <dl className="mt-4 grid gap-2 border-t pt-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Método</dt><dd className="font-semibold">{paymentMethodLabel}</dd></div>
                <div><dt className="text-muted-foreground">Artículos</dt><dd className="font-semibold">{itemCount}</dd></div>
              </dl>
            </Card>

            <Card className="p-4 shadow-none" aria-labelledby="payment-instructions-title">
                <div className="flex items-center gap-2">
                  <PackageCheck className="size-5 text-primary" aria-hidden="true" />
                  <h2 id="payment-instructions-title" className="font-semibold">Pago pendiente</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Te hemos enviado las instrucciones de pago por email.</p>
                <p className="mt-1 text-sm text-muted-foreground">Usa la referencia de pedido indicada en el correo.</p>
                <dl className="mt-4"><CopyValue label="Referencia del pedido" value={orderNumber} copied={copied} onCopy={copyToClipboard} /></dl>
                <span className="sr-only" role="status" aria-live="polite">{copied ? `${copied} copiado` : ""}</span>
              </Card>

            {isGuest && email && (
              <Card className="p-4 shadow-none">
                <h2 className="font-semibold">Confirmación por email</h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">Hemos enviado los detalles a <strong className="text-foreground">{email}</strong>.</p>
                {!emailHasAccount && (
                  <Button as={Link} to="/register" state={{ fromGuest: true, email }} variant="outline" size="sm" className="mt-3">
                    Crear cuenta y vincular pedidos
                  </Button>
                )}
                {emailHasAccount && <p className="mt-2 text-xs text-muted-foreground">El pedido aparecerá en tu cuenta cuando inicies sesión.</p>}
              </Card>
            )}
          </main>

          <aside className="min-w-0">
            <Card className="overflow-hidden shadow-none lg:sticky lg:top-20">
              <div className="border-b p-4">
                <h2 className="font-semibold">Resumen del pedido</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{itemCount} {itemCount === 1 ? "artículo" : "artículos"}</p>
              </div>
              <div className="divide-y">
                {order?.items?.map((item, index) => (
                  <article key={item._id || item.productId || index} className="flex min-w-0 gap-3 p-3">
                    <ProductImage src={item.image} alt="" ratio="1 / 1" className="size-12 shrink-0 rounded-md border" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                      {(item.selectedVariant?.size || item.selectedVariant?.color) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.selectedVariant.size && `Talla: ${item.selectedVariant.size}`}
                          {item.selectedVariant.size && item.selectedVariant.color && " · "}
                          {item.selectedVariant.color && `Color: ${item.selectedVariant.color}`}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">x{item.quantity} · {formatMoney(Number(item.price) * Number(item.quantity))}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="border-t p-4">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm font-semibold">Total servidor</span>
                  <Price value={amount} currency={currency} className="text-xl" />
                </div>
              </div>
            </Card>
          </aside>
        </div>

        {order?.shippingAddress && (
          <Card className="mt-5 p-4 shadow-none">
            <h2 className="font-semibold">Dirección de entrega</h2>
            <address className="mt-2 break-words text-sm not-italic text-muted-foreground">
              {order.shippingAddress.fullName}<br />
              {order.shippingAddress.street}<br />
              {order.shippingAddress.postalCode} {order.shippingAddress.city}<br />
              {order.shippingAddress.state}{order.shippingAddress.country ? ` · ${order.shippingAddress.country}` : ""}
            </address>
          </Card>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button as={Link} to="/productos">Seguir comprando</Button>
          {!isGuest && <Button as={Link} to="/mis-pedidos" variant="outline">Ver mis pedidos</Button>}
        </div>
      </div>
    </PageContainer>
  );
}

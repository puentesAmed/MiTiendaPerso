import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Clipboard, CreditCard, MapPin, Truck } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getMyOrderDetailRequest } from "../../services/orders.service";
import { AccountShell } from "../../components/account/AccountShell";
import { OrderItemsList } from "../../components/orders/OrderItemsList";
import {
  formatOrderDate,
  getPaymentMethod,
  getPaymentStatus,
  OrderStatusBadge,
  paymentMethodLabel,
  PaymentStatusBadge,
} from "../../components/orders/orderPresentation";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Price } from "../../components/ui/Price";
import { Skeleton } from "../../components/ui/skeleton";

function DetailSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando detalle del pedido" className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
      <span className="sr-only">Cargando detalle del pedido…</span>
    </div>
  );
}

function CopyValue({ label, value, copied, onCopy }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 [overflow-wrap:anywhere] text-sm font-semibold">{value}</span>
        <Button type="button" variant="ghost" size="sm" className="-mr-1 -mt-1 h-8 shrink-0 px-2" onClick={() => onCopy(value, label)} aria-label={`Copiar ${label.toLowerCase()}`}>
          {copied === label ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
          <span className="sr-only sm:not-sr-only">{copied === label ? "Copiado" : "Copiar"}</span>
        </Button>
      </dd>
    </div>
  );
}

function PaymentInstructions({ instructions }) {
  const [copied, setCopied] = useState("");

  const copyValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("");
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-sm font-semibold">Instrucciones de pago</h3>
      <p className="mt-1 text-xs text-muted-foreground">Usa exactamente los datos proporcionados para identificar el pedido.</p>
      <dl className="mt-3 grid gap-2">
        {instructions.method === "bizum" ? (
          <CopyValue label="Destinatario Bizum" value={instructions.recipient} copied={copied} onCopy={copyValue} />
        ) : (
          <>
            {instructions.accountHolder && <div className="rounded-lg border bg-background p-3"><dt className="text-xs font-medium text-muted-foreground">Titular</dt><dd className="mt-1 break-words text-sm font-semibold">{instructions.accountHolder}</dd></div>}
            <CopyValue label="IBAN" value={instructions.iban} copied={copied} onCopy={copyValue} />
          </>
        )}
        <CopyValue label="Referencia" value={instructions.reference} copied={copied} onCopy={copyValue} />
        <div className="rounded-lg border bg-background p-3"><dt className="text-xs font-medium text-muted-foreground">Importe</dt><dd className="mt-1"><Price value={instructions.amount} currency={instructions.currency} className="text-sm" /></dd></div>
      </dl>
      {instructions.instructions && <p className="mt-3 rounded-lg bg-muted p-3 text-sm leading-relaxed">{instructions.instructions}</p>}
      <p className="mt-3 text-sm font-medium">Pendiente de verificación manual.</p>
      <span className="sr-only" role="status" aria-live="polite">{copied ? `${copied} copiado` : ""}</span>
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMyOrderDetailRequest(id);
      if (!data.ok) throw new Error(data.message || "No se pudo cargar el pedido.");
      setDetail(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadError.message || "No se pudo cargar el pedido.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true, state: { from: `/mis-pedidos/${id}` } });
      return;
    }
    loadOrder();
  }, [user, navigate, id, loadOrder]);

  if (!user) return null;

  const order = detail?.order;
  const summary = detail?.summary;
  const paymentStatus = getPaymentStatus(order);
  const paymentMethod = getPaymentMethod(order);

  return (
    <AccountShell>
      <Button as={Link} to="/mis-pedidos" variant="ghost" size="sm" className="mb-3 -ml-2"><ArrowLeft aria-hidden="true" /> Volver a mis pedidos</Button>
      {loading && <DetailSkeleton />}
      {!loading && error && <ErrorState title="No se pudo cargar el pedido" description={error} onRetry={loadOrder} />}
      {!loading && !error && order && (
        <>
          <header className="mb-5">
            <p className="text-xs text-muted-foreground">Pedido</p>
            <h2 className="break-all text-xl font-bold tracking-tight sm:text-2xl">#{order._id}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatOrderDate(order.createdAt)}</p>
            <div className="mt-3 flex flex-wrap gap-2"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={paymentStatus} /></div>
          </header>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-7">
            <main className="min-w-0 space-y-5">
              <section aria-labelledby="order-items-title">
                <h2 id="order-items-title" className="mb-3 text-lg font-semibold">Artículos</h2>
                <OrderItemsList items={order.items} />
              </section>

              <Card className="p-4 shadow-none">
                <div className="flex items-center gap-2"><MapPin className="size-5 text-primary" aria-hidden="true" /><h2 className="font-semibold">Entrega</h2></div>
                <address className="mt-3 break-words text-sm not-italic text-muted-foreground">
                  <strong className="text-foreground">{order.shippingAddress?.fullName}</strong><br />
                  {order.shippingAddress?.street}<br />
                  {order.shippingAddress?.postalCode} {order.shippingAddress?.city}<br />
                  {order.shippingAddress?.state}{order.shippingAddress?.country ? ` · ${order.shippingAddress.country}` : ""}
                </address>
                {order.shipping?.estimatedDays && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Truck className="size-4" aria-hidden="true" /> Plazo estimado almacenado: {order.shipping.estimatedDays.min}–{order.shipping.estimatedDays.max} días laborables</p>}
              </Card>

              {order.notes && <Card className="p-4 shadow-none"><h2 className="font-semibold">Notas del pedido</h2><p className="mt-2 break-words text-sm text-muted-foreground">{order.notes}</p></Card>}
            </main>

            <aside className="space-y-4 lg:sticky lg:top-20">
              <Card className="p-4 shadow-none">
                <h2 className="font-semibold">Resumen</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Subtotal histórico</dt><dd><Price value={summary?.subtotal} className="text-sm" /></dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Envío</dt><dd><Price value={summary?.shipping} className="text-sm" /></dd></div>
                </dl>
                <div className="my-3 border-t" />
                <div className="flex items-end justify-between gap-3"><span className="font-semibold">Total</span><Price value={summary?.total} className="text-xl" /></div>
              </Card>

              <Card className="p-4 shadow-none">
                <div className="flex items-center gap-2"><CreditCard className="size-5 text-primary" aria-hidden="true" /><h2 className="font-semibold">Pago</h2></div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div><dt className="text-muted-foreground">Método</dt><dd className="font-semibold">{paymentMethodLabel(paymentMethod)}</dd></div>
                  <div><dt className="text-muted-foreground">Estado</dt><dd className="mt-1"><PaymentStatusBadge status={paymentStatus} /></dd></div>
                </dl>
                {detail.paymentInstructions && <PaymentInstructions instructions={detail.paymentInstructions} />}
                {paymentStatus === "pending" && ["bizum", "bank_transfer"].includes(paymentMethod) && !detail.paymentInstructions && <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">Las instrucciones no están disponibles en este momento. Contacta con la tienda antes de realizar el pago.</p>}
              </Card>
            </aside>
          </div>
        </>
      )}
    </AccountShell>
  );
}

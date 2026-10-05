import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, PackageSearch } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getMyOrdersRequest } from "../../services/orders.service";
import { AccountShell } from "../../components/account/AccountShell";
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
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Price } from "../../components/ui/Price";
import { Skeleton } from "../../components/ui/skeleton";
import { displayOrderNumber } from "../../utils/orderNumber";

function OrdersSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando pedidos" className="space-y-3">
      {[0, 1, 2].map((item) => (
        <Card key={item} className="p-4 shadow-none">
          <div className="flex items-center justify-between gap-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-5 w-24" /></div>
          <div className="mt-3 flex gap-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-24" /></div>
        </Card>
      ))}
      <span className="sr-only">Cargando pedidos…</span>
    </div>
  );
}

export function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMyOrdersRequest();
      if (!data.ok) throw new Error(data.message || "No se pudieron cargar los pedidos.");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadError.message || "No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true, state: { from: "/mis-pedidos" } });
      return;
    }
    loadOrders();
  }, [user, navigate, loadOrders]);

  if (!user) return null;

  return (
    <AccountShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Mis pedidos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Consulta estados, importes y detalles de tus compras.</p>
        </div>
        {!loading && !error && orders.length > 0 && <span className="text-sm text-muted-foreground">{orders.length} {orders.length === 1 ? "pedido" : "pedidos"}</span>}
      </div>

      {loading && <OrdersSkeleton />}
      {!loading && error && <ErrorState description={error} onRetry={loadOrders} />}
      {!loading && !error && orders.length === 0 && (
        <EmptyState title="Todavía no tienes pedidos" description="Cuando hagas una compra, podrás consultar aquí su estado y detalle." action={<Button as={Link} to="/productos">Ver productos <ArrowRight aria-hidden="true" /></Button>} />
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => {
            const itemCount = order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0;
            const paymentStatus = getPaymentStatus(order);
            const method = getPaymentMethod(order);
            return (
              <Card key={order._id} className="p-4 shadow-none">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Pedido</p>
                    <h3 className="break-all text-sm font-semibold">{displayOrderNumber(order)}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{formatOrderDate(order.createdAt)}</p>
                  </div>
                  <Price value={Number(order.total ?? order.totalAmount ?? 0)} className="text-xl sm:text-right" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={paymentStatus} /></div>
                <div className="mt-3 flex flex-col gap-3 border-t pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><PackageSearch className="size-4" aria-hidden="true" /> {itemCount} {itemCount === 1 ? "artículo" : "artículos"}</span>
                    <span>{paymentMethodLabel(method)}</span>
                  </div>
                  <Button as={Link} to={`/mis-pedidos/${order._id}`} variant="outline" size="sm" className="w-full sm:w-auto">Ver pedido <ArrowRight aria-hidden="true" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}

import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, CheckCircle2, ClipboardCheck, Download, Edit3, Eye, Package, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { http } from "../../services/http";
import { adminConfirmDeliveryDate, adminGetOrders, adminUpdateOrderStatus, confirmOrderPayment } from "../../services/orders.service";
import { getOrderItemVariant } from "../../utils/orderVariantAdapter";
import { formatOrderDate, getPaymentMethod, getPaymentStatus, OrderStatusBadge, paymentMethodLabel, PaymentStatusBadge } from "../../components/orders/orderPresentation";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/input";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { Price } from "../../components/ui/Price";
import { ProductImage } from "../../components/ui/ProductImage";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { getAdminCustomizationPresentation, getProductionStatusTargets } from "./customizationPresentation.js";

const SECTIONS = [
  { id: "summary", label: "Resumen", icon: Boxes },
  { id: "orders", label: "Pedidos", icon: ClipboardCheck },
  { id: "products", label: "Productos", icon: Package },
  { id: "customizations", label: "Personalizaciones", icon: Edit3 },
];

const ORDER_STATUS_OPTIONS = [
  { value: "processing", label: "En preparación" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
];

function getOrderUserLabel(order) {
  if (order.userEmail) return order.userEmail;
  if (order.user) return order.user.name || order.user.email;
  if (order.userId && typeof order.userId !== "string") return order.userId.name || order.userId.email;
  if (order.guestEmail) return order.guestEmail;
  return typeof order.userId === "string" ? order.userId : "Invitado";
}

function getOrderEmail(order) {
  return order.userEmail || order.user?.email || order.userId?.email || order.guestEmail || "—";
}

function getNumericPrice(price) {
  if (typeof price === "number") return price;
  if (typeof price?.value === "number") return price.value;
  if (typeof price?.final === "number") return price.final;
  return 0;
}

function getOrderTotal(order) { return Number(order.total ?? order.totalAmount ?? 0); }
function getOrderItemCount(order) { return order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0; }
function shortId(value) { const id = String(value || ""); return id ? `#${id.slice(-8)}` : "—"; }

function Field({ label, children }) {
  return <label className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span>{children}</label>;
}

function Metric({ label, value, hint, icon }) {
  return <Card className="p-4 shadow-none"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p>{createElement(icon, { className: "size-4 text-primary", "aria-hidden": true })}</div><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></Card>;
}

export function Admin() {
  const [section, setSection] = useState("orders");
  const [notice, setNotice] = useState(null);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [form, setForm] = useState({ name: "", price: "", category: "", stock: "", description: "", image: "", images: "", active: true, sizes: "", colors: "", customizable: false, customizationType: "tshirt", customizationConfig: "" });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [savingOrderId, setSavingOrderId] = useState("");
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryDateInput, setDeliveryDateInput] = useState("");
  const [savingDeliveryDate, setSavingDeliveryDate] = useState(false);

  const [customizations, setCustomizations] = useState([]);
  const [loadingCustomizations, setLoadingCustomizations] = useState(true);
  const [errorCustomizations, setErrorCustomizations] = useState("");
  const [customizationQuery, setCustomizationQuery] = useState("");
  const [selectedCustomization, setSelectedCustomization] = useState(null);

  const showNotice = useCallback((type, title, message = "") => setNotice({ type, title, message }), []);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true); setErrorProducts("");
      const { data } = await http.get("/api/products/admin");
      if (!data?.ok) throw new Error(data?.message || "No se pudieron cargar los productos.");
      setProducts(data.products || []);
    } catch (error) {
      setErrorProducts(error.response?.data?.message || error.message || "Error al cargar productos.");
    } finally { setLoadingProducts(false); }
  }, []);

  const loadOrders = useCallback(async (status = "") => {
    try {
      setLoadingOrders(true); setErrorOrders("");
      const data = await adminGetOrders({ status: status || undefined });
      if (!data?.ok) throw new Error(data?.message || "No se pudieron cargar los pedidos.");
      setOrders(data.orders || []);
    } catch (error) {
      setErrorOrders(error.response?.data?.message || error.message || "Error al cargar pedidos.");
    } finally { setLoadingOrders(false); }
  }, []);

  const loadCustomizations = useCallback(async () => {
    try {
      setLoadingCustomizations(true); setErrorCustomizations("");
      const { data } = await http.get("/api/customizations");
      if (!data?.ok) throw new Error(data?.message || "No se pudieron cargar las personalizaciones.");
      setCustomizations(data.customizations || []);
    } catch (error) {
      setErrorCustomizations(error.response?.data?.message || error.message || "Error al cargar personalizaciones.");
    } finally { setLoadingCustomizations(false); }
  }, []);

  useEffect(() => { loadProducts(); loadOrders(); loadCustomizations(); }, [loadProducts, loadOrders, loadCustomizations]);

  const summary = useMemo(() => ({
    orders: orders.length,
    pendingPayments: orders.filter((order) => getPaymentStatus(order) === "pending").length,
    activeProducts: products.filter((product) => product.active).length,
    outOfStock: products.filter((product) => Number(product.stock || 0) <= 0).length,
  }), [orders, products]);

  const filteredOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesQuery = !query || [order._id, getOrderUserLabel(order), getOrderEmail(order)].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesQuery && (!paymentFilter || getPaymentStatus(order) === paymentFilter) && (!methodFilter || getPaymentMethod(order) === methodFilter);
    });
  }, [orders, orderQuery, paymentFilter, methodFilter]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products.filter((product) => !query || [product.name, product.category, product._id].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [products, productQuery]);

  const filteredCustomizations = useMemo(() => {
    const query = customizationQuery.trim().toLowerCase();
    return customizations.filter((customization) => !query || [customization._id, customization.productName, customization.productId?.name, customization.userEmail, customization.userId?.email].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [customizations, customizationQuery]);

  const resetProductForm = useCallback(() => {
    setEditingProduct(null);
    setForm({ name: "", price: "", category: "", stock: "", description: "", image: "", images: "", active: true, sizes: "", colors: "", customizable: false, customizationType: "tshirt", customizationConfig: "" });
  }, []);

  const openNewProduct = () => { resetProductForm(); setProductFormOpen(true); };
  const openEditProduct = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || "", price: String(getNumericPrice(product.price)), category: product.category || "", stock: String(product.stock ?? ""), description: product.description || "", image: product.image || "", images: Array.isArray(product.images) ? product.images.join("\n") : "", active: product.active !== false, sizes: Array.isArray(product.variants?.sizes) ? product.variants.sizes.join(", ") : "", colors: Array.isArray(product.variants?.colors) ? product.variants.colors.join(", ") : "", customizable: Boolean(product.customizable), customizationType: product.customizationType || "tshirt", customizationConfig: product.customizationConfig ? JSON.stringify(product.customizationConfig, null, 2) : "",
    });
    setProductFormOpen(true);
  };
  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmitProduct = async (event) => {
    event.preventDefault();
    if (savingProduct) return;
    let customizationConfig = null;
    if (form.customizable && form.customizationConfig.trim()) {
      try { customizationConfig = JSON.parse(form.customizationConfig); }
      catch { showNotice("error", "Configuración inválida", "El JSON de personalización no es válido."); return; }
    }
    const splitValues = (value, separator) => value.split(separator).map((item) => item.trim()).filter(Boolean);
    const images = splitValues(form.images, "\n");
    const payload = { name: form.name.trim(), price: Number(form.price), category: form.category.trim(), stock: Number(form.stock), description: form.description.trim(), image: form.image.trim() || images[0] || "", images, variants: { sizes: splitValues(form.sizes, ","), colors: splitValues(form.colors, ",") }, active: form.active, customizable: form.customizable, customizationType: form.customizationType, customizationConfig };
    const wasEditing = Boolean(editingProduct);
    try {
      setSavingProduct(true);
      if (editingProduct) await http.put(`/api/products/${editingProduct._id}`, payload); else await http.post("/api/products", payload);
      setProductFormOpen(false); resetProductForm(); await loadProducts();
      showNotice("success", wasEditing ? "Producto actualizado" : "Producto creado");
    } catch (error) { showNotice("error", "No se pudo guardar el producto", error.response?.data?.message || "Revisa los datos e inténtalo de nuevo."); }
    finally { setSavingProduct(false); }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductTarget || deletingProduct) return;
    try { setDeletingProduct(true); await http.delete(`/api/products/${deleteProductTarget._id}`); setDeleteProductTarget(null); await loadProducts(); showNotice("success", "Producto eliminado"); }
    catch (error) { showNotice("error", "No se pudo eliminar el producto", error.response?.data?.message || "Inténtalo de nuevo."); }
    finally { setDeletingProduct(false); }
  };

  const handleChangeOrderStatus = async (orderId, status) => {
    if (!status || savingOrderId) return;
    try {
      setSavingOrderId(orderId);
      const data = await adminUpdateOrderStatus(orderId, status);
      if (!data?.ok) throw new Error(data?.message || "No se pudo actualizar el estado.");
      setOrders((current) => current.map((order) => order._id === orderId ? { ...order, status } : order));
      setSelectedOrder((current) => current?._id === orderId ? { ...current, status } : current);
      showNotice("success", "Estado del pedido actualizado");
    } catch (error) { showNotice("error", "No se pudo actualizar el pedido", error.response?.data?.message || error.message); }
    finally { setSavingOrderId(""); }
  };

  const handleConfirmPayment = async () => {
    if (!paymentTarget || confirmingPayment || getPaymentStatus(paymentTarget) !== "pending") return;
    try {
      setConfirmingPayment(true);
      const data = await confirmOrderPayment(paymentTarget._id);
      if (!data?.ok) throw new Error(data?.message || "No se pudo confirmar el pago.");
      const markPaid = (order) => order._id === paymentTarget._id ? { ...order, payment: { ...order.payment, status: "paid" }, paymentStatus: "paid" } : order;
      setOrders((current) => current.map(markPaid)); setSelectedOrder((current) => current ? markPaid(current) : current); setPaymentTarget(null);
      showNotice("success", "Pago confirmado", "El pedido figura ahora como pagado.");
    } catch (error) { showNotice("error", "No se pudo confirmar el pago", error.response?.data?.message || error.message); }
    finally { setConfirmingPayment(false); }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder || !deliveryDateInput || savingDeliveryDate) return;
    try {
      setSavingDeliveryDate(true);
      const data = await adminConfirmDeliveryDate(selectedOrder._id, deliveryDateInput);
      if (!data?.ok) throw new Error(data?.message || "No se pudo confirmar la entrega.");
      setOrders((current) => current.map((order) => order._id === selectedOrder._id ? data.order : order)); setSelectedOrder(data.order); setDeliveryDateInput(""); showNotice("success", "Fecha de entrega confirmada");
    } catch (error) { showNotice("error", "No se pudo confirmar la entrega", error.response?.data?.message || error.message); }
    finally { setSavingDeliveryDate(false); }
  };

  const handleDownloadZip = async (customization) => {
    if (!customization.zipUrl && !customization.productionBundle?.available) return;
    try {
      const response = await http.get(`/api/customizations/${customization._id}/zip`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `custom_${customization._id}.zip`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch { showNotice("error", "No se pudo descargar el ZIP"); }
  };

  const handleDownloadArtwork = async (surface) => {
    try {
      const response = await http.get(surface.artwork.downloadUrl, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = surface.artwork.filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch { showNotice("error", "No se pudo descargar el artwork"); }
  };

  const handleProductionStatus = async (customization, status) => {
    try {
      const { data } = await http.patch(`/api/customizations/${customization._id}/status`, { status });
      if (!data?.customization) throw new Error("Respuesta inválida");
      setCustomizations((current) => current.map((item) => item._id === customization._id ? data.customization : item));
      setSelectedCustomization(data.customization);
    } catch (error) { showNotice("error", "No se pudo cambiar el estado", error.response?.data?.message || error.message); }
  };

  return (
    <PageContainer size="wide" className="py-5 sm:py-6">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><ShieldCheck className="size-4" aria-hidden="true" /> Administración</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Operaciones de la tienda</h1><p className="mt-1 text-sm text-muted-foreground">Pedidos, pagos manuales, productos y diseños.</p></div></header>
      <nav aria-label="Navegación de administración" className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"><div className="flex min-w-max gap-1 py-2">{SECTIONS.map(({ id, label, icon }) => <Button key={id} type="button" variant={section === id ? "secondary" : "ghost"} size="sm" aria-current={section === id ? "page" : undefined} onClick={() => setSection(id)}>{createElement(icon, { "aria-hidden": true })} {label}</Button>)}</div></nav>
      {notice && <Alert variant={notice.type === "error" ? "destructive" : "default"} className="mt-4 flex items-start justify-between gap-3" role="status"><div><p className="font-semibold">{notice.title}</p>{notice.message && <p className="mt-0.5 text-muted-foreground">{notice.message}</p>}</div><Button type="button" variant="ghost" size="sm" onClick={() => setNotice(null)}>Cerrar</Button></Alert>}

      {section === "summary" && <section aria-labelledby="admin-summary-title" className="mt-5"><h2 id="admin-summary-title" className="text-lg font-semibold">Resumen operativo</h2><p className="mt-1 text-sm text-muted-foreground">Datos reales derivados de los listados actuales.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Pedidos cargados" value={summary.orders} hint="Según el filtro operativo actual" icon={ClipboardCheck} /><Metric label="Pagos pendientes" value={summary.pendingPayments} hint="Requieren revisión manual" icon={CheckCircle2} /><Metric label="Productos activos" value={summary.activeProducts} hint="Visibles en catálogo" icon={Package} /><Metric label="Sin stock" value={summary.outOfStock} hint="Stock global igual o inferior a cero" icon={Boxes} /></div></section>}

      {section === "orders" && <section aria-labelledby="admin-orders-title" className="mt-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="admin-orders-title" className="text-lg font-semibold">Pedidos</h2><p className="mt-1 text-sm text-muted-foreground">Revisa cobros manuales y estado operativo.</p></div><Button type="button" variant="outline" size="sm" onClick={() => loadOrders(statusFilter)} disabled={loadingOrders}><RefreshCw aria-hidden="true" /> Recargar</Button></div><div className="mt-4 grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1fr)_repeat(3,minmax(10rem,auto))_auto]"><Field label="Buscar"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Referencia, cliente o email" className="pl-9" /></div></Field><Field label="Estado del pedido"><Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option><option value="created">Pedido recibido</option>{ORDER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></Field><Field label="Estado del pago"><Select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="">Todos</option><option value="pending">Pendiente</option><option value="paid">Pagado</option><option value="failed">Fallido</option><option value="refunded">Reembolsado</option></Select></Field><Field label="Método"><Select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}><option value="">Todos</option><option value="bizum">Bizum</option><option value="bank_transfer">Transferencia</option><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="paypal">PayPal</option></Select></Field><Button type="button" size="sm" className="self-end" onClick={() => loadOrders(statusFilter)} disabled={loadingOrders}>Aplicar estado</Button></div>{loadingOrders && <LoadingState message="Cargando pedidos…" />}{!loadingOrders && errorOrders && <ErrorState title="No se pudieron cargar los pedidos" description={errorOrders} onRetry={() => loadOrders(statusFilter)} />}{!loadingOrders && !errorOrders && filteredOrders.length === 0 && <EmptyState title="No hay pedidos" description="No existen pedidos que coincidan con los filtros actuales." />}{!loadingOrders && !errorOrders && filteredOrders.length > 0 && <OrdersList orders={filteredOrders} savingOrderId={savingOrderId} onStatusChange={handleChangeOrderStatus} onView={setSelectedOrder} onConfirmPayment={setPaymentTarget} />}</section>}

      {section === "products" && <section aria-labelledby="admin-products-title" className="mt-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="admin-products-title" className="text-lg font-semibold">Productos locales</h2><p className="mt-1 text-sm text-muted-foreground">Precio, stock y visibilidad según el modelo actual.</p></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={loadProducts} disabled={loadingProducts}><RefreshCw aria-hidden="true" /> Recargar</Button><Button type="button" size="sm" onClick={openNewProduct}><Plus aria-hidden="true" /> Nuevo producto</Button></div></div><div className="relative mt-4 max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar por nombre, categoría o ID" className="pl-9" aria-label="Buscar productos" /></div>{loadingProducts && <LoadingState message="Cargando productos…" />}{!loadingProducts && errorProducts && <ErrorState title="No se pudieron cargar los productos" description={errorProducts} onRetry={loadProducts} />}{!loadingProducts && !errorProducts && filteredProducts.length === 0 && <EmptyState title="No hay productos" description="No existen productos locales que coincidan con la búsqueda." />}{!loadingProducts && !errorProducts && filteredProducts.length > 0 && <ProductsList products={filteredProducts} onEdit={openEditProduct} onDelete={setDeleteProductTarget} />}</section>}

      {section === "customizations" && <section aria-labelledby="admin-customizations-title" className="mt-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="admin-customizations-title" className="text-lg font-semibold">Personalizaciones</h2><p className="mt-1 text-sm text-muted-foreground">Previews y archivos ya generados.</p></div><Button type="button" variant="outline" size="sm" onClick={loadCustomizations} disabled={loadingCustomizations}><RefreshCw aria-hidden="true" /> Recargar</Button></div><div className="relative mt-4 max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={customizationQuery} onChange={(event) => setCustomizationQuery(event.target.value)} placeholder="Buscar producto, usuario o ID" className="pl-9" aria-label="Buscar personalizaciones" /></div>{loadingCustomizations && <LoadingState message="Cargando personalizaciones…" />}{!loadingCustomizations && errorCustomizations && <ErrorState title="No se pudieron cargar las personalizaciones" description={errorCustomizations} onRetry={loadCustomizations} />}{!loadingCustomizations && !errorCustomizations && filteredCustomizations.length === 0 && <EmptyState title="No hay personalizaciones" description="No existen diseños que coincidan con la búsqueda." />}{!loadingCustomizations && !errorCustomizations && filteredCustomizations.length > 0 && <CustomizationsList customizations={filteredCustomizations} onView={setSelectedCustomization} onDownload={handleDownloadZip} />}</section>}

      <PaymentDialog target={paymentTarget} busy={confirmingPayment} onClose={() => !confirmingPayment && setPaymentTarget(null)} onConfirm={handleConfirmPayment} />
      <DeleteProductDialog target={deleteProductTarget} busy={deletingProduct} onClose={() => !deletingProduct && setDeleteProductTarget(null)} onConfirm={handleDeleteProduct} />
      <ProductFormDialog open={productFormOpen} editing={editingProduct} form={form} busy={savingProduct} onOpenChange={setProductFormOpen} onChange={updateForm} onSubmit={handleSubmitProduct} />
      <OrderDetailDialog order={selectedOrder} busyOrderId={savingOrderId} deliveryDate={deliveryDateInput} savingDelivery={savingDeliveryDate} onClose={() => setSelectedOrder(null)} onStatusChange={handleChangeOrderStatus} onDeliveryDateChange={setDeliveryDateInput} onConfirmDelivery={handleConfirmDelivery} onConfirmPayment={setPaymentTarget} />
      <CustomizationDetailDialog customization={selectedCustomization} onClose={() => setSelectedCustomization(null)} onDownload={handleDownloadZip} onDownloadArtwork={handleDownloadArtwork} onStatusChange={handleProductionStatus} />
    </PageContainer>
  );
}

function OrdersList({ orders, savingOrderId, onStatusChange, onView, onConfirmPayment }) {
  return <div className="mt-4"><div className="hidden overflow-x-auto rounded-xl border md:block"><table className="w-full min-w-[980px] border-collapse text-sm"><caption className="sr-only">Listado administrativo de pedidos</caption><thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="p-3">Pedido / fecha</th><th className="p-3">Cliente</th><th className="p-3">Artículos</th><th className="p-3">Total</th><th className="p-3">Método</th><th className="p-3">Estado</th><th className="p-3">Pago</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody className="divide-y bg-card">{orders.map((order) => <OrderTableRow key={order._id} order={order} busy={savingOrderId === order._id} onStatusChange={onStatusChange} onView={onView} onConfirmPayment={onConfirmPayment} />)}</tbody></table></div><div className="space-y-3 md:hidden">{orders.map((order) => <OrderCard key={order._id} order={order} busy={savingOrderId === order._id} onStatusChange={onStatusChange} onView={onView} onConfirmPayment={onConfirmPayment} />)}</div></div>;
}

function OrderStatusControl({ order, busy, onChange }) {
  return <Select aria-label={`Cambiar estado de ${shortId(order._id)}`} value={order.status} disabled={busy} onChange={(event) => onChange(order._id, event.target.value)} className="h-9 min-w-36">{order.status === "created" && <option value="created" disabled>Pedido recibido</option>}{ORDER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>;
}

function OrderActions({ order, onView, onConfirmPayment }) {
  const canConfirm = getPaymentStatus(order) === "pending" && order.status !== "cancelled";
  return <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => onView(order)}><Eye aria-hidden="true" /> Detalle</Button>{canConfirm && <Button type="button" size="sm" onClick={() => onConfirmPayment(order)}>Confirmar pago</Button>}</div>;
}

function OrderTableRow({ order, busy, onStatusChange, onView, onConfirmPayment }) {
  return <tr><td className="p-3"><p className="font-mono text-xs font-semibold">{shortId(order._id)}</p><p className="mt-1 text-xs text-muted-foreground">{formatOrderDate(order.createdAt)}</p></td><td className="max-w-52 p-3"><p className="truncate font-medium" title={getOrderUserLabel(order)}>{getOrderUserLabel(order)}</p><p className="truncate text-xs text-muted-foreground" title={getOrderEmail(order)}>{getOrderEmail(order)}</p></td><td className="p-3 tabular-nums">{getOrderItemCount(order)}</td><td className="p-3"><Price value={getOrderTotal(order)} className="text-sm" /></td><td className="p-3">{paymentMethodLabel(getPaymentMethod(order))}</td><td className="p-3"><OrderStatusControl order={order} busy={busy} onChange={onStatusChange} /></td><td className="p-3"><PaymentStatusBadge status={getPaymentStatus(order)} /></td><td className="p-3"><OrderActions order={order} onView={onView} onConfirmPayment={onConfirmPayment} /></td></tr>;
}

function OrderCard({ order, busy, onStatusChange, onView, onConfirmPayment }) {
  return <Card className="p-4 shadow-none"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs font-semibold">{shortId(order._id)}</p><p className="mt-1 truncate text-sm font-medium">{getOrderUserLabel(order)}</p><p className="text-xs text-muted-foreground">{formatOrderDate(order.createdAt)} · {getOrderItemCount(order)} artículos</p></div><Price value={getOrderTotal(order)} className="text-base" /></div><div className="mt-3 flex flex-wrap gap-2"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={getPaymentStatus(order)} /><Badge variant="outline">{paymentMethodLabel(getPaymentMethod(order))}</Badge></div><div className="mt-3"><OrderStatusControl order={order} busy={busy} onChange={onStatusChange} /></div><div className="mt-3 border-t pt-3"><OrderActions order={order} onView={onView} onConfirmPayment={onConfirmPayment} /></div></Card>;
}

function ProductsList({ products, onEdit, onDelete }) {
  return <div className="mt-4"><div className="hidden overflow-x-auto rounded-xl border md:block"><table className="w-full min-w-[820px] text-sm"><caption className="sr-only">Productos locales</caption><thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="p-3">Producto</th><th className="p-3">Categoría</th><th className="p-3">Precio</th><th className="p-3">Stock</th><th className="p-3">Estado</th><th className="p-3">Personalización</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody className="divide-y bg-card">{products.map((product) => <tr key={product._id}><td className="p-3"><div className="flex min-w-0 items-center gap-3"><ProductImage src={product.image || product.images?.[0]} alt="" className="size-11 shrink-0 rounded-md border" /><div className="min-w-0"><p className="truncate font-medium" title={product.name}>{product.name}</p><p className="truncate font-mono text-[11px] text-muted-foreground">{product._id}</p></div></div></td><td className="p-3">{product.category || "—"}</td><td className="p-3"><Price value={getNumericPrice(product.price)} className="text-sm" /></td><td className="p-3 tabular-nums">{product.stock ?? 0}</td><td className="p-3"><Badge variant={product.active ? "success" : "secondary"}>{product.active ? "Activo" : "Oculto"}</Badge></td><td className="p-3">{product.customizable ? "Sí" : "No"}</td><td className="p-3"><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="icon" aria-label={`Editar ${product.name}`} onClick={() => onEdit(product)}><Edit3 aria-hidden="true" /></Button><Button type="button" variant="outline" size="icon" className="text-destructive" aria-label={`Eliminar ${product.name}`} onClick={() => onDelete(product)}><Trash2 aria-hidden="true" /></Button></div></td></tr>)}</tbody></table></div><div className="space-y-3 md:hidden">{products.map((product) => <Card key={product._id} className="p-4 shadow-none"><div className="flex gap-3"><ProductImage src={product.image || product.images?.[0]} alt="" className="size-16 shrink-0 rounded-lg border" /><div className="min-w-0 flex-1"><p className="break-words font-semibold">{product.name}</p><p className="text-xs text-muted-foreground">{product.category || "Sin categoría"}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant={product.active ? "success" : "secondary"}>{product.active ? "Activo" : "Oculto"}</Badge>{product.customizable && <Badge variant="outline">Personalizable</Badge>}</div></div><Price value={getNumericPrice(product.price)} className="text-sm" /></div><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-sm">Stock: <strong>{product.stock ?? 0}</strong></span><div className="flex gap-2"><Button type="button" variant="outline" size="icon" aria-label={`Editar ${product.name}`} onClick={() => onEdit(product)}><Edit3 aria-hidden="true" /></Button><Button type="button" variant="outline" size="icon" className="text-destructive" aria-label={`Eliminar ${product.name}`} onClick={() => onDelete(product)}><Trash2 aria-hidden="true" /></Button></div></div></Card>)}</div></div>;
}

function CustomizationsList({ customizations, onView, onDownload }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{customizations.map((customization) => { const { isV2, preview, product, status, bundleReady, surfaces } = getAdminCustomizationPresentation(customization); const user = customization.userEmail || customization.userId?.email || "Invitado"; return <Card key={customization._id} className="flex min-w-0 gap-3 p-3 shadow-none">{isV2 ? <ProtectedProductImage src={preview} alt={`Vista previa de ${product}`} className="size-20 shrink-0 rounded-lg border" /> : <ProductImage src={preview} alt={preview ? `Vista previa de ${product}` : ""} className="size-20 shrink-0 rounded-lg border" />}<div className="min-w-0 flex-1"><p className="truncate font-medium" title={product}>{product}</p><p className="truncate text-xs text-muted-foreground" title={user}>{user}</p><p className="mt-1 text-xs text-muted-foreground">{isV2 ? `${customization.productSnapshot?.productTemplateId || "V2"} · ${surfaces.length} superficies · ${customization.quantity || 1} ud.` : "Personalización legacy"}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{status}</Badge>{bundleReady ? <Badge variant="success">ZIP listo</Badge> : <Badge variant="secondary">ZIP pendiente</Badge>}</div><div className="mt-3 flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => onView(customization)}><Eye aria-hidden="true" /> Ver</Button>{bundleReady && <Button type="button" variant="outline" size="icon" aria-label={`Descargar ZIP de ${product}`} onClick={() => onDownload(customization)}><Download aria-hidden="true" /></Button>}</div></div></Card>; })}</div>;
}

function PaymentDialog({ target, busy, onClose, onConfirm }) {
  return <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Confirmar pago recibido</DialogTitle><DialogDescription>Esta acción cambia el pago de pendiente a pagado. No ejecuta ningún cobro online.</DialogDescription></DialogHeader>{target && <dl className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Pedido</dt><dd className="break-all font-mono font-semibold">{shortId(target._id)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Importe</dt><dd><Price value={getOrderTotal(target)} className="text-sm" /></dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Método</dt><dd className="text-right font-medium">{paymentMethodLabel(getPaymentMethod(target))}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Estado</dt><dd><PaymentStatusBadge status={getPaymentStatus(target)} /></dd></div></dl>}<DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={busy} />}>Cancelar</DialogClose><Button type="button" onClick={onConfirm} disabled={busy}>{busy ? "Confirmando…" : "Confirmar pago recibido"}</Button></DialogFooter></DialogContent></Dialog>;
}

function DeleteProductDialog({ target, busy, onClose, onConfirm }) {
  return <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Eliminar producto</DialogTitle><DialogDescription>Se conservará el comportamiento actual de eliminación física. Esta acción no se puede deshacer.</DialogDescription></DialogHeader>{target && <p className="break-words rounded-lg border bg-muted/30 p-3 text-sm font-semibold">{target.name}</p>}<DialogFooter><DialogClose render={<Button type="button" variant="outline" disabled={busy} />}>Cancelar</DialogClose><Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>{busy ? "Eliminando…" : "Eliminar producto"}</Button></DialogFooter></DialogContent></Dialog>;
}

function ProductFormDialog({ open, editing, form, busy, onOpenChange, onChange, onSubmit }) {
  return <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle><DialogDescription>Se conserva el modelo actual de producto, precio, stock, variantes y personalización.</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><Input required value={form.name} onChange={(event) => onChange("name", event.target.value)} /></Field><Field label="Categoría"><Input value={form.category} onChange={(event) => onChange("category", event.target.value)} /></Field><Field label="Precio (€)"><Input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => onChange("price", event.target.value)} /></Field><Field label="Stock"><Input type="number" min="0" step="1" value={form.stock} onChange={(event) => onChange("stock", event.target.value)} /></Field><Field label="Tallas separadas por coma"><Input value={form.sizes} onChange={(event) => onChange("sizes", event.target.value)} /></Field><Field label="Colores separados por coma"><Input value={form.colors} onChange={(event) => onChange("colors", event.target.value)} /></Field><Field label="Imagen principal"><Input type="url" value={form.image} onChange={(event) => onChange("image", event.target.value)} /></Field><Field label="Imágenes adicionales, una por línea"><Textarea className="min-h-20" value={form.images} onChange={(event) => onChange("images", event.target.value)} /></Field><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.active} onChange={(event) => onChange("active", event.target.checked)} className="size-4 accent-primary" /> Visible en catálogo</label><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.customizable} onChange={(event) => onChange("customizable", event.target.checked)} className="size-4 accent-primary" /> Producto personalizable</label><div className="sm:col-span-2"><Field label="Descripción"><Textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} /></Field></div>{form.customizable && <><Field label="Tipo de diseño"><Select value={form.customizationType} onChange={(event) => onChange("customizationType", event.target.value)}><option value="tshirt">Camiseta</option><option value="hoodie">Sudadera</option><option value="mug">Taza</option></Select></Field><div className="sm:col-span-2"><Field label="Configuración JSON"><Textarea className="min-h-36 font-mono text-xs" value={form.customizationConfig} onChange={(event) => onChange("customizationConfig", event.target.value)} /></Field></div></>}<DialogFooter className="sm:col-span-2"><DialogClose render={<Button type="button" variant="outline" disabled={busy} />}>Cancelar</DialogClose><Button type="submit" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear producto"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function OrderDetailDialog({ order, busyOrderId, deliveryDate, savingDelivery, onClose, onStatusChange, onDeliveryDateChange, onConfirmDelivery, onConfirmPayment }) {
  if (!order) return null;
  const shipping = Number(order.shipping?.price || 0); const total = getOrderTotal(order); const subtotal = Math.max(0, total - shipping); const address = order.shippingAddress; const canConfirmPayment = getPaymentStatus(order) === "pending" && order.status !== "cancelled";
  return <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Pedido {shortId(order._id)}</DialogTitle><DialogDescription>{formatOrderDate(order.createdAt)} · Snapshot histórico almacenado</DialogDescription></DialogHeader><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="min-w-0 space-y-4"><div className="flex flex-wrap gap-2"><OrderStatusBadge status={order.status} /><PaymentStatusBadge status={getPaymentStatus(order)} /><Badge variant="outline">{paymentMethodLabel(getPaymentMethod(order))}</Badge></div><Card className="p-4 shadow-none"><h3 className="font-semibold">Cliente y entrega</h3><p className="mt-2 break-words text-sm font-medium">{getOrderUserLabel(order)}</p><p className="break-all text-sm text-muted-foreground">{getOrderEmail(order)}</p>{address && <address className="mt-3 break-words text-sm not-italic text-muted-foreground">{address.fullName}<br />{address.street}<br />{address.postalCode} {address.city}<br />{address.state}{address.country ? ` · ${address.country}` : ""}</address>}</Card><div><h3 className="mb-2 font-semibold">Artículos</h3><div className="divide-y rounded-xl border bg-card">{order.items?.map((item, index) => { const variant = getOrderItemVariant(item); return <article key={item._id || `${item.productId}-${index}`} className="p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium">{item.name || "Producto"}</p>{variant && <p className="mt-1 text-xs text-muted-foreground">{variant.size && `Talla: ${variant.size}`}{variant.size && variant.color && " · "}{variant.color && `Color: ${variant.color}`}</p>}{item.customizationId && <Badge variant="outline" className="mt-2">Personalizado</Badge>}<p className="mt-2 text-xs text-muted-foreground">Cantidad: {item.quantity}</p></div><Price value={Number(item.price || 0) * Number(item.quantity || 0)} className="text-sm" /></div></article>; })}</div></div>{order.notes && <Card className="p-4 shadow-none"><h3 className="font-semibold">Notas</h3><p className="mt-2 break-words text-sm text-muted-foreground">{order.notes}</p></Card>}</div><aside className="space-y-4"><Card className="p-4 shadow-none"><h3 className="font-semibold">Resumen histórico</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Subtotal</dt><dd><Price value={subtotal} className="text-sm" /></dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Envío</dt><dd><Price value={shipping} className="text-sm" /></dd></div><div className="flex justify-between gap-3 border-t pt-2 font-semibold"><dt>Total</dt><dd><Price value={total} className="text-base" /></dd></div></dl></Card><Card className="p-4 shadow-none"><h3 className="font-semibold">Estado operativo</h3><div className="mt-3"><OrderStatusControl order={order} busy={busyOrderId === order._id} onChange={onStatusChange} /></div>{canConfirmPayment && <Button type="button" size="sm" className="mt-3 w-full" onClick={() => onConfirmPayment(order)}>Confirmar pago recibido</Button>}</Card><Card className="p-4 shadow-none"><h3 className="font-semibold">Entrega</h3>{order.shipping?.estimatedDeliveryDate && <p className="mt-2 text-xs text-muted-foreground">Estimada: {new Date(order.shipping.estimatedDeliveryDate).toLocaleDateString("es-ES")}</p>}{order.shipping?.confirmedDeliveryDate && <p className="mt-1 text-xs text-success">Confirmada: {new Date(order.shipping.confirmedDeliveryDate).toLocaleDateString("es-ES")}</p>}<Field label="Confirmar fecha"><Input type="date" value={deliveryDate} onChange={(event) => onDeliveryDateChange(event.target.value)} /></Field><Button type="button" variant="outline" size="sm" className="mt-2 w-full" disabled={!deliveryDate || savingDelivery} onClick={onConfirmDelivery}>{savingDelivery ? "Guardando…" : "Confirmar entrega"}</Button></Card></aside></div><DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cerrar</DialogClose></DialogFooter></DialogContent></Dialog>;
}

function CustomizationDetailDialog({ customization, onClose, onDownload, onDownloadArtwork, onStatusChange }) {
  if (!customization) return null;
  const { isV2, product, preview, bundleReady } = getAdminCustomizationPresentation(customization); const statusTargets = getProductionStatusTargets(customization.productionStatus || "pending");
  return <Dialog open={Boolean(customization)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{product}</DialogTitle><DialogDescription>Pedido {shortId(customization.orderId)} · {shortId(customization._id)}</DialogDescription></DialogHeader>{isV2 ? <><dl className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Template</dt><dd>{customization.productSnapshot?.productTemplateId} · rev. {customization.productSnapshot?.templateRevision}</dd></div><div><dt className="text-muted-foreground">Cantidad</dt><dd>{customization.quantity}</dd></div><div><dt className="text-muted-foreground">Talla</dt><dd>{customization.variant?.size || "—"}</dd></div><div><dt className="text-muted-foreground">Color</dt><dd>{customization.variant?.color || "—"}</dd></div></dl><div className="space-y-3"><h3 className="font-semibold">Superficies</h3>{customization.productionSurfaces?.map((surface) => <Card key={surface.surfaceId} className="grid gap-3 p-3 shadow-none sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center"><ProtectedProductImage src={surface.preview?.url} alt={`Preview ${surface.label}`} className="h-24 w-32 rounded-md border" /><div><p className="font-medium">{surface.label}</p><p className="text-xs text-muted-foreground">{surface.artwork.filename} · {surface.artwork.widthPx}×{surface.artwork.heightPx}px</p></div><Button type="button" variant="outline" size="sm" onClick={() => onDownloadArtwork(surface)}><Download aria-hidden="true" /> PNG</Button></Card>)}</div><Field label="Estado de producción"><Select value={customization.productionStatus || "pending"} disabled={statusTargets.length === 0} onChange={(event) => onStatusChange(customization, event.target.value)}><option value={customization.productionStatus || "pending"}>{customization.productionStatus || "pending"}</option>{statusTargets.map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field></> : <>{preview ? <ProductImage src={preview} alt={`Vista previa de ${product}`} ratio="16 / 9" className="rounded-lg border" /> : <div className="rounded-lg border bg-muted p-8 text-center text-sm text-muted-foreground">Sin vista previa generada</div>}<div><h3 className="mb-2 font-semibold">Diseño almacenado</h3><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs">{JSON.stringify(customization.design || {}, null, 2)}</pre></div></>}<DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cerrar</DialogClose>{bundleReady && <Button type="button" onClick={() => onDownload(customization)}><Download aria-hidden="true" /> Descargar ZIP</Button>}</DialogFooter></DialogContent></Dialog>;
}

function ProtectedProductImage({ src, ...props }) {
  const [objectUrl, setObjectUrl] = useState("");
  useEffect(() => {
    let active = true; let currentUrl = "";
    if (!src) return undefined;
    http.get(src, { responseType: "blob" }).then(({ data }) => { if (!active) return; currentUrl = URL.createObjectURL(data); setObjectUrl(currentUrl); }).catch(() => setObjectUrl(""));
    return () => { active = false; if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [src]);
  return <ProductImage src={objectUrl} {...props} />;
}

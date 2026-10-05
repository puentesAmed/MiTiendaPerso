import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CreditCard,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import {
  createOrderRequest,
  getManualPaymentMethodsRequest,
  getShippingQuoteRequest,
} from "../../services/orders.service";
import { getGuestId, loadGuestSession, saveGuestSession } from "../../services/guestSession.service";
import { checkEmailExists } from "../../services/auth.service";
import { buildSelectedShippingQuote, buildShippingQuoteRequestKey, isDeliveryAddressReady, isShippingMethodSelectable, normalizeDeliveryAddress, selectShippingMethodId, SHIPPING_REASON_LABELS } from "./shippingMethods";
import { canSubmitOrder, isCustomerDataValid, normalizeCouponCode, validateCustomerData } from "./checkoutState";
import { CustomizationInlineSummary } from "../../components/checkout/CustomizationInlineSummary";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { PageContainer } from "../../components/ui/PageContainer";
import { Price } from "../../components/ui/Price";
import { ProductImage } from "../../components/ui/ProductImage";
import { Textarea } from "../../components/ui/textarea";

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function Field({ id, label, error, required = false, className = "", ...props }) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}{required && <span className="text-destructive"> *</span>}
      </label>
      <Input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={error ? "border-destructive" : undefined}
        {...props}
      />
      {error && <p id={errorId} className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AddressFields({ prefix, value, onChange, showErrors = false, required = false, includeFullName = true }) {
  const update = (field) => (event) => onChange({ ...value, [field]: event.target.value });
  const fieldError = (field, label) => showErrors && required && !value[field]?.trim() ? `${label} es obligatorio.` : "";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {includeFullName && <Field
        id={`${prefix}-fullName`}
        label="Nombre completo"
        required={required}
        value={value.fullName}
        onChange={update("fullName")}
        error={fieldError("fullName", "El nombre")}
        autoComplete={prefix === "shipping" ? "shipping name" : "billing name"}
        className="sm:col-span-2"
      />}
      <Field
        id={`${prefix}-street`}
        label="Dirección"
        required={required}
        value={value.street}
        onChange={update("street")}
        error={fieldError("street", "La dirección")}
        autoComplete={prefix === "shipping" ? "shipping street-address" : "billing street-address"}
        className="sm:col-span-2"
      />
      <Field
        id={`${prefix}-postalCode`}
        label="Código postal"
        required={required}
        value={value.postalCode}
        onChange={update("postalCode")}
        error={fieldError("postalCode", "El código postal")}
        autoComplete={prefix === "shipping" ? "shipping postal-code" : "billing postal-code"}
        inputMode="numeric"
      />
      <Field
        id={`${prefix}-city`}
        label="Ciudad"
        required={required}
        value={value.city}
        onChange={update("city")}
        error={fieldError("city", "La ciudad")}
        autoComplete={prefix === "shipping" ? "shipping address-level2" : "billing address-level2"}
      />
      <Field
        id={`${prefix}-state`}
        label="Provincia"
        required={required}
        value={value.state}
        onChange={update("state")}
        error={fieldError("state", "La provincia")}
        autoComplete={prefix === "shipping" ? "shipping address-level1" : "billing address-level1"}
      />
      <Field
        id={`${prefix}-country`}
        label="País"
        value={value.country}
        onChange={update("country")}
        autoComplete={prefix === "shipping" ? "shipping country-name" : "billing country-name"}
      />
    </div>
  );
}

function PaymentMethods({ methods, value, onChange, loading, error }) {
  const description = (id) => id === "bank_transfer"
    ? "Recibirás los datos bancarios y el concepto al crear el pedido."
    : "Recibirás el destinatario y el concepto al crear el pedido.";

  return (
    <fieldset disabled={loading} aria-describedby="payment-help">
      <legend className="text-base font-semibold">Método de pago</legend>
      <p id="payment-help" className="mt-1 text-sm text-muted-foreground">
        El pedido quedará pendiente hasta que comprobemos el pago manual.
      </p>
      <div className="mt-3 space-y-2">
        {methods.map((method) => {
          const selected = value === method.id;
          return (
            <label
              key={method.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors motion-reduce:transition-none ${selected ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={selected}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1 size-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{method.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{description(method.id)}</span>
              </span>
            </label>
          );
        })}
      </div>
      {loading && <p className="mt-3 text-sm text-muted-foreground" role="status">Cargando métodos de pago…</p>}
      {!loading && methods.length === 0 && (
        <Alert variant="destructive" className="mt-3 flex items-start gap-2" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error || "No hay métodos de pago disponibles en este momento."}</span>
        </Alert>
      )}
    </fieldset>
  );
}

function shippingMethodDescription(method) {
  if (!method.available) return SHIPPING_REASON_LABELS[method.reason] || "No disponible";
  if (method.methodId === "pickup-free") return method.quote.availabilityText || "Disponible cuando tu pedido esté preparado.";
  if (method.quote.quoteSource === "zone_fallback") return "Tarifa zonal de respaldo; distancia no disponible";
  return method.serviceLevel === "urgent" ? "Entrega una vez preparado el pedido" : "Envío por paquetería una vez preparado";
}

function ShippingMethods({ methods, value, onChange, loading }) {
  if (loading) return <p className="text-sm text-muted-foreground">Calculando métodos disponibles…</p>;
  if (!methods.length) return <p className="text-sm text-muted-foreground">No hay métodos disponibles en este momento.</p>;
  return <fieldset className="space-y-2"><legend className="sr-only">Método de entrega</legend>{methods.map((method) => {
    const selectable = isShippingMethodSelectable(method);
    return <label key={method.methodId} className={`flex gap-3 rounded-lg border p-3 ${selectable ? "cursor-pointer" : "cursor-not-allowed opacity-65"}`}><input type="radio" name="shipping-method" value={method.methodId} checked={value === method.methodId} disabled={!selectable} onChange={() => onChange(method.methodId)} className="mt-1 size-4 accent-primary" /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><strong className="text-sm">{method.label}</strong>{method.available && <span className="text-sm font-semibold">{method.methodId === "pickup-free" ? formatMoney(method.quote.amount) : method.quote.isFree ? "Gratis" : formatMoney(method.quote.amount)}</span>}</span><span className="mt-0.5 block text-xs text-muted-foreground">{shippingMethodDescription(method)}</span>{method.available && method.methodId === "pickup-free" && method.quote.pickupAddress && <span className="mt-1 block text-xs"><strong>Punto de recogida:</strong> {method.quote.pickupAddress}</span>}{method.available && method.quote.quoteSource === "routing" && method.quote.distanceKm != null && <span className="mt-1 block text-xs">Distancia: {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(method.quote.distanceKm)} km{method.quote.band ? ` · Tarifa ${method.quote.band.minKm}–${method.quote.band.maxKm} km` : ""}</span>}</span></label>;
  })}</fieldset>;
}

function OrderSummary({ items, totalAmount, shippingQuote, shippingMethodId, preparation, shippingLoading, shippingError, onUpdate, onRemove, onEdit }) {
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = shippingQuote?.subtotal ?? totalAmount;

  return (
    <Card className="overflow-hidden shadow-none lg:sticky lg:top-20">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5 text-primary" aria-hidden="true" />
          <h2 className="font-semibold">Resumen del pedido</h2>
        </div>
        <span className="text-xs text-muted-foreground">{totalItems} {totalItems === 1 ? "artículo" : "artículos"}</span>
      </div>

      <div className="max-h-[22rem] divide-y overflow-y-auto">
        {items.map((item) => (
          <article key={item.lineKey} className="p-3">
            <div className="flex min-w-0 gap-3">
              <ProductImage src={item.presentation.image} alt="" ratio="1 / 1" className="size-14 shrink-0 rounded-md border" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{item.presentation.name}</h3>
                    {(item.variant?.size || item.variant?.color) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.variant.size && `Talla: ${item.variant.size}`}
                        {item.variant.size && item.variant.color && " · "}
                        {item.variant.color && `Color: ${item.variant.color}`}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatMoney(item.presentation.displayPrice * item.quantity)}</span>
                </div>
                <div className="mt-2 flex items-center gap-1" role="group" aria-label={`Cantidad de ${item.presentation.name}`}>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40"
                    onClick={() => item.quantity > 1 ? onUpdate(item.lineKey, item.quantity - 1) : onRemove(item.lineKey)}
                    aria-label={`Reducir cantidad de ${item.presentation.name}`}
                  >
                    <Minus className="size-3.5" aria-hidden="true" />
                  </button>
                  <span className="min-w-7 text-center text-xs font-medium" aria-live="polite">{item.quantity}</span>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md border hover:bg-muted"
                    onClick={() => onUpdate(item.lineKey, item.quantity + 1)}
                    aria-label={`Aumentar cantidad de ${item.presentation.name}`}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                {item.customization && <CustomizationInlineSummary item={item} onEdit={() => onEdit(item)} />}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="border-t p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Subtotal {shippingQuote ? "" : "estimado"}</dt>
            <dd className="font-medium">{formatMoney(subtotal)}</dd>
          </div>
          {shippingQuote?.discountAmount > 0 && (
            <div className="flex justify-between gap-3 text-success">
              <dt>Descuento ({shippingQuote.coupon?.code})</dt>
              <dd className="font-medium">−{formatMoney(shippingQuote.discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Envío</dt>
            <dd className="max-w-48 text-right font-medium">
              {shippingLoading ? "Calculando…" : shippingQuote ? (shippingQuote.isFree ? "Gratis" : formatMoney(shippingQuote.price)) : "Pendiente de dirección"}
            </dd>
          </div>
          {shippingQuote?.quoteSource === "routing" && shippingQuote.distanceKm != null && <div className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">Distancia</dt><dd>{new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(shippingQuote.distanceKm)} km{shippingQuote.band ? ` · Tarifa ${shippingQuote.band.minKm}–${shippingQuote.band.maxKm} km` : ""}</dd></div>}
          <div className="flex justify-between gap-3 text-xs">
            <dt className="text-muted-foreground">Preparación del pedido</dt>
            <dd className="max-w-52 text-right">{preparation?.status === "pending_confirmation" ? "Preparación necesaria; plazo pendiente de confirmar" : preparation?.status === "configured" ? `${preparation.minDays}–${preparation.maxDays} días laborables` : "No requiere preparación"}</dd>
          </div>
          {shippingQuote && <div className="flex justify-between gap-3 text-xs"><dt className="text-muted-foreground">Entrega</dt><dd className="max-w-52 text-right">{shippingMethodId === "pickup-free" ? "Recogida disponible cuando el pedido esté preparado" : shippingMethodId === "local-urgent" ? "Entrega urgente una vez preparado" : shippingQuote.estimatedDays ? `${shippingQuote.estimatedDays.min}–${shippingQuote.estimatedDays.max} días laborables una vez preparado` : "Según disponibilidad del método"}</dd></div>}
        </dl>
        {shippingError && <p className="mt-2 text-xs text-destructive" role="alert">{shippingError}</p>}
        <div className="my-3 border-t" />
        <div className="flex items-end justify-between gap-3">
          <span className="font-semibold">{shippingQuote ? "Total servidor" : "Total estimado"}</span>
          <Price value={shippingQuote?.total ?? subtotal} className="text-xl" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {shippingQuote ? "Importes calculados por el servidor; se validarán de nuevo al crear el pedido." : "Completa la dirección para calcular el envío."}
        </p>
      </div>
    </Card>
  );
}

export function Checkout() {
  const { user } = useAuth();
  const { items, totalAmount, clearCart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const submitLock = useRef(false);
  const lastShippingQuoteKeyRef = useRef("");
  const shippingQuoteSequenceRef = useRef(0);

  const [customer, setCustomer] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");
  const [checkoutHydrated, setCheckoutHydrated] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [emailHasAccount, setEmailHasAccount] = useState(false);
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [shippingPricing, setShippingPricing] = useState(null);
  const [orderPreparation, setOrderPreparation] = useState(null);
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [couponExpanded, setCouponExpanded] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "España",
  });
  const [useSameBilling, setUseSameBilling] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    fullName: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "España",
  });
  const [notes, setNotes] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  useEffect(() => {
    let active = true;
    getManualPaymentMethodsRequest()
      .then((data) => {
        if (!active) return;
        setPaymentMethods(Array.isArray(data.methods) ? data.methods : []);
        setPaymentMethodsError("");
      })
      .catch(() => {
        if (!active) return;
        setPaymentMethods([]);
        setPaymentMethodsError("No se pudieron cargar los métodos de pago.");
      })
      .finally(() => {
        if (active) setPaymentMethodsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (paymentMethodsLoading) return;
    if (!paymentMethods.some((method) => method.id === paymentMethod)) {
      setPaymentMethod(paymentMethods[0]?.id || "");
    }
  }, [paymentMethod, paymentMethods, paymentMethodsLoading]);

  useEffect(() => {
    if (user || !customer.email) {
      setEmailHasAccount(false);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        setEmailHasAccount(await checkEmailExists(customer.email));
      } catch {
        setEmailHasAccount(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [customer.email, user]);

  useEffect(() => {
    const draft = loadGuestSession()?.checkoutDraft;
    if (draft) {
      if (draft.customer) setCustomer(draft.customer);
      else if (draft.guestEmail || draft.shippingAddress?.fullName) {
        setCustomer((current) => ({
          ...current,
          fullName: draft.shippingAddress?.fullName || current.fullName,
          email: draft.guestEmail || current.email,
        }));
      }
      if (draft.shippingAddress) setShippingAddress(draft.shippingAddress);
      if (draft.billingAddress) setBillingAddress(draft.billingAddress);
      if (typeof draft.useSameBilling === "boolean") setUseSameBilling(draft.useSameBilling);
      if (draft.notes) setNotes(draft.notes);
      if (draft.shippingMethodId) setShippingMethodId(draft.shippingMethodId);
      if (["bizum", "bank_transfer"].includes(draft.paymentMethod)) setPaymentMethod(draft.paymentMethod);
    }
    setCheckoutHydrated(true);
  }, []);

  useEffect(() => {
    if (!checkoutHydrated) return;
    saveGuestSession({
      checkoutDraft: { customer, shippingAddress, billingAddress, useSameBilling, notes, paymentMethod, shippingMethodId },
    });
  }, [customer, shippingAddress, billingAddress, useSameBilling, notes, paymentMethod, shippingMethodId, checkoutHydrated]);

  const isShippingAddressValid = useCallback(() => Boolean(
    customer.fullName.trim()
    && shippingAddress.street.trim()
    && shippingAddress.city.trim()
    && shippingAddress.state.trim()
    && shippingAddress.postalCode.trim()
  ), [customer.fullName, shippingAddress]);

  const normalizedShippingAddress = useMemo(() => normalizeDeliveryAddress({ ...shippingAddress, fullName: customer.fullName }), [customer.fullName, shippingAddress]);
  const deliveryAddressReady = useMemo(() => isDeliveryAddressReady(normalizedShippingAddress), [normalizedShippingAddress]);
  const requiresDeliveryAddress = Boolean(shippingMethodId && shippingMethodId !== "pickup-free");
  const quoteAddressKey = requiresDeliveryAddress ? JSON.stringify(normalizedShippingAddress) : "";
  const quoteRequestKey = useMemo(() => buildShippingQuoteRequestKey({
    items,
    address: requiresDeliveryAddress ? normalizedShippingAddress : null,
    methodId: shippingMethodId,
    couponCode: appliedCouponCode,
    email: user ? "" : customer.email,
  }), [items, normalizedShippingAddress, requiresDeliveryAddress, shippingMethodId, appliedCouponCode, customer.email, user]);

  useEffect(() => {
    if (!items.length) {
      setShippingQuote(null);
      setShippingMethods([]);
      setShippingPricing(null);
      setOrderPreparation(null);
      return undefined;
    }
    if (loading) return undefined;
    shippingQuoteSequenceRef.current += 1;
    if (requiresDeliveryAddress && !deliveryAddressReady) {
      setShippingQuote(null);
      setShippingLoading(false);
      setShippingError("");
      setShippingMethods((current) => current.map((method) => method.methodId === shippingMethodId
        ? { ...method, available: false, reason: "invalid_address", quote: undefined }
        : method));
      return undefined;
    }
    if (lastShippingQuoteKeyRef.current === quoteRequestKey) return undefined;

    const sequence = shippingQuoteSequenceRef.current;
    const controller = new AbortController();
    const fetchQuote = async () => {
      try {
        setShippingLoading(true);
        setShippingError("");
        const data = await getShippingQuoteRequest(items, requiresDeliveryAddress ? normalizedShippingAddress : null, controller.signal, { shippingMethodId: shippingMethodId || null, couponCode: appliedCouponCode, email: user ? null : customer.email });
        if (sequence !== shippingQuoteSequenceRef.current) return;
        if (!data.ok) throw new Error(data.message || "Error de envío");
        const methods = Array.isArray(data.methods) ? data.methods : [];
        lastShippingQuoteKeyRef.current = quoteRequestKey;
        setShippingMethods(methods);
        setShippingPricing(data.pricing || null);
        setOrderPreparation(data.preparation || null);
        setShippingMethodId((current) => selectShippingMethodId(methods, current));
        if (!methods.some(isShippingMethodSelectable)) setShippingError("No hay ningún método de envío disponible para esta dirección.");
      } catch (quoteError) {
        if (sequence === shippingQuoteSequenceRef.current && quoteError.name !== "CanceledError" && quoteError.code !== "ERR_CANCELED") {
          setShippingError(quoteError.response?.data?.message || "No se pudo calcular el envío.");
          setShippingQuote(null);
        }
      } finally {
        if (!controller.signal.aborted && sequence === shippingQuoteSequenceRef.current) setShippingLoading(false);
      }
    };
    const timeoutId = window.setTimeout(fetchQuote, requiresDeliveryAddress ? 800 : 0);
    return () => { window.clearTimeout(timeoutId); controller.abort(); };
  }, [quoteRequestKey, quoteAddressKey, deliveryAddressReady, requiresDeliveryAddress, shippingMethodId, items, normalizedShippingAddress, loading, appliedCouponCode, customer.email, user]);

  useEffect(() => {
    setShippingQuote(buildSelectedShippingQuote(shippingMethods, shippingPricing, shippingMethodId));
  }, [shippingMethodId, shippingMethods, shippingPricing]);

  const productNeedsCustomization = (item) => {
    if (!item.customizationRequired) return false;
    if (!item.customization || item.customization.type !== "designer") return true;
    if (item.customization.schemaVersion === 2) {
      return !item.customization.designDocument;
    }
    const sides = item.customization.design?.elementsBySide || {};
    return !(Array.isArray(sides.front) && sides.front.length) && !(Array.isArray(sides.back) && sides.back.length);
  };

  const customerErrors = validateCustomerData(customer);
  const customerValid = isCustomerDataValid(customer);
  const linesValid = !items.some(productNeedsCustomization);
  const shippingMethodValid = shippingMethods.some((method) => method.methodId === shippingMethodId && method.available);
  const paymentMethodValid = paymentMethods.some((method) => method.id === paymentMethod);
  const quoteReady = Boolean(shippingQuote && Number.isFinite(Number(shippingQuote.total)));
  const canSubmit = canSubmitOrder({
    items,
    linesValid,
    customerValid,
    shippingMethodValid,
    deliveryAddressValid: !requiresDeliveryAddress || isShippingAddressValid(),
    paymentMethodValid,
    termsAccepted: acceptedTerms,
    quoteReady,
    busy: loading || shippingLoading || paymentMethodsLoading,
  });

  const editCustomization = (item) => {
    navigate(`/personalizar-v2/${item.productId}`, {
      state: {
        customization: item.customization,
        lineKey: item.lineKey,
        variant: item.variant,
        returnTo: "/checkout",
      },
    });
  };

  const processOrder = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setLoading(true);
    try {
      const data = await createOrderRequest(items, {
        paymentMethod,
        guestId: user ? null : getGuestId(),
        email: user ? null : customer.email,
        customer,
        termsAccepted: acceptedTerms,
        shippingAddress: requiresDeliveryAddress && isShippingAddressValid() ? normalizedShippingAddress : null,
        billingAddress: useSameBilling ? (requiresDeliveryAddress && isShippingAddressValid() ? normalizedShippingAddress : null) : billingAddress,
        notes,
        couponCode: appliedCouponCode,
        shippingMethodId,
      });
      if (!data.ok) {
        setError(data.message || "No se pudo crear el pedido.");
        return;
      }
      navigate("/confirmacion-pedido", {
        replace: true,
        state: {
          order: data.order,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          isGuest: !user,
          email: !user ? customer.email : null,
          emailHasAccount,
        },
      });
      setTimeout(() => {
        clearCart();
      }, 0);
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Error inesperado al crear el pedido.");
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    setError("");
    setAttemptedSubmit(true);
    if (!items.length) return setError("El carrito está vacío.");
    if (!customerValid) return setError("Completa correctamente tus datos de contacto.");
    if (shippingMethodId !== "pickup-free" && !isShippingAddressValid()) return setError("Completa los campos obligatorios de la dirección de envío.");
    if (!paymentMethod) return setError("No hay ningún método de pago disponible.");
    if (!acceptedTerms) return setError("Debes aceptar los Términos y Condiciones para continuar.");
    const notCustomized = items.find(productNeedsCustomization);
    if (notCustomized) {
      setPendingProduct(notCustomized);
      setModalOpen(true);
      return;
    }
    if (!shippingQuote) return setError("No se ha podido calcular el envío. Revisa la dirección.");
    await processOrder();
  };

  const summaryProps = {
    items,
    totalAmount,
    shippingQuote,
    shippingMethodId,
    preparation: orderPreparation,
    shippingLoading,
    shippingError,
    onUpdate: updateQuantity,
    onRemove: removeItem,
    onEdit: editCustomization,
  };

  return (
    <PageContainer>
      <header className="mb-5">
        <p className="text-sm font-medium text-primary">Compra segura</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Finalizar pedido</h1>
        <p className="mt-1 text-sm text-muted-foreground">Confirma tus datos y recibe las instrucciones del pago manual.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-7">
        <main className="min-w-0 space-y-4">
          <Card className="p-4 shadow-none">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-5 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Datos de contacto</h2>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field
                id="customer-full-name"
                label="Nombre y apellidos"
                required
                value={customer.fullName}
                onChange={(event) => setCustomer((current) => ({ ...current, fullName: event.target.value }))}
                error={attemptedSubmit ? customerErrors.fullName : ""}
                autoComplete="name"
                className="sm:col-span-2"
              />
              <Field
                id="customer-email"
                label="Email"
                required
                type="email"
                value={customer.email}
                onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value.toLowerCase() }))}
                error={attemptedSubmit ? customerErrors.email : ""}
                autoComplete="email"
              />
              <Field
                id="customer-phone"
                label="Teléfono"
                required
                type="tel"
                value={customer.phone}
                onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))}
                error={attemptedSubmit ? customerErrors.phone : ""}
                autoComplete="tel"
              />
            </div>
            {!user && emailHasAccount && (
              <p className="mt-2 text-xs text-muted-foreground">
                Este email ya tiene una cuenta. <Button as={Link} to="/login" state={{ email: customer.email }} variant="link" size="sm" className="h-auto p-0 text-xs">Iniciar sesión</Button>
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Guardamos temporalmente estos datos en tu dispositivo para completar el pedido.
            </p>
          </Card>

          <Card className="p-4 shadow-none">
            <div className="flex items-center gap-2">
              <Truck className="size-5 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Método de entrega</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Elige cómo quieres recibir el pedido.</p>
            <div className="mt-4">
              <ShippingMethods methods={shippingMethods} value={shippingMethodId} onChange={setShippingMethodId} loading={shippingLoading} />
            </div>
            {shippingMethodId && shippingMethodId !== "pickup-free" && <div className="mt-4 border-t pt-4"><h3 className="mb-1 text-sm font-semibold">Dirección de entrega</h3><p className="mb-3 text-xs text-muted-foreground">Cotizaremos cuando la dirección esté completa.</p><AddressFields prefix="shipping" value={shippingAddress} onChange={setShippingAddress} showErrors={attemptedSubmit} required includeFullName={false} /></div>}
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={useSameBilling} onChange={(event) => setUseSameBilling(event.target.checked)} className="size-4 rounded accent-primary" />
              Usar la misma dirección para facturación
            </label>
            {!useSameBilling && (
              <div className="mt-4 border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold">Dirección de facturación</h3>
                <AddressFields prefix="billing" value={billingAddress} onChange={setBillingAddress} />
              </div>
            )}
            <div className="mt-4 border-t pt-4">
              <label htmlFor="order-notes" className="mb-1.5 block text-sm font-medium">Notas del pedido <span className="font-normal text-muted-foreground">(opcional)</span></label>
              <Textarea id="order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Indicaciones útiles para preparar o entregar el pedido" />
            </div>
          </Card>

          <Card className="p-4 shadow-none">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">¿Tienes un cupón?</h2>
              <Button type="button" variant="ghost" size="sm" aria-expanded={couponExpanded} onClick={() => setCouponExpanded((current) => !current)}>
                {couponExpanded ? "Ocultar" : "Añadir código"}
              </Button>
            </div>
            {couponExpanded && <div className="mt-3 flex gap-2">
              <Input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Código de descuento" aria-label="Código de cupón" />
              <Button type="button" variant="outline" disabled={!normalizeCouponCode(couponCode)} onClick={() => setAppliedCouponCode(normalizeCouponCode(couponCode))}>{appliedCouponCode ? "Actualizar" : "Aplicar"}</Button>
            </div>}
            {!shippingLoading && shippingQuote?.coupon?.code === appliedCouponCode && <div className="mt-2 flex items-center justify-between gap-3"><p className="text-xs text-success">Cupón {appliedCouponCode} aplicado.</p><Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setCouponCode(""); setAppliedCouponCode(""); }}>Quitar</Button></div>}
          </Card>

          <Card className="p-4 shadow-none">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="size-5 text-primary" aria-hidden="true" />
              <span className="sr-only">Pago manual</span>
            </div>
            <PaymentMethods
              methods={paymentMethods}
              value={paymentMethod}
              onChange={setPaymentMethod}
              loading={paymentMethodsLoading}
              error={paymentMethodsError}
            />
          </Card>

          <div className="lg:hidden"><OrderSummary {...summaryProps} /></div>

          {error && (
            <Alert variant="destructive" className="flex items-start gap-2" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </Alert>
          )}

          <div className="space-y-3 rounded-xl border bg-card p-4">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 size-4 shrink-0 rounded accent-primary" />
              <span>He leído y acepto los <Link to="/terminos-condiciones" className="font-medium text-primary underline-offset-4 hover:underline">Términos y Condiciones de Venta</Link>.</span>
            </label>
            {!acceptedTerms && <p id="terms-required" className="text-xs text-muted-foreground">Debes aceptar los términos y condiciones para confirmar el pedido.</p>}
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={handleConfirmOrder}
              disabled={!canSubmit}
              aria-busy={loading}
              aria-describedby={!acceptedTerms ? "terms-required" : undefined}
            >
              {loading ? "Creando pedido…" : "Confirmar pedido"}
            </Button>
            <p className="text-xs text-muted-foreground">
              No se realizará un cobro online. Tras crear el pedido verás las instrucciones del método elegido. Consulta la <Link to="/politica-privacidad" className="underline underline-offset-2">Política de Privacidad</Link>.
            </p>
          </div>
        </main>

        <aside className="hidden lg:block"><OrderSummary {...summaryProps} /></aside>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Falta la personalización</DialogTitle>
            <DialogDescription>
              Completa el diseño de {pendingProduct?.presentation.name} antes de confirmar el pedido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={() => { setModalOpen(false); editCustomization(pendingProduct); }}>
              Personalizar ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

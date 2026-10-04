import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingCart, Sparkles } from "lucide-react";
import { apiGetProductById, apiQuoteCustomization } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";
import { normalizeVariant } from "../../utils/cartLineAdapter";
import { Badge } from "../../components/ui/badge";
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
import { ErrorState } from "../../components/ui/ErrorState";
import { PageContainer } from "../../components/ui/PageContainer";
import { Price } from "../../components/ui/Price";
import { ProductGallery } from "../../components/ui/ProductGallery";
import { Skeleton } from "../../components/ui/skeleton";
import { isProductDesignerV2Enabled } from "../../features/product-designer-v2/utils/featureFlag";
import { canUseProductDesignerV2 } from "../../features/product-designer-v2/templates/templateCatalog";
import { buildDesignerV2Location, createDesignerVariantContext } from "../../features/product-designer-v2/domain/variantContext";
import { animateAddToCart } from "../../utils/cartAnimation";
import { getCommercialSurfaces, normalizeSelectedSurfaceIds } from "../../features/product-designer-v2/domain/customizationSurfaces";

function DetailSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-4 h-9 w-24" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4 rounded-xl border p-5">
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </PageContainer>
  );
}

function VariantOptions({ legend, options, value, onChange }) {
  if (options.length === 0) return null;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            aria-label={`${legend}: ${option}`}
            className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
              value === option
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [addedDialogOpen, setAddedDialogOpen] = useState(false);
  const [selectedSurfaceIds, setSelectedSurfaceIds] = useState([]);
  const [customizationQuote, setCustomizationQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);

  const handleBackToProducts = () => {
    if (location.state?.fromProducts) {
      const returnTo = location.state.returnTo || "/productos";
      navigate(returnTo, {
        state: {
          restoreScrollY: location.state.scrollY,
          restoreProductId: location.state.productId ?? null,
          restoreContext: location.state.restoreContext || returnTo,
          restoreFilters: location.state.restoreFilters || null,
        },
      });
      return;
    }

    navigate(-1);
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!id) {
        setError("Producto no encontrado");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await apiGetProductById(id);
        if (!alive) return;
        setProduct(data);
        setQuantity(1);
        setSelectedSize("");
        setSelectedColor("");
        setSelectedAttributes({});
        setSelectedVariant(null);
        setSelectedSurfaceIds(getCommercialSurfaces(data).filter((surface) => surface.required).map((surface) => surface.surfaceId));
        setCustomizationQuote(null);
        setQuoteError("");
      } catch {
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [id, reloadKey]);

  const isAliExpress = product?.provider === "aliexpress";
  const hasDesignerV2Template = canUseProductDesignerV2(product);
  const productId = product?.id || product?._id;
  const availableSizes = Array.isArray(product?.variants?.sizes) ? product.variants.sizes : [];
  const availableColors = Array.isArray(product?.variants?.colors) ? product.variants.colors : [];
  const stock = Number.isFinite(Number(product?.stock)) ? Math.max(0, Math.floor(Number(product.stock))) : 0;
  const hasRequiredVariant =
    (availableSizes.length === 0 || Boolean(selectedSize)) &&
    (availableColors.length === 0 || Boolean(selectedColor));
  const designerVariant = useMemo(() => createDesignerVariantContext(product, { size: selectedSize, color: selectedColor }), [product, selectedColor, selectedSize]);
  const designerLocation = buildDesignerV2Location(productId, designerVariant);
  const commercialSurfaces = useMemo(() => getCommercialSurfaces(product), [product]);

  useEffect(() => {
    let active = true;
    if (!productId || commercialSurfaces.length === 0 || !hasRequiredVariant || selectedSurfaceIds.length === 0) {
      setCustomizationQuote(null);
      setQuoteError("");
      return () => { active = false; };
    }
    let normalized;
    try {
      normalized = normalizeSelectedSurfaceIds(commercialSurfaces, selectedSurfaceIds);
    } catch (error) {
      setCustomizationQuote(null);
      setQuoteError(error.message);
      return () => { active = false; };
    }
    setQuoteLoading(true);
    setQuoteError("");
    apiQuoteCustomization(productId, { selectedSurfaceIds: normalized, variant: designerVariant })
      .then((quote) => { if (active) setCustomizationQuote(quote); })
      .catch((error) => {
        if (active) {
          setCustomizationQuote(null);
          setQuoteError(error.response?.data?.message || "No se pudo calcular la personalización.");
        }
      })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [commercialSurfaces, designerVariant, hasRequiredVariant, productId, selectedSurfaceIds]);

  const aliAttributes = useMemo(() => {
    if (!isAliExpress || !Array.isArray(product?.variants)) return {};
    const valuesByAttribute = {};
    product.variants.forEach((variant) => {
      Object.entries(variant.attributes || {}).forEach(([key, value]) => {
        if (!valuesByAttribute[key]) valuesByAttribute[key] = new Set();
        valuesByAttribute[key].add(value);
      });
    });
    return Object.fromEntries(
      Object.entries(valuesByAttribute).map(([key, values]) => [key, [...values]]),
    );
  }, [isAliExpress, product]);

  useEffect(() => {
    if (!isAliExpress || !Array.isArray(product?.variants)) return;
    const match = product.variants.find((variant) =>
      Object.entries(selectedAttributes).every(
        ([key, value]) => variant.attributes?.[key] === value,
      ),
    );
    setSelectedVariant(match || null);
  }, [selectedAttributes, isAliExpress, product]);

  const galleryImages = useMemo(
    () => [
      selectedVariant?.image,
      product?.image,
      ...(Array.isArray(product?.images) ? product.images : []),
    ],
    [product, selectedVariant],
  );

  if (loading) return <DetailSkeleton />;

  if (error || !product) {
    return (
      <PageContainer>
        <Button type="button" variant="ghost" size="sm" className="mb-4" onClick={handleBackToProducts}>
          <ArrowLeft aria-hidden="true" /> Volver
        </Button>
        <ErrorState
          description={error || "Producto no encontrado"}
          onRetry={() => setReloadKey((current) => current + 1)}
        />
      </PageContainer>
    );
  }

  const canAddToCart = isAliExpress
    ? Boolean(selectedVariant)
    : stock > 0 && hasRequiredVariant;
  const displayedPrice = customizationQuote?.unitPrice ?? (isAliExpress
    ? selectedVariant?.price?.final ?? product.price?.final
    : product.price?.final ?? product.price);
  const canPersonalize = canAddToCart && !isAliExpress && commercialSurfaces.length > 0 && Boolean(customizationQuote) && !quoteLoading;

  const toggleSurface = (surface) => {
    if (surface.required) return;
    setSelectedSurfaceIds((current) => current.includes(surface.surfaceId)
      ? current.filter((id) => id !== surface.surfaceId)
      : [...current, surface.surfaceId]);
  };

  const clampQuantity = (value) => {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue)) return 1;
    return Math.min(Math.max(1, numericValue), Math.max(1, stock));
  };

  const selectedCanonicalVariant = () => normalizeVariant(product, {
    size: selectedSize || null,
    color: selectedColor || null,
  });

  const handleAddToCart = (event) => {
    if (isAliExpress || !canAddToCart) return;
    addItem({
      product,
      quantity: clampQuantity(quantity),
      variant: selectedCanonicalVariant(),
      customization: null,
    });
    animateAddToCart({ sourceElement: event.currentTarget, imageUrl: galleryImages[0] });
    setAddedDialogOpen(true);
  };

  return (
    <PageContainer>
      <Button type="button" variant="ghost" size="sm" className="mb-4 -ml-2" onClick={handleBackToProducts}>
        <ArrowLeft aria-hidden="true" /> Volver
      </Button>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:gap-7">
        <ProductGallery
          images={galleryImages}
          productName={product.name || "Producto"}
          className="lg:sticky lg:top-20"
        />

        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
              <Price value={displayedPrice} className="mt-2 text-2xl sm:text-3xl" />
              <Badge variant={stock > 0 ? "success" : "destructive"} className="mt-2">
                {stock > 0 ? `Stock: ${stock}` : "Sin stock"}
              </Badge>
            </div>

            {!isAliExpress && (availableSizes.length > 0 || availableColors.length > 0) && (
              <div className="space-y-4 border-t pt-4">
                <VariantOptions legend="Talla" options={availableSizes} value={selectedSize} onChange={setSelectedSize} />
                <VariantOptions legend="Color" options={availableColors} value={selectedColor} onChange={setSelectedColor} />
              </div>
            )}

            {isAliExpress && Object.keys(aliAttributes).length > 0 && (
              <div className="space-y-3 border-t pt-4">
                {Object.entries(aliAttributes).map(([attribute, values]) => (
                  <label key={attribute} className="grid gap-1.5 text-sm font-semibold">
                    {attribute}
                    <select
                      value={selectedAttributes[attribute] || ""}
                      onChange={(event) => setSelectedAttributes((current) => ({
                        ...current,
                        [attribute]: event.target.value,
                      }))}
                      className="h-10 rounded-lg border bg-background px-3 text-sm"
                    >
                      <option value="">Selecciona</option>
                      {values.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <p className="mb-2 text-sm font-semibold">Cantidad</p>
              <div className="flex h-10 w-fit items-stretch overflow-hidden rounded-lg border bg-background" role="group" aria-label="Seleccionar cantidad">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => clampQuantity(current - 1))}
                  disabled={quantity <= 1 || stock === 0}
                  aria-label="Reducir cantidad"
                  className="inline-flex w-10 items-center justify-center hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, stock)}
                  value={quantity}
                  onChange={(event) => setQuantity(clampQuantity(event.target.value))}
                  disabled={stock === 0}
                  aria-label="Cantidad"
                  className="w-12 border-x bg-transparent text-center text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((current) => clampQuantity(current + 1))}
                  disabled={quantity >= stock || stock === 0}
                  aria-label="Aumentar cantidad"
                  className="inline-flex w-10 items-center justify-center hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {!hasRequiredVariant && (
              <p className="text-sm text-muted-foreground">Selecciona las opciones del producto para continuar.</p>
            )}

            {hasDesignerV2Template && isProductDesignerV2Enabled && (
              <fieldset className="space-y-2 border-t pt-4">
                <legend className="text-sm font-semibold">¿Dónde quieres personalizar?</legend>
                {commercialSurfaces.length > 0 ? commercialSurfaces.map((surface) => (
                  <label key={surface.surfaceId} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedSurfaceIds.includes(surface.surfaceId)} disabled={surface.required} onChange={() => toggleSurface(surface)} />
                      <span>{surface.label}{surface.required ? " (obligatoria)" : ""}</span>
                    </span>
                    <span className="font-medium">{surface.priceModifier === 0 ? "Incluido" : `+${surface.priceModifier.toFixed(2)} €`}</span>
                  </label>
                )) : <p className="text-sm text-muted-foreground">La personalización por superficies todavía no está configurada.</p>}
                {quoteLoading && <p className="text-xs text-muted-foreground">Calculando precio…</p>}
                {quoteError && <p className="text-xs text-destructive">{quoteError}</p>}
              </fieldset>
            )}

            <Button type="button" size="lg" className="w-full" onClick={handleAddToCart} disabled={!canAddToCart}>
              <ShoppingCart aria-hidden="true" /> Añadir al carrito
            </Button>

            {hasDesignerV2Template && isProductDesignerV2Enabled && (
              canPersonalize && (!(availableSizes.length || availableColors.length) || designerVariant) ? (
                <Button
                  as={Link}
                  to={designerLocation}
                  state={{ variant: designerVariant, selectedSurfaceIds: customizationQuote.selectedSurfaceIds, customizationQuote, fromProductDetail: true }}
                  variant="secondary"
                  className="w-full"
                >
                  <Sparkles aria-hidden="true" /> Personalizar producto
                </Button>
              ) : (
                <Button type="button" variant="secondary" className="w-full" disabled>
                  <Sparkles aria-hidden="true" /> Personalizar producto
                </Button>
              )
            )}
          </div>
        </Card>
      </div>

      {product.description && (
        <section className="mt-6 rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="product-description-title">
          <h2 id="product-description-title" className="text-lg font-semibold">Descripción</h2>
          <p className="mt-2 max-w-4xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        </section>
      )}

      <Dialog open={addedDialogOpen} onOpenChange={setAddedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Producto añadido</DialogTitle>
            <DialogDescription>
              {product.name} se ha añadido al carrito con la selección indicada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddedDialogOpen(false)}>Seguir comprando</Button>
            <Button type="button" onClick={() => { setAddedDialogOpen(false); navigate("/carrito"); }}>Ir al carrito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

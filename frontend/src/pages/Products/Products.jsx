import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { apiGetProducts } from "../../services/products.service";
import { ProductCard } from "../../components/ProductCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";

const PRODUCTS_SCROLL_KEY = "products_scroll_y";
const MAX_SCROLL_RESTORE_ATTEMPTS = 30;
const SCROLL_RESTORE_DELAY_MS = 80;
const PRODUCTS_GRID_CLASS = "grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

function sortOutOfStockLast(list = []) {
  return list
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const aOutOfStock = Number(a.product?.stock ?? 0) <= 0;
      const bOutOfStock = Number(b.product?.stock ?? 0) <= 0;

      if (aOutOfStock === bOutOfStock) return a.index - b.index;
      return aOutOfStock ? 1 : -1;
    })
    .map(({ product }) => product);
}

function filterByPrice(list, minPrice, maxPrice) {
  const min = minPrice === "" ? null : Number(minPrice);
  const max = maxPrice === "" ? null : Number(maxPrice);

  return list.filter((product) => {
    const price = Number(product?.price);
    if (!Number.isFinite(price)) return min == null && max == null;
    if (Number.isFinite(min) && price < min) return false;
    if (Number.isFinite(max) && price > max) return false;
    return true;
  });
}

const CATEGORIES = [
  ["", "Todas"],
  ["ropa", "Ropa"],
  ["electronica", "Electrónica"],
  ["hogar", "Hogar"],
];

function categoryLabel(value) {
  return CATEGORIES.find(([category]) => category === value)?.[1] || value;
}

function ProductGridSkeleton() {
  return (
    <div className={PRODUCTS_GRID_CLASS} aria-label="Cargando productos">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border bg-card shadow-card" aria-hidden="true">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2.5 p-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
            <div className="flex items-center justify-between gap-2 pt-1">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
      <span className="sr-only" role="status">Cargando productos…</span>
    </div>
  );
}

export function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasRestoredScrollRef = useRef(false);

  const location = useLocation();
  const navigate = useNavigate();

  const catalogQuery = new URLSearchParams(location.search).get("q") || "";

  // filtros
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState("");
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");

  const loadProducts = useCallback(async ({ q = "", category: selectedCategory = "", minPrice: selectedMin = "", maxPrice: selectedMax = "" } = {}) => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (q) params.q = q;
      if (selectedCategory) params.category = selectedCategory;
      const data = await apiGetProducts(params);
      setProducts(sortOutOfStockLast(filterByPrice(data, selectedMin, selectedMax)));
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los productos");
    } finally {
      setLoading(false);
    }
  }, []);


  // búsqueda local sincronizada con la URL y filtros aplicados
  useEffect(() => {
    const searchProducts = setTimeout(() => {
      loadProducts({ q: catalogQuery, category, minPrice, maxPrice });
    }, 300);
    return () => clearTimeout(searchProducts);
  }, [catalogQuery, category, minPrice, maxPrice, loadProducts]);

  // restaurar scroll al volver desde detalle (cuando el listado ya esté pintado)
  useEffect(() => {
    if (hasRestoredScrollRef.current || loading) return;

    const stateY = location.state?.restoreScrollY;
    const stateProductId = location.state?.restoreProductId;
    const raw = sessionStorage.getItem(PRODUCTS_SCROLL_KEY);
    const target = stateY ?? (raw == null ? null : Number(raw));

    const hasNumericTarget = Number.isFinite(target) && target >= 0;
    const hasProductTarget = !!stateProductId;

    if (!hasNumericTarget && !hasProductTarget) {
      hasRestoredScrollRef.current = true;
      return;
    }

    let attempts = 0;
    let timer;

    const restoreWithRetry = () => {
      let restored = false;

      if (hasProductTarget) {
        const selector = `[data-product-id="${stateProductId}"]`;
        const card = document.querySelector(selector);
        if (card) {
          card.scrollIntoView({ block: "center", behavior: "auto" });
          restored = true;
        }
      }

      if (!restored && hasNumericTarget) {
        const maxScrollableY = document.documentElement.scrollHeight - window.innerHeight;
        const canReachTarget = maxScrollableY >= target;

        window.scrollTo({ top: target, behavior: "auto" });
        const closeEnough = Math.abs(window.scrollY - target) <= 2;
        restored = canReachTarget || closeEnough;
      }

      if (restored || attempts >= MAX_SCROLL_RESTORE_ATTEMPTS) {
        hasRestoredScrollRef.current = true;

        if (location.state?.restoreScrollY != null || location.state?.restoreProductId != null) {
          navigate(location.pathname, { replace: true, state: null });
        }
        return;
      }

      attempts += 1;
      timer = setTimeout(restoreWithRetry, SCROLL_RESTORE_DELAY_MS);
    };

    timer = setTimeout(restoreWithRetry, 0);

    return () => clearTimeout(timer);
  }, [loading, products.length, location.state, location.pathname, navigate]);

  // guardar scroll de forma continua mientras se navega el listado
  useEffect(() => {
    const onScrollSave = () => {
      sessionStorage.setItem(PRODUCTS_SCROLL_KEY, String(window.scrollY || 0));
    };

    window.addEventListener("scroll", onScrollSave, { passive: true });
    return () => window.removeEventListener("scroll", onScrollSave);
  }, []);

  // guardar scroll al salir de la página de productos
  useEffect(() => {
    return () => {
      sessionStorage.setItem(PRODUCTS_SCROLL_KEY, String(window.scrollY || 0));
    };
  }, []);

  const updateCatalogQuery = (value) => {
    const params = new URLSearchParams(location.search);
    const normalized = value.replace(/\s+/g, " ").trimStart();
    if (normalized) params.set("q", normalized);
    else params.delete("q");
    const search = params.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
  };

  const handleFilterOpenChange = (open) => {
    setFilterOpen(open);
    if (open) {
      setDraftCategory(category);
      setDraftMinPrice(minPrice);
      setDraftMaxPrice(maxPrice);
    }
  };

  const handleApplyFilters = () => {
    setCategory(draftCategory);
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    setFilterOpen(false);
  };

  const handleClearDraftFilters = () => {
    setDraftCategory("");
    setDraftMinPrice("");
    setDraftMaxPrice("");
  };

  const handleResetFilters = () => {
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setDraftCategory("");
    setDraftMinPrice("");
    setDraftMaxPrice("");
    updateCatalogQuery("");
  };

  const activeFilterCount = Number(Boolean(category)) + Number(Boolean(minPrice || maxPrice));

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Productos en venta"
        description="Explora el catálogo y añade al carrito lo que quieras comprar."
        actions={<p className="text-sm font-medium text-muted-foreground" aria-live="polite">{loading && products.length === 0 ? "Cargando…" : `${products.length} ${products.length === 1 ? "producto" : "productos"}`}</p>}
        className="mb-4"
      />

      <section className="mb-4" aria-label="Búsqueda y filtros del catálogo">
        <form
          role="search"
          className="flex items-center gap-2"
          onSubmit={(event) => { event.preventDefault(); loadProducts({ q: catalogQuery, category, minPrice, maxPrice }); }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={catalogQuery}
              onChange={(event) => updateCatalogQuery(event.target.value)}
              placeholder="Buscar por nombre..."
              aria-label="Buscar productos en el catálogo"
              className="h-10 bg-muted/35 pl-10"
            />
          </div>
          <Button type="button" variant="outline" className="relative shrink-0 px-3" onClick={() => handleFilterOpenChange(true)} aria-label={`Abrir filtros${activeFilterCount ? `, ${activeFilterCount} activos` : ""}`}>
            <SlidersHorizontal />
            <span>Filtros</span>
            {activeFilterCount > 0 && <Badge variant="default" className="min-w-5 justify-center rounded-full px-1">{activeFilterCount}</Badge>}
          </Button>
        </form>
      </section>

      {activeFilterCount > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Filtros aplicados">
          {category && (
            <Badge variant="outline" className="gap-1 py-1 pl-2.5 pr-1">
              {categoryLabel(category)}
              <button type="button" onClick={() => setCategory("")} className="inline-flex size-6 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Quitar filtro de categoría ${categoryLabel(category)}`}>
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </Badge>
          )}
          {(minPrice || maxPrice) && (
            <Badge variant="outline" className="gap-1 py-1 pl-2.5 pr-1">
              {minPrice && maxPrice ? `${minPrice}–${maxPrice} €` : minPrice ? `Desde ${minPrice} €` : `Hasta ${maxPrice} €`}
              <button type="button" onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="inline-flex size-6 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Quitar filtro de precio">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <Sheet open={filterOpen} onOpenChange={handleFilterOpenChange}>
        <SheetContent side="right" className="flex w-[min(92vw,24rem)] flex-col p-5">
          <SheetHeader className="border-b pb-4 pr-10">
            <SheetTitle className="text-lg font-semibold">Filtros</SheetTitle>
            <SheetDescription>Ajusta el catálogo y aplica los cambios al terminar.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto pr-1">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Categoría</legend>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(([value, label]) => (
                  <Button key={value || "all"} type="button" variant={draftCategory === value ? "secondary" : "outline"} className="justify-start" aria-pressed={draftCategory === value} onClick={() => setDraftCategory(value)}>{label}</Button>
                ))}
              </div>
            </fieldset>

            <fieldset className="border-t pt-5">
              <legend className="mb-2 text-sm font-semibold">Precio</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs text-muted-foreground">Desde<Input type="number" min="0" inputMode="decimal" value={draftMinPrice} onChange={(event) => setDraftMinPrice(event.target.value)} aria-label="Precio mínimo" /></label>
                <label className="grid gap-1 text-xs text-muted-foreground">Hasta<Input type="number" min="0" inputMode="decimal" value={draftMaxPrice} onChange={(event) => setDraftMaxPrice(event.target.value)} aria-label="Precio máximo" /></label>
              </div>
            </fieldset>

            <div className="border-t pt-5">
              <Button type="button" variant="ghost" className="px-0 text-muted-foreground" onClick={handleClearDraftFilters}>Limpiar filtros</Button>
            </div>
          </div>

          <div className="mt-5 border-t pt-4">
            <p className="mb-3 text-sm text-muted-foreground">{products.length} {products.length === 1 ? "producto" : "productos"} actuales</p>
            <Button type="button" className="w-full" onClick={handleApplyFilters}>Aplicar filtros</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Estado de carga / error / lista */}
      {loading && products.length === 0 && <ProductGridSkeleton />}

      {error && (
        <ErrorState description={error} onRetry={() => loadProducts({ q: catalogQuery, category, minPrice, maxPrice })} className="mb-4" />
      )}

      {!loading && products.length === 0 && !error && (
        <EmptyState
          title="No hay productos disponibles"
          description="Prueba a cambiar o limpiar los filtros del catálogo."
          action={
            <Button variant="outline" onClick={handleResetFilters}>
              Limpiar filtros
            </Button>
          }
        />
      )}

      {products.length > 0 && (
        <div className={PRODUCTS_GRID_CLASS}>
          {products.map((p) => (
            <ProductCard key={p.id || p._id} product={p} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

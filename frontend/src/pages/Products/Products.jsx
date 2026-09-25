import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { apiGetProducts } from "../../services/products.service";
import { ProductCard } from "../../components/ProductCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";

const PRODUCTS_SCROLL_KEY = "products_scroll_y";
const MAX_SCROLL_RESTORE_ATTEMPTS = 30;
const SCROLL_RESTORE_DELAY_MS = 80;

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

export function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasRestoredScrollRef = useRef(false);

  const location = useLocation();
  const navigate = useNavigate();

  // filtros
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  async function loadProducts(params = {}) {
    try {
      setLoading(true);
      setError("");
      const data = await apiGetProducts(params);
      setProducts(sortOutOfStockLast(data));
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los productos");
    } finally {
      setLoading(false);
    }
  }


  // primer load
  useEffect(() => {
    loadProducts();
  }, []);

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

  const handleSearch = () => {
    const params = {};
    if (q) params.q = q;
    if (category) params.category = category;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    loadProducts(params);
  };

  const handleResetFilters = () => {
    setQ("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    loadProducts({});
  };

  return (
    <PageContainer>
      <PageHeader
        title="Productos en venta"
        description="Explora el catálogo y añade al carrito lo que quieras comprar."
      />

      <section className="mb-4 rounded-xl border bg-muted/45 p-3">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1.5fr)_minmax(160px,1fr)_120px_120px_auto]">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Buscar por nombre
            <Input
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Categoría
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="ropa">Ropa</option>
              <option value="electronica">Electrónica</option>
              <option value="hogar">Hogar</option>
            </Select>
          </label>

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Precio mín.
            <Input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Precio máx.
            <Input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </label>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={loading}>Filtrar</Button>
            <Button variant="outline" size="icon" aria-label="Limpiar filtros" onClick={handleResetFilters} disabled={loading}><RotateCcw /></Button>
          </div>
        </div>
      </section>

      {/* Estado de carga / error / lista */}
      {loading && products.length === 0 && (
        <LoadingState message="Cargando productos…" />
      )}

      {error && (
        <ErrorState description={error} onRetry={handleSearch} className="mb-4" />
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id || p._id} product={p} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

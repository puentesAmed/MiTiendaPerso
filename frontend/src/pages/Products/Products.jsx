import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Box,
  SimpleGrid,
  Input,
  Select,
  HStack,
  Button,
  IconButton,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import { apiGetProducts } from "../../services/products.service";
import { ProductCard } from "../../components/ProductCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingState } from "../../components/ui/LoadingState";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";

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
    <PageContainer
      bg="bgSurface"
      borderWidth="1px"
      borderColor="borderSubtle"
      borderRadius="surface"
      boxShadow="sm"
      py={{ base: 4, md: 6 }}
    >
      <PageHeader
        title="Productos en venta"
        description="Explora el catálogo y añade al carrito lo que quieras comprar."
        mb={4}
      />

      {/* Filtros */}
      <Box
        mb={4}
        p={3}
        borderWidth="1px"
        borderRadius="lg"
        bg="bgSubtle"
        borderColor="borderSubtle"
      >
        <HStack spacing={3} align="flex-end" flexWrap="wrap">
          <FormControl flex="1 1 200px">
            <FormLabel mb={1} fontSize="xs" color="textMuted">
              Buscar por nombre
            </FormLabel>
            <Input
              size="sm"
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </FormControl>

          <FormControl flex="1 1 160px">
            <FormLabel mb={1} fontSize="xs" color="textMuted">
              Categoría
            </FormLabel>
            <Select
              size="sm"
              placeholder="Todas"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {/* Si quieres, carga categorías desde BD.
                 De momento, ejemplos fijos: */}
              <option value="ropa">Ropa</option>
              <option value="electronica">Electrónica</option>
              <option value="hogar">Hogar</option>
            </Select>
          </FormControl>

          <FormControl flex="0 0 120px">
            <FormLabel mb={1} fontSize="xs" color="textMuted">
              Precio mín.
            </FormLabel>
            <Input
              size="sm"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </FormControl>

          <FormControl flex="0 0 120px">
            <FormLabel mb={1} fontSize="xs" color="textMuted">
              Precio máx.
            </FormLabel>
            <Input
              size="sm"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </FormControl>

          <HStack>
            <Button size="sm" onClick={handleSearch} isLoading={loading}>
              Filtrar
            </Button>
            <IconButton
              size="sm"
              aria-label="Limpiar filtros"
              icon={<RepeatIcon />}
              onClick={handleResetFilters}
              isDisabled={loading}
            />
          </HStack>
        </HStack>
      </Box>

      {/* Estado de carga / error / lista */}
      {loading && products.length === 0 && (
        <LoadingState message="Cargando productos…" />
      )}

      {error && (
        <ErrorState description={error} onRetry={handleSearch} mb={4} />
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
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={4}>
          {products.map((p) => (
            <ProductCard key={p.id || p._id} product={p} />
          ))}
        </SimpleGrid>
      )}
    </PageContainer>
  );
}

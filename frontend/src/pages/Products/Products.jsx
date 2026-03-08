import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Input,
  Select,
  HStack,
  Button,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import { apiGetProducts } from "../../services/products.service";
import { ProductCard } from "../../components/ProductCard";

const PRODUCTS_SCROLL_KEY = "products_scroll_y";

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

  const bg = useColorModeValue("gray.50", "gray.900");

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
    const raw = sessionStorage.getItem(PRODUCTS_SCROLL_KEY);
    const target = stateY ?? (raw == null ? null : Number(raw));

    if (!Number.isFinite(target) || target < 0) {
      hasRestoredScrollRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      window.scrollTo({ top: target, behavior: "auto" });
      hasRestoredScrollRef.current = true;

      if (location.state?.restoreScrollY != null) {
        navigate(location.pathname, { replace: true, state: null });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [loading, products.length, location.state, location.pathname, navigate]);

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
    <Box bg={bg} borderRadius="xl" p={{ base: 4, md: 6 }} boxShadow="md">
      <Box mb={4}>
        <Heading size="lg">Productos en venta</Heading>
        <Text fontSize="sm" color="gray.500" mt={1}>
          Explora el catálogo y añade al carrito lo que quieras comprar.
        </Text>
      </Box>

      {/* Filtros */}
      <Box
        mb={4}
        p={3}
        borderWidth="1px"
        borderRadius="lg"
        bg={useColorModeValue("white", "gray.800")}
      >
        <HStack spacing={3} align="flex-end" flexWrap="wrap">
          <Box flex="1 1 200px">
            <Text mb={1} fontSize="xs" color="gray.500">
              Buscar por nombre
            </Text>
            <Input
              size="sm"
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Box>

          <Box flex="1 1 160px">
            <Text mb={1} fontSize="xs" color="gray.500">
              Categoría
            </Text>
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
          </Box>

          <Box flex="0 0 120px">
            <Text mb={1} fontSize="xs" color="gray.500">
              Precio mín.
            </Text>
            <Input
              size="sm"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </Box>

          <Box flex="0 0 120px">
            <Text mb={1} fontSize="xs" color="gray.500">
              Precio máx.
            </Text>
            <Input
              size="sm"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </Box>

          <HStack>
            <Button size="sm" colorScheme="blue" onClick={handleSearch} isLoading={loading}>
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
      {error && (
        <Text color="red.400" mb={3} fontSize="sm">
          {error}
        </Text>
      )}

      {!loading && products.length === 0 && !error && (
        <Text fontSize="sm" color="gray.500">
          No hay productos disponibles.
        </Text>
      )}

      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
        {products.map((p) => (
          <ProductCard key={p.id || p._id} product={p} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

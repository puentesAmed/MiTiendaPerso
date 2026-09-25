// src/pages/ProductDetail/ProductDetail.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Image,
  Stack,
  HStack,
  Button,
  Spinner,
  Badge,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Select,
  Divider,
  useThemeValue,
} from "@/components/ui/legacy-ui";
import { ArrowBackIcon } from "@/components/ui/icons";
import { apiGetProductById } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";
import { normalizeVariant } from "../../utils/cartLineAdapter";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);

  // 🔹 INTERNOS
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // 🔹 ALIEXPRESS
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [activeImage, setActiveImage] = useState(null);

  const isAliExpress = product?.provider === "aliexpress";

  const isCustomizable = !!product?.customizable;

  const customBoxBg = useThemeValue("purple.50", "purple.900Alpha.200");

  const handleBackToProducts = () => {
    if (location.state?.fromProducts) {
      navigate("/productos", {
        state: {
          restoreScrollY: location.state.scrollY ?? 0,
          restoreProductId: location.state.productId ?? null,
        },
      });
      return;
    }

    navigate(-1);
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const data = await apiGetProductById(id);
        if (!alive) return;

        setProduct(data);

        const imgs = [
          ...(data.image ? [data.image] : []),
          ...(Array.isArray(data.images) ? data.images : []),
        ];
        setActiveImage(imgs[0] || null);
      } catch {
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) load();
    return () => (alive = false);
  }, [id]);

  // ─────────────────────────────────────
  // 🟥 ALIEXPRESS: atributos dinámicos
  // ─────────────────────────────────────
  const aliAttributes = useMemo(() => {
    if (!isAliExpress || !Array.isArray(product?.variants)) return {};

    const map = {};
    product.variants.forEach((v) => {
      Object.entries(v.attributes || {}).forEach(([key, value]) => {
        if (!map[key]) map[key] = new Set();
        map[key].add(value);
      });
    });

    Object.keys(map).forEach((k) => {
      map[k] = Array.from(map[k]);
    });

    return map;
  }, [isAliExpress, product]);

  useEffect(() => {
    if (!isAliExpress) return;

    const match = product.variants.find((v) =>
      Object.entries(selectedAttributes).every(
        ([k, vAttr]) => v.attributes?.[k] === vAttr
      )
    );

    setSelectedVariant(match || null);
    if (match?.image) setActiveImage(match.image);
  }, [selectedAttributes, isAliExpress, product]);

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={6}>
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={handleBackToProducts}
        >
          Volver
        </Button>
        <Text color="red.400">{error || "Producto no encontrado"}</Text>
      </Box>
    );
  }

  const canAddToCart = isAliExpress
    ? !!selectedVariant
    : product.stock > 0 &&
      (!product?.variants?.sizes?.length || selectedSize) &&
      (!product?.variants?.colors?.length || selectedColor);

  const handleAddToCart = () => {
    if (isAliExpress) return;

    addItem({
      product,
      quantity: Number(quantity) || 1,
      variant: normalizeVariant(product, {
        size: selectedSize || null,
        color: selectedColor || null,
      }),
      customization: null,
    });
  };

  /*const displayedPrice = isAliExpress
  ? selectedVariant?.price?.final ?? product.price?.final
  : product.price?.final;
*/
  const displayedPrice = isAliExpress
    ? selectedVariant?.price?.final ?? product.price?.final
    : product.price?.final ?? product.price;


  return (
    <Box>
      <Button
        leftIcon={<ArrowBackIcon />}
        size="sm"
        mb={4}
        variant="ghost"
        onClick={handleBackToProducts}
      >
        Volver
      </Button>

      <Box
        bg="bgSurface"
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={8}
      >
        {/* GALERÍA */}
        <Box>
          <Image
            src={activeImage}
            alt={product.name}
            borderRadius="lg"
            w="100%"
            h="360px"
            objectFit="contain"
          />
        </Box>

        {/* BUY BOX */}
        <Stack spacing={4}>
          <Heading size="lg">{product.name}</Heading>

          <Text fontSize="3xl" fontWeight="bold">
            {displayedPrice?.toFixed(2)} €
          </Text>

          {/* 🟦 VARIANTES INTERNAS */}
          {!isAliExpress && product?.variants && (
            <HStack spacing={4}>
              {product.variants.sizes?.length > 0 && (
                <FormControl>
                  <FormLabel>Talla</FormLabel>
                  <Select
                    size="sm"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {product.variants.sizes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </FormControl>
              )}

              {product.variants.colors?.length > 0 && (
                <FormControl>
                  <FormLabel>Color</FormLabel>
                  <Select
                    size="sm"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {product.variants.colors.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </FormControl>
              )}
            </HStack>
          )}

          {/* 🟥 VARIANTES ALIEXPRESS */}
          {isAliExpress &&
            Object.entries(aliAttributes).map(([attr, values]) => (
              <FormControl key={attr}>
                <FormLabel>{attr}</FormLabel>
                <Select
                  size="sm"
                  value={selectedAttributes[attr] || ""}
                  onChange={(e) =>
                    setSelectedAttributes((prev) => ({
                      ...prev,
                      [attr]: e.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {values.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </FormControl>
            ))}

          <HStack>
            <NumberInput
              size="sm"
              min={1}
              value={quantity}
              onChange={(v) => setQuantity(v)}
              w="100px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>

            <Button
              bg="actionPrimary"
              color="textInverse"
              _hover={{ bg: "actionPrimaryHover" }}
              flex="1"
              onClick={handleAddToCart}
              isDisabled={!canAddToCart}
            >
              Añadir al carrito
            </Button>
          </HStack>

           {/* Bloque para ir al diseñador avanzado */}
            {isCustomizable && (
              <Box
                mt={4}
                p={3}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="purple.300"
                bg={customBoxBg}
              >
                <Heading size="sm" mb={2}>
                  Diseña tu producto
                </Heading>
                <Text fontSize="xs" color="gray.600" mb={3}>
                  Este producto admite personalización avanzada. Puedes añadir
                  texto, imágenes y ver una previsualización 360º.
                </Text>
                <Button
                  as={Link}
                  to={`/personalizar/${product._id}`}
                  state={{
                    variant: canAddToCart
                      ? normalizeVariant(product, {
                          size: selectedSize || null,
                          color: selectedColor || null,
                        })
                      : null,
                  }}
                  size="sm"
                  colorScheme="purple"
                  isDisabled={!canAddToCart}
                >
                  Abrir diseñador avanzado
                </Button>
              </Box>
            )}

          {/* ENVÍO */}
          <Box
            p={4}
            borderRadius="lg"
            bg="infoSurface"
            border="1px solid"
            borderColor="borderSubtle"
          >
            <Text fontWeight="semibold">🚚 Envío</Text>
            <Text fontSize="sm">
              El precio y el plazo de entrega se calcularán en el checkout.
            </Text>
            <Text fontSize="xs" color="textMuted">
              Puede variar según la dirección de envío (Península, Islas o internacional).
            </Text>
          </Box>


          {/* DEVOLUCIONES */}
          <Box p={4} borderRadius="lg" bg="infoSurface">
                <Text fontWeight="semibold">🔄 Devoluciones</Text>
                <Text fontSize="xs" color="textMuted">
                  Consulta las condiciones de devolución antes de finalizar la compra.
                </Text>
              </Box>
            </Stack>
          </Box>

      <Divider my={10} />

      {product.description && (
        <Box>
          <Heading size="sm" mb={2}>
            Descripción
          </Heading>
          <Text fontSize="sm" color="textMuted">
            {product.description}
          </Text>
        </Box>
      )}
    </Box>
  );
}

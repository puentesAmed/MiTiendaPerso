/*import { Link as RouterLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Image,
  Text,
  Heading,
  Button,
  Stack,
  HStack,
  Badge,
  useColorModeValue,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { useCart } from "../hooks/useCart";

const PRODUCTS_SCROLL_KEY = "products_scroll_y";

export function ProductCard({ product }) {
  console.log("🧪 ProductCard product:", product);

  const { addItem, items } = useCart();

  const cardBg = useColorModeValue("white", "gray.800");
  const cardBorder = useColorModeValue("gray.200", "gray.700");

  const rememberProductsScroll = () => {
    sessionStorage.setItem(PRODUCTS_SCROLL_KEY, String(window.scrollY || 0));
  };

  const getProductsReturnState = () => ({
    fromProducts: true,
    scrollY: window.scrollY || 0,
    productId,
  });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();


  /*const handleAddToCart = () => {
    addItem({ product, quantity: 1, variant: null, customization: null });
  };*/
  /*

  const hasSizeVariants = product?.variants?.sizes?.length > 0;
  const hasColorVariants = product?.variants?.colors?.length > 0;
  const hasVariants = hasSizeVariants || hasColorVariants;


  const handleAddToCart = () => {

    // 🔴 Si tiene variantes → ir al detalle
    if (hasVariants) {
      navigate(`/productos/${product._id}`);
      return;
    }

    // 🟢 Producto normal → añadir al carrito
    const isFirstItem = items.length === 0;

    addItem({ product, quantity: 1, variant: null, customization: null });

    if (isFirstItem) {
      onOpen();
    }
  };


  const isCustomizable = !!product?.customizable;

  const getDisplayPrice = (product) => {
  // 🟢 Productos AliExpress (nuevo sistema)
  if (product?.price && typeof product.price === "object") {
    if (typeof product.price.final === "number") {
      return `${product.price.final.toFixed(2)} ${product.price.currency ?? "€"}`;
    }
  }

  // 🔵 Productos internos (sistema antiguo)
  if (typeof product.price === "number") {
    return `${product.price.toFixed(2)} €`;
  }

  return "Precio no disponible";
};


  return (
    <Box
      data-product-id={productId}
      borderWidth="1px"
      borderRadius="xl"
      overflow="hidden"
      bg={cardBg}
      borderColor={cardBorder}
      boxShadow="sm"
      _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
      transition="all 0.15s ease"
    >
      <Link as={RouterLink} to={`/productos/${product._id}`}>
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            objectFit="contain"
            onError={(e) => {
              e.currentTarget.src = "/images/fallback-product.png";
            }}
            w="100%"
            h="180px"
          />
        )}
      </Link>

      <Stack p={4} spacing={2}>
        <HStack justify="space-between" align="flex-start">
          <Link
            as={RouterLink}
            to={`/productos/${product._id}`}
            _hover={{ textDecoration: "none", color: "blue.400" }}
          >
            <Heading as="h3" fontSize="lg">
              {product.name}
            </Heading>
          </Link>

          <Stack spacing={1} align="flex-end">
            {product.category && (
              <Badge colorScheme="blue" fontSize="0.7rem">
                {product.category}
              </Badge>
            )}
            {isCustomizable && (
              <Badge colorScheme="purple" fontSize="0.65rem">
                Personalizable
              </Badge>
            )}
          </Stack>
        </HStack>

        {product.description && (
          <Text fontSize="sm" noOfLines={2} color="gray.500">
            {product.description}
          </Text>
        )}

        <HStack justify="space-between" mt={2}>
          <Text fontWeight="bold" fontSize="lg">
            {getDisplayPrice(product)}
          </Text>


          <Text
            fontSize="xs"
            color={product.stock > 0 ? "green.400" : "red.400"}
          >
            {product.stock > 0 ? `Stock: ${product.stock}` : "Sin stock"}
          </Text>
        </HStack>

        <HStack mt={2} spacing={2}>
          <Button
            flex="1"
            size="sm"
            colorScheme="blue"
            onClick={handleAddToCart}
            isDisabled={product.stock <= 0}
          >
            Añadir al carrito
          </Button>

          {isCustomizable && (
            <Button
              flex="1"
              size="sm"
              variant="outline"
              as={RouterLink}
              to={`/personalizar/${product._id}`}
            >
              Personalizar
            </Button>
          )}
        </HStack>
      </Stack>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Producto añadido</ModalHeader>
          <ModalBody>
            El producto <strong>{product.name}</strong> se ha añadido al carrito.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Seguir comprando
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => {
                onClose();
                navigate("/carrito");
              }}
            >
              Ir al carrito
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}
*/

import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Flex,
  Text,
  Heading,
  Button,
  Stack,
  Badge,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { useCart } from "../hooks/useCart";
import { ProductImage } from "./ui/ProductImage";
import { Price } from "./ui/Price";

const PRODUCTS_SCROLL_KEY = "products_scroll_y";

export function ProductCard({ product }) {
  // console.log("🧪 ProductCard product:", product);

  const { addItem, items } = useCart();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  const rememberProductsScroll = () => {
    sessionStorage.setItem(PRODUCTS_SCROLL_KEY, String(window.scrollY || 0));
  };

  const getProductsReturnState = () => ({
    fromProducts: true,
    scrollY: window.scrollY || 0,
    productId,
  });

  // ✅ ID único compatible (backend viejo y nuevo)
  const productId = product?.id || product?._id;

  // ✅ Campos compatibles (por si algún producto viene con title en vez de name)
  const name = product?.name || product?.title || "Producto";
  const description = product?.description || "";
  const category = product?.category;

  // ✅ Imagen compatible
  const mainImage =
    product?.image ||
    (Array.isArray(product?.images) && product.images.length > 0
      ? product.images[0]
      : null);

  // ✅ Personalización (internos)
  const isCustomizable = !!product?.customizable;

  /**
   * ✅ DETECCIÓN DE VARIANTES
   * - NUEVO (AliExpress/normalizado): product.variants es Array (cada item es una variante vendible)
   * - ANTIGUO (internos): product.variants.sizes / colors
   */
  const hasNewVariantsArray = Array.isArray(product?.variants);
  const hasOldSizeVariants = product?.variants?.sizes?.length > 0;
  const hasOldColorVariants = product?.variants?.colors?.length > 0;

  const hasVariants = hasNewVariantsArray
    ? product.variants.length > 0
    : hasOldSizeVariants || hasOldColorVariants;

  // ✅ Disponibilidad / stock
  const availableVariantsCount = hasNewVariantsArray
    ? product.variants.filter(v => v?.available !== false).length // default: true si no viene
    : null;

  const isAvailable = hasNewVariantsArray
    ? availableVariantsCount > 0
    : (typeof product?.stock === "number" ? product.stock > 0 : true);

  const availabilityLabel = hasNewVariantsArray
    ? isAvailable
      ? `Disponibles: ${availableVariantsCount}`
      : "Sin stock"
    : typeof product?.stock === "number" && product.stock > 0
      ? `Stock: ${product.stock}`
      : "Sin stock";

  const handleAddToCart = () => {
    // 🔴 Si tiene variantes → ir al detalle para elegir variante
    if (hasVariants) {
      rememberProductsScroll();
      navigate(`/productos/${productId}`, { state: getProductsReturnState() });
      return;
    }

    // 🟢 Producto simple → añadir al carrito
    const isFirstItem = items.length === 0;
    addItem({ product, quantity: 1, variant: null, customization: null });

    if (isFirstItem) onOpen();
  };

  return (
    <>
      <Card
        data-product-id={productId}
        h="100%"
        overflow="hidden"
        transition="box-shadow 0.15s ease, border-color 0.15s ease"
        _hover={{ boxShadow: "md", borderColor: "borderDefault" }}
      >
        <CardBody p={0} display="flex" flexDirection="column">
          <Link
            as={RouterLink}
            to={`/productos/${productId}`}
            state={getProductsReturnState()}
            onClick={rememberProductsScroll}
            display="block"
            _focusVisible={{ outline: "2px solid", outlineColor: "focusRing", outlineOffset: "-2px" }}
          >
            <ProductImage src={mainImage} alt={name} />
          </Link>

          <Stack p={4} spacing={3} flex="1">
            <Flex
              direction={{ base: "column", md: "row" }}
              justify="space-between"
              align={{ base: "stretch", md: "flex-start" }}
              gap={2}
            >
              <Link
                as={RouterLink}
                to={`/productos/${productId}`}
                state={getProductsReturnState()}
                onClick={rememberProductsScroll}
                minW={0}
                _hover={{ textDecoration: "none", color: "actionPrimary" }}
                _focusVisible={{ outline: "2px solid", outlineColor: "focusRing", outlineOffset: "2px" }}
              >
                <Heading as="h3" fontSize="lg" overflowWrap="anywhere">
                  {name}
                </Heading>
              </Link>

              <Flex gap={1} wrap="wrap" justify={{ base: "flex-start", md: "flex-end" }}>
                {category && <Badge variant="neutral">{category}</Badge>}
                {isCustomizable && <Badge variant="info">Personalizable</Badge>}
                {hasNewVariantsArray && <Badge variant="neutral">Variantes</Badge>}
              </Flex>
            </Flex>

            {description && (
              <Text fontSize="sm" noOfLines={3} color="textMuted">
                {description}
              </Text>
            )}

            <Stack
              direction={{ base: "column", md: "row" }}
              align={{ base: "flex-start", md: "center" }}
              justify="space-between"
              gap={2}
            >
              <Price value={product?.price} />
              <Badge variant={isAvailable ? "success" : "error"}>
                {availabilityLabel}
              </Badge>
            </Stack>

            <Stack direction={{ base: "column", md: "row" }} spacing={2} mt="auto" pt={1}>
              <Button w="full" flex={{ md: 1 }} onClick={handleAddToCart} isDisabled={!isAvailable}>
                Añadir al carrito
              </Button>

              {isCustomizable && (
                <Button
                  w="full"
                  flex={{ md: 1 }}
                  variant="outline"
                  as={RouterLink}
                  to={hasVariants ? `/productos/${productId}` : `/personalizar/${productId}`}
                >
                  Personalizar
                </Button>
              )}
            </Stack>
          </Stack>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Producto añadido</ModalHeader>
          <ModalBody>
            El producto <strong>{name}</strong> se ha añadido al carrito.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Seguir comprando
            </Button>
            <Button
              onClick={() => {
                onClose();
                navigate("/carrito");
              }}
            >
              Ir al carrito
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

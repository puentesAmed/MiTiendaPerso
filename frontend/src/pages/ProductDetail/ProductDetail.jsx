// src/pages/ProductDetail/ProductDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  useColorModeValue,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Select,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { apiGetProductById } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(null);


  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const customBoxBg = useColorModeValue("purple.50", "purple.900Alpha.200");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetProductById(id);
        if (alive) {
          setProduct(data);
          const imgs = data.images?.length ? data.images : data.image ? [data.image] : [];
          setActiveImage(imgs[0] || null);
        }

      } catch (err) {
        console.error(err);
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      alive = false;
    };
  }, [id]);

  const isCustomizable = !!product?.customizable;

  const requiresSize =
  product?.variants?.sizes?.length > 0;

  const requiresColor =
    product?.variants?.colors?.length > 0;

  const canAddToCart =
    product?.stock > 0 &&
    (!requiresSize || selectedSize) &&
    (!requiresColor || selectedColor);


 /* const images =
    product?.images?.length
      ? product.images
      : product?.image
      ? [product.image]
      : [];*/

  const images = product
    ? [
        ...(product.image ? [product.image] : []),
        ...(Array.isArray(product.images) ? product.images : []),
      ].filter(
        (img, index, self) => self.indexOf(img) === index
      )
    : [];



  const handleAddToCart = () => {
    const qty = Number(quantity) || 1;
    if (
      (product.variants?.sizes?.length && !selectedSize) ||
      (product.variants?.colors?.length && !selectedColor)
    ) {
      alert("Selecciona talla y color antes de añadir al carrito");
      return;
    }

    addItem(
      product,
      qty,
      null,
      { 
        size: selectedSize || null, 
        color: selectedColor || null 
      }
    );

  };

  if (loading) {
    return (
      <Box
        minH="60vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bg} borderRadius="xl" boxShadow="md">
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text color="red.400" fontSize="sm">
          {error || "Producto no encontrado"}
        </Text>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bg} borderRadius="xl" boxShadow="md">
      <Button
        leftIcon={<ArrowBackIcon />}
        size="sm"
        mb={4}
        variant="ghost"
        onClick={() => navigate(-1)}
      >
        Volver
      </Button>

      <Box
        display="flex"
        flexDirection={{ base: "column", md: "row" }}
        gap={6}
        bg={cardBg}
        borderRadius="xl"
        p={4}
      >
        {/* Imagen */}
        <Box flex="1" minW={{ base: "100%", md: "320px" }}>
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product.name}
              borderRadius="lg"
              w="100%"
              h={{ base: "260px", md: "360px" }}
              objectFit="contain"
            />
          ) : (
            <Box
              borderRadius="lg"
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="gray.400"
              h={{ base: "260px", md: "360px" }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="sm"
              color="gray.500"
            >
              Sin imagen
            </Box>
          )}

          {images.length > 1 && (
            <HStack mt={3} spacing={2} justify="center">
              {images.map((img, idx) => (
                <Image
                  key={idx}
                  src={img}
                  boxSize="64px"
                  objectFit="cover"
                  borderRadius="md"
                  cursor="pointer"
                  border={
                    activeImage === img
                      ? "2px solid"
                      : "1px solid"
                  }
                  borderColor={
                    activeImage === img ? "blue.400" : "gray.300"
                  }
                  onClick={() => setActiveImage(img)}
                />
              ))}
            </HStack>
          )}


        </Box>

        {/* Info */}
        <Box flex="2">
          <Stack spacing={3}>
            <HStack justify="space-between" align="flex-start">
              <Box>
                <Heading size="lg">{product.name}</Heading>
                {product.category && (
                  <Badge mt={1} colorScheme="blue" fontSize="0.8rem">
                    {product.category}
                  </Badge>
                )}
              </Box>

              {isCustomizable && (
                <Badge colorScheme="purple" alignSelf="flex-start">
                  Personalizable
                </Badge>
              )}
            </HStack>

            {product.description && (
              <Text fontSize="sm" color="gray.500">
                {product.description}
              </Text>
            )}

            <HStack spacing={6} mt={2}>
              <Text fontSize="2xl" fontWeight="bold">
                {product.price?.toFixed
                  ? product.price.toFixed(2)
                  : product.price}{" "}
                €
              </Text>
              <Text
                fontSize="sm"
                color={product.stock > 0 ? "green.400" : "red.400"}
              >
                {product.stock > 0
                  ? `Stock disponible: ${product.stock}`
                  : "Sin stock"}
              </Text>
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
                  size="sm"
                  colorScheme="purple"
                >
                  Abrir diseñador avanzado
                </Button>
              </Box>
            )}

            {/* Variantes */}
            {(product.variants?.sizes?.length > 0 ||
              product.variants?.colors?.length > 0) && (
              <Box mt={4}>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Opciones del producto
                </Text>

                <HStack spacing={4} align="flex-end" flexWrap="wrap">
                  {product.variants?.sizes?.length > 0 && (
                    <FormControl maxW="160px">
                      <FormLabel fontSize="xs">Talla</FormLabel>
                      <Select
                        size="sm"
                        placeholder="Selecciona"
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                      >
                        {product.variants.sizes.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {product.variants?.colors?.length > 0 && (
                    <FormControl maxW="180px">
                      <FormLabel fontSize="xs">Color</FormLabel>
                      <Select
                        size="sm"
                        placeholder="Selecciona"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                      >
                        {product.variants.colors.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </HStack>
              </Box>
            )}



            {/* Cantidad + carrito */}
            <HStack mt={4} spacing={4}>
              <Box>
                <Text mb={1} fontSize="xs" color="gray.500">
                  Cantidad
                </Text>
                <NumberInput
                  size="sm"
                  min={1}
                  max={product.stock || 99}
                  value={quantity}
                  onChange={(value) => setQuantity(value)}
                  isDisabled={product.stock <= 0}
                  w="120px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>

              {!canAddToCart && (requiresSize || requiresColor) && (
                <Text fontSize="xs" color="red.400">
                  Selecciona {requiresSize && "talla"}{requiresSize && requiresColor && " y "}
                  {requiresColor && "color"} para continuar
                </Text>
              )}


              <Button
                colorScheme="blue"
                onClick={handleAddToCart}
                isDisabled={product.stock <= 0 || !canAddToCart}
              >
                Añadir al carrito
              </Button>
            </HStack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

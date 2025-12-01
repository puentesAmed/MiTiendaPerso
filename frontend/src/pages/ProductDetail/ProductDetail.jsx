// src/pages/ProductDetail/ProductDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { apiGetProduct } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetProduct(id);
        if (isMounted) {
          setProduct(data);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("No se pudo cargar el producto");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleAddToCart = () => {
    const qty = Number(quantity) || 1;
    if (product && qty > 0) {
      addItem(product, qty); // adapta si tu CartContext tiene otra firma
    }
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
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              borderRadius="lg"
              w="100%"
              h={{ base: "260px", md: "360px" }}
              objectFit="cover"
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
        </Box>

        {/* Info */}
        <Box flex="2">
          <Stack spacing={3}>
            <HStack justify="space-between">
              <Heading size="lg">{product.name}</Heading>
              {product.category && (
                <Badge colorScheme="blue" fontSize="0.8rem">
                  {product.category}
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

            {/* Cantidad + añadir al carrito */}
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

              <Button
                colorScheme="blue"
                onClick={handleAddToCart}
                isDisabled={product.stock <= 0}
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

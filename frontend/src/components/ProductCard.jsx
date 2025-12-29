import { Link as RouterLink } from "react-router-dom";
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

export function ProductCard({ product }) {
  console.log("🧪 ProductCard product:", product);

  const { addItem, items } = useCart();

  const cardBg = useColorModeValue("white", "gray.800");
  const cardBorder = useColorModeValue("gray.200", "gray.700");

  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();


  /*const handleAddToCart = () => {
    addItem(product, 1);
  };*/

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

    addItem(product, 1);

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

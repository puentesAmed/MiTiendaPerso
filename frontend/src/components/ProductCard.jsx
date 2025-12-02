import { Link as RouterLink } from "react-router-dom";
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
} from "@chakra-ui/react";
import { useCart } from "../hooks/useCart";

export function ProductCard({ product }) {
  const { addItem } = useCart();

  const cardBg = useColorModeValue("white", "gray.800");
  const cardBorder = useColorModeValue("gray.200", "gray.700");

  const handleAddToCart = () => {
    addItem(product, 1);
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
            onError={(e) => {e.currentTarget.src = "/images/fallback-product.png";}}
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
          {product.category && (
            <Badge colorScheme="blue" fontSize="0.7rem">
              {product.category}
            </Badge>
          )}
        </HStack>

        {product.description && (
          <Text fontSize="sm" noOfLines={2} color="gray.500">
            {product.description}
          </Text>
        )}

        <HStack justify="space-between" mt={2}>
          <Text fontWeight="bold" fontSize="lg">
            {product.price?.toFixed ? product.price.toFixed(2) : product.price} €
          </Text>
          <Text fontSize="xs" color={product.stock > 0 ? "green.400" : "red.400"}>
            {product.stock > 0 ? `Stock: ${product.stock}` : "Sin stock"}
          </Text>
        </HStack>

        <Button
          mt={2}
          size="sm"
          colorScheme="blue"
          onClick={handleAddToCart}
          isDisabled={product.stock <= 0}
        >
          Añadir al carrito
        </Button>
      </Stack>
    </Box>
  );
}

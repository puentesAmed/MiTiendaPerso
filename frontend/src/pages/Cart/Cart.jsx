import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  Image,
  IconButton,
  Button,
  Input,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { useCart } from "../../hooks/useCart";
import { createOrderRequest } from "../../services/orders.service";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Cart() {
  const { items, updateQuantity, removeItem, clearCart, totalAmount } = useCart();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const bg = useColorModeValue("gray.50", "gray.800");
  const cardBg = useColorModeValue("white", "gray.700");

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await createOrderRequest(items);

      if (response.ok) {
        clearCart();
        navigate("/mis-pedidos");
      } else {
        setMessage("No se pudo completar el pedido.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error al enviar pedido. Intenta más tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={{ base: 3, md: 6 }} bg={bg} borderRadius="xl" boxShadow="md">
      <Heading size="lg" mb={4}>
        Tu carrito
      </Heading>

      {items.length === 0 && (
        <Text fontSize="md" color="gray.500">
          El carrito está vacío.
        </Text>
      )}

      <VStack align="stretch" spacing={4}>
        {items.map((item) => (
          <Box
            key={item.productId}
            p={3}
            bg={cardBg}
            borderRadius="lg"
            boxShadow="sm"
          >
            <HStack spacing={4}>
              <Image
                src={item.image || "https://via.placeholder.com/100x100?text=IMG"}
                alt={item.name}
                boxSize="80px"
                borderRadius="md"
                objectFit="cover"
              />

              <VStack align="start" flex="1">
                <Text fontWeight="bold">{item.name}</Text>
                <Text fontSize="sm" color="gray.500">
                  Precio: {item.price} €
                </Text>

                <HStack>
                  <Text fontSize="sm">Cantidad:</Text>
                  <Input
                    type="number"
                    size="sm"
                    width="70px"
                    value={item.quantity}
                    min={1}
                    onChange={(e) =>
                      updateQuantity(item.productId, Number(e.target.value))
                    }
                  />
                </HStack>
              </VStack>

              <IconButton
                aria-label="Eliminar"
                icon={<DeleteIcon />}
                colorScheme="red"
                variant="ghost"
                onClick={() => removeItem(item.productId)}
              />
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Resumen */}
      {items.length > 0 && (
        <>
          <Divider my={4} />

          <Box p={4} bg={cardBg} borderRadius="lg" boxShadow="sm">
            <HStack justify="space-between">
              <Text fontWeight="bold">Total:</Text>
              <Text fontSize="xl" fontWeight="bold">
                {totalAmount.toFixed(2)} €
              </Text>
            </HStack>

            {message && (
              <Text color="red.400" mt={2} fontSize="sm">
                {message}
              </Text>
            )}

            <Button
              mt={4}
              colorScheme="blue"
              width="100%"
              onClick={() => navigate("/checkout")}
              isLoading={loading}
            >
              Finalizar pedido
            </Button>

            <Button mt={2} width="100%" variant="ghost" onClick={clearCart}>
              Vaciar carrito
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

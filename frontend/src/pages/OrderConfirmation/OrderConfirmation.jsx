// src/pages/OrderConfirmation/OrderConfirmation.jsx
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Stack,
  Divider,
  Button,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

export function OrderConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Si alguien entra directamente sin pedido
  if (!state || !state.orderId) {
    return (
      <Box maxW="700px" mx="auto" mt={10} p={5}>
        <Alert status="warning">
          <AlertIcon />
          No se ha encontrado ningún pedido.
        </Alert>
        <Button mt={4} onClick={() => navigate("/")}>
          Volver a la tienda
        </Button>
      </Box>
    );
  }

  const { order, orderId, isGuest, email } = state;

  return (
    <Box maxW="800px" mx="auto" mt={10} p={5}>
      <Heading mb={4} color="green.500">
        Pedido creado con éxito
      </Heading>

      <Text mb={3}>
        Tu pedido <strong>#{orderId}</strong> se ha creado correctamente.
      </Text>

      {isGuest && email && (
        <Alert status="info" mb={4}>
          <AlertIcon />
          Hemos enviado los detalles del pedido al email <strong>{email}</strong>.
          Guarda este correo para cualquier consulta.
        </Alert>
      )}

      <Divider my={4} />

      {/* RESUMEN DEL PEDIDO */}
      <Heading size="md" mb={3}>
        Resumen del pedido
      </Heading>

      <Stack spacing={3}>
        {order?.items?.map((item) => (
          <Box key={item.productId}>
            <Text fontWeight="bold">{item.name}</Text>
            <Text fontSize="sm">
              Cantidad: {item.quantity} · Precio: {item.price.toFixed(2)} €
            </Text>
          </Box>
        ))}
      </Stack>

      <Divider my={4} />

      <Text fontWeight="bold">
        Total: {order?.total?.toFixed(2)} €
      </Text>

      {order?.shippingAddress && (
        <>
          <Divider my={4} />
          <Heading size="sm" mb={2}>
            Dirección de envío
          </Heading>
          <Text fontSize="sm">
            {order.shippingAddress.fullName}<br />
            {order.shippingAddress.street}<br />
            {order.shippingAddress.postalCode} {order.shippingAddress.city}<br />
            {order.shippingAddress.state} · {order.shippingAddress.country}
          </Text>
        </>
      )}

      {order?.notes && (
        <>
          <Divider my={4} />
          <Heading size="sm" mb={2}>
            Notas del pedido
          </Heading>
          <Text fontSize="sm">{order.notes}</Text>
        </>
      )}

      <Divider my={6} />

      <Button colorScheme="blue" onClick={() => navigate("/")}>
        Volver a la tienda
      </Button>
    </Box>
  );
}

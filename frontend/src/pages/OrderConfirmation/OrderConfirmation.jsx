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
  useColorModeValue,
} from "@chakra-ui/react";

export function OrderConfirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const cardBg = useColorModeValue("white", "gray.800");
  const mutedText = useColorModeValue("gray.600", "gray.400");
  const successColor = useColorModeValue("green.500", "green.300");
  const infoBg = useColorModeValue("blue.50", "blue.900");

  // 🔒 Acceso directo sin pedido
  if (!state || !state.orderId) {
    return (
      <Box maxW="700px" mx="auto" mt={12} px={4}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          No se ha encontrado ningún pedido.
        </Alert>

        <Button mt={6} onClick={() => navigate("/")}>
          Volver a la tienda
        </Button>
      </Box>
    );
  }

  const {
    order,
    orderId,
    isGuest,
    email,
    emailHasAccount, // 🔑 CLAVE
    paymentInstructions,
  } = state;

  const paymentMethodLabel =
    paymentInstructions?.method === "bank_transfer"
      ? "Transferencia bancaria"
      : "Bizum";

  return (
    <Box maxW="800px" mx="auto" mt={12} px={4}>
      <Box
        bg={cardBg}
        p={6}
        borderRadius="lg"
        boxShadow="md"
        borderWidth="1px"
      >
        {/* CABECERA */}
        <Heading mb={2} color={successColor}>
          Pedido creado con éxito
        </Heading>

        <Text mb={4} color={mutedText}>
          Tu pedido <strong>#{orderId}</strong> se ha creado correctamente.
        </Text>

        {/* INFO INVITADO */}
        {isGuest && email && (
          <Alert status="info" mb={4} borderRadius="md">
            <AlertIcon />
            Hemos enviado los detalles del pedido al email&nbsp;
            <strong>{email}</strong>.
          </Alert>
        )}

        {/* 🟢 CASO 1: INVITADO + EMAIL SIN CUENTA → CTA REGISTRO */}
        {isGuest && email && !emailHasAccount && (
          <Box
            mt={4}
            p={4}
            borderRadius="md"
            borderWidth="1px"
            bg={infoBg}
          >
            <Heading size="sm" mb={2}>
              ¿Quieres crear una cuenta?
            </Heading>

            <Text fontSize="sm" mb={3} color={mutedText}>
              Crear una cuenta te permitirá:
            </Text>

            <Stack fontSize="sm" spacing={1} mb={4}>
              <Text>• Consultar el estado de tus pedidos</Text>
              <Text>• Guardar tus diseños personalizados</Text>
              <Text>• Mantener tu historial de compras</Text>
            </Stack>

            <Button
              colorScheme="blue"
              onClick={() =>
                navigate("/register", {
                  state: {
                    fromGuest: true,
                    email,
                  },
                })
              }
            >
              Crear cuenta y vincular pedidos
            </Button>
          </Box>
        )}

        {/* 🟢 CASO 2: INVITADO + EMAIL CON CUENTA EXISTENTE */}
        {isGuest && email && emailHasAccount && (
          <Alert status="success" mt={4} borderRadius="md">
            <AlertIcon />
            Este pedido aparecerá automáticamente en tu cuenta cuando inicies
            sesión.
          </Alert>
        )}

        <Divider my={6} />

        {/* RESUMEN */}
        <Heading size="md" mb={3}>
          Resumen del pedido
        </Heading>

        <Stack spacing={3}>
          {order?.items?.map((item) => (
            <Box key={item.productId}>
              <Text fontWeight="semibold">{item.name}</Text>
              <Text fontSize="sm" color={mutedText}>
                Cantidad: {item.quantity} · Precio:{" "}
                {item.price.toFixed(2)} €
              </Text>
            </Box>
          ))}
        </Stack>

        <Divider my={4} />

        <Text fontWeight="bold">
          Total: {order?.total?.toFixed(2)} €
        </Text>

        {paymentInstructions && (
          <Box mt={5} p={4} borderWidth="1px" borderRadius="md" bg={infoBg}>
            <Heading size="sm" mb={3}>
              Pago pendiente
            </Heading>
            <Stack spacing={2} fontSize="sm">
              <Text><strong>Método:</strong> {paymentMethodLabel}</Text>
              <Text>
                <strong>Importe:</strong>{" "}
                {paymentInstructions.amount.toFixed(2)} {paymentInstructions.currency}
              </Text>
              <Text>
                <strong>Concepto:</strong> {paymentInstructions.reference}
              </Text>
              {paymentInstructions.method === "bizum" ? (
                <Text>
                  <strong>Destinatario:</strong> {paymentInstructions.recipient}
                </Text>
              ) : (
                <>
                  <Text>
                    <strong>Titular:</strong> {paymentInstructions.accountHolder}
                  </Text>
                  <Text><strong>IBAN:</strong> {paymentInstructions.iban}</Text>
                </>
              )}
              <Text>{paymentInstructions.instructions}</Text>
              <Text fontWeight="semibold">
                Realiza el pago indicando la referencia y espera la confirmación
                manual del pedido.
              </Text>
            </Stack>
          </Box>
        )}

        {/* DIRECCIÓN */}
        {order?.shippingAddress && (
          <>
            <Divider my={4} />
            <Heading size="sm" mb={2}>
              Dirección de envío
            </Heading>
            <Text fontSize="sm" color={mutedText}>
              {order.shippingAddress.fullName}
              <br />
              {order.shippingAddress.street}
              <br />
              {order.shippingAddress.postalCode}{" "}
              {order.shippingAddress.city}
              <br />
              {order.shippingAddress.state} ·{" "}
              {order.shippingAddress.country}
            </Text>
          </>
        )}

        {/* NOTAS */}
        {order?.notes && (
          <>
            <Divider my={4} />
            <Heading size="sm" mb={2}>
              Notas del pedido
            </Heading>
            <Text fontSize="sm" color={mutedText}>
              {order.notes}
            </Text>
          </>
        )}

        <Divider my={6} />

        <Button colorScheme="blue" onClick={() => navigate("/")}>
          Volver a la tienda
        </Button>
      </Box>
    </Box>
  );
}

/*
// src/pages/Checkout/Checkout.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { createOrderRequest } from "../../services/orders.service";

import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  RadioGroup,
  Radio,
  Card,
  CardBody,
  Flex,
  HStack,
  VStack,
  Input,
  IconButton,
  Alert,
  AlertIcon,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@chakra-ui/react";

import { DeleteIcon } from "@chakra-ui/icons";

export function Checkout() {
  const { user } = useAuth();
  const { items, totalAmount, clearCart, updateQuantity, removeItem } = useCart();
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

 
  useEffect(() => {
    if (!user) {
      nav("/login", { replace: true, state: { from: "/checkout" } });
    }
  }, [user]);

  if (!user) return null;

 
  const productNeedsCustomization = (item) => {
    // Si no requiere personalización → está OK
    if (!item.requiresDesign) return false;

    // Si no existe customization → FALTA
    if (!item.customization) return true;

    // Debe ser del tipo "designer"
    if (item.customization.type !== "designer") return true;

    const design = item.customization.design;
    if (!design) return true;

    const sides = design.elementsBySide;
    if (!sides) return true;

    const front = Array.isArray(sides.front) ? sides.front : [];
    const back = Array.isArray(sides.back) ? sides.back : [];

    // ✔ Tiene que haber al menos un elemento
    const hasElements = front.length > 0 || back.length > 0;

    return !hasElements;
  };

 
  const handleConfirmOrder = async () => {
    setError("");
    setSuccessMsg("");

    if (!items.length) {
      setError("El carrito está vacío");
      return;
    }

    const pending = items.find((i) => productNeedsCustomization(i));

    if (pending) {
      setPendingProduct(pending);
      setModalOpen(true);
      return;
    }

    await processOrder();
  };

 
  const processOrder = async () => {
    try {
      setLoading(true);

      const response = await createOrderRequest(items, paymentMethod);

      if (!response.ok) {
        setError(response.message || "No se pudo procesar el pedido");
        return;
      }

      clearCart();
      setSuccessMsg(`Pedido nº ${response.orderId} creado correctamente.`);
      nav("/mis-pedidos");
    } catch (err) {
      setError(err.message || "Error inesperado en el servidor");
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <Box maxW="900px" mx="auto" mt={10} p={5}>
      <Heading mb={3}>Checkout</Heading>
      <Text mb={6} color="gray.600">
        Revisa tu pedido antes de confirmarlo.
      </Text>

      {!items.length && (
        <Alert status="info" borderRadius="md" mb={4}>
          <AlertIcon />
          No hay productos en el carrito.
        </Alert>
      )}

      <Stack spacing={4}>
        {items.map((it) => (
          <Card key={it.productId} boxShadow="md">
            <CardBody>
              <Flex
                direction={{ base: "column", md: "row" }}
                justify="space-between"
                align={{ md: "center" }}
                gap={4}
              >
                <VStack align="start" spacing={1} flex={1}>
                  <Heading size="sm">{it.name}</Heading>
                  <Text fontSize="sm" color="gray.600">
                    Precio: {it.price.toFixed(2)} €
                  </Text>

                  {productNeedsCustomization(it) ? (
                    <Text fontSize="sm" color="red.500">
                      Falta personalización
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="green.500">
                      Personalizado ✓
                    </Text>
                  )}
                </VStack>

                <HStack spacing={3}>
                  <Input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateQuantity(it.productId, e.target.value)}
                    width="70px"
                  />

                  <Text fontWeight="bold">
                    {(it.price * it.quantity).toFixed(2)} €
                  </Text>

                  <IconButton
                    aria-label="Eliminar"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => removeItem(it.productId)}
                  />
                </HStack>
              </Flex>
            </CardBody>
          </Card>
        ))}
      </Stack>

      {items.length > 0 && (
        <>
          <Divider my={6} />

          <Box mb={5}>
            <Heading size="sm" mb={2}>
              Método de pago
            </Heading>

            <RadioGroup value={paymentMethod} onChange={setPaymentMethod}>
              <Stack spacing={2}>
                <Radio value="card">Tarjeta de crédito/débito</Radio>
                <Radio value="paypal">PayPal (simulado)</Radio>
                <Radio value="cod">Contra reembolso</Radio>
              </Stack>
            </RadioGroup>
          </Box>

          <Box
            p={4}
            borderWidth="1px"
            borderRadius="md"
            bg="gray.50"
            textAlign="right"
          >
            <Text fontSize="lg" fontWeight="bold">
              Total: {totalAmount.toFixed(2)} €
            </Text>
          </Box>
        </>
      )}

      {error && (
        <Alert status="error" borderRadius="md" mt={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert status="success" borderRadius="md" mt={4}>
          <AlertIcon />
          {successMsg}
        </Alert>
      )}

      <Button
        colorScheme="blue"
        size="lg"
        w="100%"
        mt={6}
        isDisabled={loading || !items.length}
        isLoading={loading}
        onClick={handleConfirmOrder}
      >
        Confirmar pedido y pagar
      </Button>

      
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Falta personalizar un producto</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              El producto <strong>{pendingProduct?.name}</strong> requiere ser
              personalizado antes de finalizar el pedido.
            </Text>
            <Text mt={3}>
              Puedes personalizarlo ahora o continuar sin personalizarlo.
            </Text>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => {
                setModalOpen(false);
                nav(`/personalizar/${pendingProduct.productId}`);
              }}
            >
              Personalizar ahora
            </Button>

            <Button variant="ghost" onClick={() => { setModalOpen(false); processOrder(); }}>
              Continuar sin personalizar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
*/
// src/pages/Checkout/Checkout.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { createOrderRequest } from "../../services/orders.service";

import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  RadioGroup,
  Radio,
  Card,
  CardBody,
  Flex,
  HStack,
  VStack,
  Input,
  IconButton,
  Alert,
  AlertIcon,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@chakra-ui/react";

import { DeleteIcon } from "@chakra-ui/icons";

export function Checkout() {
  const { user } = useAuth();
  const { items, totalAmount, clearCart, updateQuantity, removeItem } = useCart();
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  useEffect(() => {
    if (!user) {
      nav("/login", { replace: true, state: { from: "/checkout" } });
    }
  }, [user]);

  if (!user) return null;

  // 🔥 DETECCIÓN REAL de productos que requieren personalización
  const productNeedsCustomization = (item) => {
    if (!item.customizable) return false; // No requiere nada

    if (!item.customization) return true;

    if (item.customization.type !== "designer") return true;

    const design = item.customization.design;
    if (!design) return true;

    const sides = design.elementsBySide || {};
    const front = Array.isArray(sides.front) ? sides.front : [];
    const back = Array.isArray(sides.back) ? sides.back : [];

    return front.length === 0 && back.length === 0;
  };

  const handleConfirmOrder = async () => {
    setError("");
    setSuccessMsg("");

    if (!items.length) {
      setError("El carrito está vacío");
      return;
    }

    const notCustomized = items.find((i) => productNeedsCustomization(i));
    if (notCustomized) {
      setPendingProduct(notCustomized);
      setModalOpen(true);
      return;
    }

    await processOrder();
  };

  const processOrder = async () => {
    try {
      setLoading(true);

      const data = await createOrderRequest(items, paymentMethod);

      if (!data.ok) {
        setError(data.message || "Error al procesar pedido");
        return;
      }

      clearCart();
      setSuccessMsg(`Pedido nº ${data.orderId} creado correctamente.`);
      nav("/mis-pedidos");
    } catch (err) {
      console.error("Error procesando pedido:", err);
      setError("Error inesperado al procesar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="900px" mx="auto" mt={10} p={5}>
      <Heading mb={3}>Checkout</Heading>

      <Stack spacing={4}>
        {items.map((it) => (
          <Card key={it.productId} boxShadow="md">
            <CardBody>
              <Flex
                direction={{ base: "column", md: "row" }}
                justify="space-between"
                align={{ md: "center" }}
                gap={4}
              >
                <HStack>
                  <img
                    src={it.image || "/no-image.png"}
                    width="70"
                    onError={(e) => (e.target.src = "/no-image.png")}
                    style={{ borderRadius: "6px" }}
                  />

                  <VStack align="start" spacing={1}>
                    <Heading size="sm">{it.name}</Heading>
                    <Text fontSize="sm" color="gray.400">
                      Precio: {it.price.toFixed(2)} €
                    </Text>

                    {productNeedsCustomization(it) ? (
                      <Text fontSize="sm" color="red.400">
                        Falta personalización
                      </Text>
                    ) : it.customizable ? (
                      <Text fontSize="sm" color="green.400">
                        Personalizado ✓
                      </Text>
                    ) : (
                      <Text fontSize="sm" color="gray.500">
                        No requiere personalización
                      </Text>
                    )}
                  </VStack>
                </HStack>

                <HStack spacing={3}>
                  <Input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateQuantity(it.productId, e.target.value)}
                    width="70px"
                  />

                  <Text fontWeight="bold">
                    {(it.price * it.quantity).toFixed(2)} €
                  </Text>

                  <IconButton
                    aria-label="Eliminar"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => removeItem(it.productId)}
                  />
                </HStack>
              </Flex>
            </CardBody>
          </Card>
        ))}
      </Stack>

      <Divider my={6} />

      <Text fontSize="lg" fontWeight="bold">
        Total: {totalAmount.toFixed(2)} €
      </Text>

      {error && (
        <Alert mt={4} status="error">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert mt={4} status="success">
          <AlertIcon />
          {successMsg}
        </Alert>
      )}

      <Button
        mt={6}
        width="100%"
        colorScheme="blue"
        size="lg"
        onClick={handleConfirmOrder}
        isLoading={loading}
      >
        Confirmar pedido y pagar
      </Button>

      {/* Modal de aviso */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Falta personalización</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              El producto <strong>{pendingProduct?.name}</strong> debe
              personalizarse antes de completar el pedido.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => {
                setModalOpen(false);
                nav(`/personalizar/${pendingProduct.productId}`);
              }}
            >
              Personalizar ahora
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

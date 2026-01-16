// src/pages/Checkout/Checkout.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink} from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { createOrderRequest } from "../../services/orders.service";
import { CustomizationInlineSummary } from "../../components/checkout/CustomizationInlineSummary";
//import { createPayment } from "../../services/payments.service";

import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Checkbox,
  Textarea,
  Link,
  FormControl,
  FormLabel,
  FormErrorMessage
} from "@chakra-ui/react";
import { loadGuestSession, saveGuestSession } from "../../services/guestSession.service";
import { GuestSessionNotice } from "../../components/checkout/GuestSessionNotice";
import { useColorModeValue } from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { checkEmailExists } from "../../services/auth.service";
//import { createMoneiPayment } from "../../services/payments.service";


const GUEST_KEY = "guest_id";
//const CHECKOUT_DRAFT_KEY = "checkout_draft_v1";

function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function Checkout() {
  const { user } = useAuth();
  const { items, totalAmount, clearCart, updateQuantity, removeItem } = useCart();
  const nav = useNavigate();
  const session = loadGuestSession();

  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  //const [paymentMethod] = useState("card");
  const [checkoutHydrated, setCheckoutHydrated] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null);// mirar


  
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [emailHasAccount, setEmailHasAccount] = useState(false);
  // Control de estructura básica de email
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  // --- ENVÍO ---
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");


  const [shippingAddress, setShippingAddress] = useState({
    fullName: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "España",
  });

  const [useSameBilling, setUseSameBilling] = useState(true);
  const [billingAddress, setBillingAddress] = useState({ ...shippingAddress });
  const [notes, setNotes] = useState("");

  const isGuestEmailInvalid =
  !user &&
  attemptedSubmit &&
  (!guestEmail || !EMAIL_REGEX.test(guestEmail));


  // ✅ Comprobar si el email de invitado ya tiene cuenta
  useEffect(() => {
    if (!guestEmail) return;

    const t = setTimeout(async () => {
      try {
        const exists = await checkEmailExists(guestEmail);
        setEmailHasAccount(exists);
      } catch {
        setEmailHasAccount(false);
      }
    }, 500);

    return () => clearTimeout(t);
  }, [guestEmail]);
  
  // 💾 Guardar borrador del checkout automáticamente
 
  useEffect(() => {
    if (!checkoutHydrated) return;
    saveGuestSession({
      
      checkoutDraft: {
        guestEmail,
        shippingAddress,
        billingAddress,
        useSameBilling,
        notes,
      },
    });
  }, [guestEmail, shippingAddress, billingAddress, useSameBilling, notes, checkoutHydrated]);

  
  // 🔁 Restaurar borrador del checkout (volver del diseñador)
  
  useEffect(() => {
    const session = loadGuestSession();
    if (session?.checkoutDraft) {
      const d = session.checkoutDraft;
      if (d.guestEmail) setGuestEmail(d.guestEmail);
      if (d.shippingAddress) setShippingAddress(d.shippingAddress);
      if (d.billingAddress) setBillingAddress(d.billingAddress);
      if (typeof d.useSameBilling === "boolean") setUseSameBilling(d.useSameBilling);
      if (d.notes) setNotes(d.notes);
    }
    
    setCheckoutHydrated(true);
  }, []);
  
  useEffect(() => {
    if (!orderCreated) return;

    nav("/confirmacion-pedido", {
      state: orderCreated,
    });
  }, [orderCreated, nav]);



  
  // --- ENVÍO ---
  useEffect(() => {
    if (
      !isShippingAddressValid() ||
      !items.length ||
      loading // ⬅️ NUEVO
    ) {
      setShippingQuote(null);
      return;
    }

    


    const controller = new AbortController();

    const fetchShippingQuote = async () => {
      try {
        setShippingLoading(true);
        setShippingError("");

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/shipping/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
            })),
            shippingAddress,
          }),
          signal: controller.signal,
        });

        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "Error envío");

        setShippingQuote(data.quote);
      } catch (err) {
        if (err.name !== "AbortError") {
          setShippingError("No se pudo calcular el envío");
          setShippingQuote(null);
        }
      } finally {
        setShippingLoading(false);
      }
    };

    fetchShippingQuote();
    return () => controller.abort();
  }, [shippingAddress, items]);


  const [modalOpen, setModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  const productNeedsCustomization = (item) => {
    if (!item.customizable) return false;
    if (!item.customization) return true;
    if (item.customization.type !== "designer") return true;
    const design = item.customization.design;
    if (!design) return true;
    const sides = design.elementsBySide || {};
    const front = Array.isArray(sides.front) ? sides.front : [];
    const back = Array.isArray(sides.back) ? sides.back : [];
    return front.length === 0 && back.length === 0;
  };

  const isShippingAddressValid = () => {
    return (
      shippingAddress.fullName.trim() &&
      shippingAddress.street.trim() &&
      shippingAddress.city.trim() &&
      shippingAddress.state.trim() &&
      shippingAddress.postalCode.trim()
    );
  };


  const handleConfirmOrder = async () => {
    setError("");
    setSuccessMsg("");
    setAttemptedSubmit(true);


    if (!items.length) {
      setError("El carrito está vacío");
      return;
    }

    if (!user && !EMAIL_REGEX.test(guestEmail)) {
      setError("El email no tiene un formato válido");
      return;
    }


    if (!acceptedTerms) {
      setError("Debes aceptar los Términos y Condiciones para continuar");
      return;
    }

    if (!isShippingAddressValid()) {
      setError("Debes completar todos los datos de la dirección de envío");
      return;
    }



    const notCustomized = items.find((i) => productNeedsCustomization(i));
    if (notCustomized) {
      setPendingProduct(notCustomized);
      setModalOpen(true);
      return;
    }

    if (!shippingQuote) {
      setError("No se ha podido calcular el envío. Revisa la dirección.");
      return;
    }


    await processOrder();
  };

  const processOrder = async () => {
    console.log("🚚 shippingQuote enviado:", shippingQuote);
    if (loading) return; // ⛔ evita doble ejecución

    try {
      setLoading(true);

      const orderTotal = totalAmount + (shippingQuote.price || 0);

      const resolvedEmail = user ? user.email : guestEmail;
      const resolvedGuestId = user ? null : getGuestId();

      if (!resolvedEmail) {
        throw new Error("No se ha podido resolver el email del pedido");
      }

      const data = await createOrderRequest(items, {
        guestId: resolvedGuestId,
        email: resolvedEmail,
        shippingAddress,
        billingAddress: useSameBilling ? shippingAddress : billingAddress,
        notes,
        shipping: shippingQuote,
        total: Number(orderTotal.toFixed(2)),
      });

      

      if (!data.ok) {
        setError(data.message || "Error al procesar pedido");
        return;
      }

      /*// 🔴 PASO 4: INICIAR PAGO CON MONEI
      const payment = await createMoneiPayment(data.orderId);

      if (!payment?.ok || !payment.paymentUrl) {
        setError("No se pudo iniciar el pago");
        return;
      }

      // 🔁 Redirigir a MONEI
      window.location.href = payment.paymentUrl;
      return;


      */

      

      

      /*clearCart();
      localStorage.removeItem("guest_session_v1");

      setSuccessMsg(`Pedido nº ${data.orderId} creado correctamente.`);
      setShippingQuote(null);

      //nav("/mis-pedidos");
      nav("/confirmacion-pedido", {
        state: {
          order: data.order,
          orderId: data.orderId,
          isGuest: !user,
          email: !user ? guestEmail : null,
          emailHasAccount,
        },
      });
      setOrderCreated({
        order: data.order,
        orderId: data.orderId,
        isGuest: !user,
        email: !user ? guestEmail : null,
        emailHasAccount,
      });
      
      // Limpieza ligera, SIN desmontar UI crítica
      /*setTimeout(() => {
        clearCart();
        localStorage.removeItem("guest_session_v1");
      }, 0);*/

    // 1️ ⃣ Navega PRIMERO 
    setSuccessMsg(`Pedido nº ${data.orderId} creado correctamente.`); 
    nav("/confirmacion-pedido", { 
      replace: true, 
      state: { 
        order: data.order, 
        orderId: data.orderId, 
        isGuest: !user,
        email: !user ? guestEmail : null, 
        emailHasAccount, 
      }, 
    }); 
    
    // 2️ ⃣ Limpia el carrito DESPUÉS (fuera del ciclo de render) 
    
    setTimeout(() => { 
      clearCart(); 
      localStorage.removeItem("guest_session_v1"); 
    }, 0);

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

     
      {!user && (
        <>
          <FormControl isInvalid={isGuestEmailInvalid} isRequired mb={2}>
            <Input
              type="email"
              placeholder="Email para recibir el pedido"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value.toLowerCase())}
            />
            {isGuestEmailInvalid && (
              <Text fontSize="xs" color="red.400" mt={1}>
                Introduce un email válido (ej: nombre@correo.com)
              </Text>
            )}

          </FormControl>

          {emailHasAccount && (
            <Alert status="info" mt={2} borderRadius="md">
              <AlertIcon />
              Este email ya tiene una cuenta.
              <Button
                ml={3}
                size="sm"
                variant="link"
                colorScheme="blue"
                onClick={() =>
                  nav("/login", {
                    state: { email: guestEmail },
                  })
                }
              >
                Iniciar sesión
              </Button>
            </Alert>
          )}

          <GuestSessionNotice />
          {session?.expiresInDays !== undefined && (
            <Text
              fontSize="xs"
              color={
                session.expiresInDays <= 1
                  ? "red.400"
                  : session.expiresInDays <= 3
                  ? "orange.400"
                  : "gray.400"
              }
            >
              {session.expiresInDays > 1 && (
                <>Sesión de invitado válida durante {session.expiresInDays} días.</>
              )}

              {session.expiresInDays === 1 && (
                <>⚠️ Tu sesión de invitado caduca mañana.</>
              )}

              {session.expiresInDays === 0 && (
                <>⚠️ Tu sesión de invitado caduca hoy.</>
              )}
            </Text>
          )}

        </>
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
                <HStack>
                  <img
                    src={it.image || "/no-image.png"}
                    width="70"
                    onError={(e) => (e.target.src = "/no-image.png")}
                    style={{ borderRadius: "6px" }}
                  />
                  <VStack align="start" spacing={1}>
                    <Heading size="sm">{it.name}</Heading>
                    
                    {it.selectedVariant && (
                      <Text fontSize="xs" color="gray.500">
                        {it.selectedVariant.size && <>Talla: {it.selectedVariant.size}</>}
                        {it.selectedVariant.size && it.selectedVariant.color && " · "}
                        {it.selectedVariant.color && <>Color: {it.selectedVariant.color}</>}
                      </Text>
                    )}

                    <Text fontSize="sm" color="gray.400">
                      Precio: {it.price.toFixed(2)} €
                    </Text>
                  </VStack>
                </HStack>

                <HStack spacing={2}>
                  {/* Botón menos */}
                  <Button
                    size="sm"
                    onClick={() =>
                      it.quantity > 1
                        ? updateQuantity(it.productId, it.quantity - 1)
                        : removeItem(it.productId)
                    }
                  >
                    −
                  </Button>

                  {/* Cantidad actual */}
                  <Text minW="24px" textAlign="center">
                    {it.quantity}
                  </Text>

                  {/* Botón más */}
                  <Button
                    size="sm"
                    onClick={() =>
                      updateQuantity(it.productId, it.quantity + 1)
                    }
                  >
                    +
                  </Button>

                  {/* Precio línea */}
                  <Text fontWeight="bold" ml={2}>
                    {(it.price * it.quantity).toFixed(2)} €
                  </Text>

                  {/* Eliminar */}
                  <IconButton
                    aria-label="Eliminar"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => removeItem(it.productId)}
                  />
                </HStack>

              </Flex>

                      
              {it.customization && (
                <CustomizationInlineSummary
                  item={it}
                  onEdit={() => {
                    nav(`/personalizar/${it.productId}`, {
                      state: {
                        customization: it.customization,
                        returnTo: "/checkout",
                      },
                    });
                  }}
                />
              )}
                    

            </CardBody>
          </Card>
        ))}
      </Stack>

      <Divider my={6} />

      <Box mt={4}>
        <Text fontSize="lg" fontWeight="bold">
          Subtotal productos: {totalAmount.toFixed(2)} €
        </Text>

        {!isShippingAddressValid() && (
          <Text fontSize="sm" color="textMuted">
            El coste de envío se calculará al completar la dirección.
          </Text>
        )}

        {shippingLoading && (
          <Text fontSize="sm">Calculando coste de envío…</Text>
        )}

        {shippingError && (
          <Text fontSize="sm" color="red.400">
            {shippingError}
          </Text>
        )}

        {shippingQuote && (
          <>
            <Text fontSize="sm">
              Envío:{" "}
              {shippingQuote.isFree ? (
                <strong>GRATIS</strong>
              ) : (
                `${shippingQuote.price.toFixed(2)} €`
              )}
            </Text>

            <Text fontSize="xs" color="textMuted">
              Entrega estimada: {shippingQuote.estimatedDays.min}–
              {shippingQuote.estimatedDays.max} días laborables
            </Text>

            {/* ENVÍO GRATIS APLICADO */}
            {shippingQuote.isFree && (
              <Text fontSize="xs" color="green.400" mt={1}>
                🎉 Envío gratis aplicado automáticamente a tu pedido
              </Text>
            )}

            {/* FALTA PARA ENVÍO GRATIS */}
            {!shippingQuote.isFree &&
              shippingQuote.freeFrom &&
              totalAmount < shippingQuote.freeFrom && (
                <Text fontSize="xs" color="textMuted" mt={1}>
                  Añade{" "}
                  <strong>
                    {(shippingQuote.freeFrom - totalAmount).toFixed(2)} €
                  </strong>{" "}
                  más para conseguir envío gratis
                </Text>
              )}

            <Divider my={2} />

            <Text fontSize="xl" fontWeight="bold">
              Total: {(totalAmount + shippingQuote.price).toFixed(2)} €
            </Text>
          </>
        )}

      </Box>



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

      <Accordion allowMultiple defaultIndex={[0]}>
        {/* DIRECCIÓN DE ENVÍO */}
        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">Dirección de envío</Box>
            <AccordionIcon />
          </AccordionButton>
          <Text fontSize="sm" color="textMuted" mb={3}>
            Introduce la dirección donde deseas recibir tu pedido.  
            El coste y el plazo de entrega se calcularán automáticamente según esta información
            y se mostrarán antes de finalizar la compra.
          </Text>

          <AccordionPanel>
            <Stack spacing={3}>
              <Input placeholder="Nombre completo *"
                value={shippingAddress.fullName}
                isInvalid={attemptedSubmit && !shippingAddress.fullName}
                onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
              />
              <Input placeholder="Dirección *"
                value={shippingAddress.street}
                isInvalid={attemptedSubmit && !shippingAddress.street}
                onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
              />
              <Input placeholder="Ciudad *"
                value={shippingAddress.city}
                isInvalid={attemptedSubmit && !shippingAddress.city}
                onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
              />
              <Input placeholder="Provincia *"
                value={shippingAddress.state}
                isInvalid={attemptedSubmit && !shippingAddress.state}
                onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
              />
              <Input placeholder="Código postal *"
                value={shippingAddress.postalCode}
                isInvalid={attemptedSubmit && !shippingAddress.postalCode}
                onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
              />
            </Stack>
          </AccordionPanel>
        </AccordionItem>

        {/* FACTURACIÓN */}
        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">Dirección de facturación</Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel>
            <Checkbox
              mb={3}
              isChecked={useSameBilling}
              onChange={(e) => setUseSameBilling(e.target.checked)}
            >
              Usar la misma que envío
            </Checkbox>

            {!useSameBilling && (
              <Stack spacing={3}>
                <Input placeholder="Nombre completo"
                  value={billingAddress.fullName}
                  onChange={(e) => setBillingAddress({ ...billingAddress, fullName: e.target.value })}
                />
                <Input placeholder="Dirección"
                  value={billingAddress.street}
                  onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
                />
              </Stack>
            )}
          </AccordionPanel>
        </AccordionItem>

        {/* NOTAS */}
        <AccordionItem>
          <AccordionButton>
            <Box flex="1" textAlign="left">Notas del pedido</Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel>
            <Textarea
              placeholder="Indicaciones adicionales para el pedido"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <Stack
        mt={6}
        spacing={2}
        fontSize="sm"
        color={useColorModeValue("gray.600", "gray.400")}
      >
        <Text>🔒 Pago seguro: tus datos están protegidos durante todo el proceso.</Text>
        <Text>📦 Envío: el coste y el plazo se confirmarán antes del pago.</Text>
        <Text>🎨 Personalización: revisa tu diseño antes de confirmar el pedido.</Text>
        <Text>🕒 Privacidad: los datos de invitados se conservan solo para finalizar el pedido.</Text>
      </Stack>



      <Checkbox
        mt={4}
        isChecked={acceptedTerms}
        onChange={(e) => setAcceptedTerms(e.target.checked)}
        colorScheme="blue"
      >
        He leído y acepto los{" "}
        <Link as={RouterLink} to="/terminos-condiciones" color="blue.500">
          Términos y Condiciones de Venta.
        </Link>
      </Checkbox>
      {!acceptedTerms && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          Es obligatorio aceptar los términos para continuar con el pago.
        </Text>
      )}

      {attemptedSubmit && !user && !EMAIL_REGEX.test(guestEmail) && (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          No puedes continuar porque el email introducido no tiene un formato válido.
        </Alert>
      )}



      <Button 
        mt={6} 
        width="100%" 
        colorScheme="blue" 
        size="lg" 
        onClick={handleConfirmOrder} 
        isDisabled={loading || !acceptedTerms} 
        > 
          {loading ? "Procesando pedido…" : "Confirmar pedido y pagar"} 
        </Button>

      <Text fontSize="xs" color="gray.500" mt={2}>
        Los datos introducidos se utilizarán únicamente para gestionar este pedido.
        Se guardan de forma temporal en tu dispositivo y se eliminarán automáticamente
        al finalizar el proceso o tras un periodo de inactividad. El coste total, 
        incluyendo el envío, se mostrará antes de confirmar el pago.{" "}
        <Link as={RouterLink} to="/politica-privacidad" textDecoration="underline">
          Política de Privacidad
        </Link>
      </Text>


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

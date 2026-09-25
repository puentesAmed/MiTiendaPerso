/*import { useState, } from "react";
import {
  Box,
  Heading,
  Input,
  Button,
  Stack,
  Text,
  Badge,
} from "@/components/ui/legacy-ui";
import { http } from "../../services/http";


const STATUS_LABELS = {
  created: "Pedido recibido",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export function OrderTracking() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  async function handleSearch() {
    setError("");
    setOrder(null);

    try {
      const { data } = await http.get("/api/orders/track", {
        params: { orderId, email },
      });

      if (data.ok) {
        setOrder(data.order);
      }
    } catch (err) {
      setError("No se pudo encontrar el pedido");
    }
  }

  return (
    <Box maxW="500px" mx="auto" p={6}>
      <Heading mb={4}>Seguimiento de pedido</Heading>

      <Stack spacing={3}>
        <Input
          placeholder="Número de pedido"
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
        />
        <Input
          placeholder="Email usado en la compra"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Button onClick={handleSearch} colorScheme="blue">
          Consultar pedido
        </Button>
      </Stack>

      {error && (
        <Text mt={4} color="red.500">
          {error}
        </Text>
      )}

      {order && (
        <Box mt={6} p={4} borderWidth="1px" borderRadius="md">
          <Text fontWeight="bold">
            Pedido #{order._id}
          </Text>

          <Badge mt={2} colorScheme="blue">
            {STATUS_LABELS[order.status]}
          </Badge>

          <Text mt={2}>
            Total: {order.total.toFixed(2)} €
          </Text>

          <Text fontSize="sm" color="gray.500" mt={1}>
            Realizado el {new Date(order.createdAt).toLocaleString()}
          </Text>

          <Box mt={3}>
            {order.items.map((i, idx) => (
              <Text key={idx} fontSize="sm">
                {i.name} × {i.quantity}
              </Text>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
*/

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Heading,
  Input,
  Button,
  Stack,
  Text,
  Badge,
  Divider,
} from "@/components/ui/legacy-ui";
import { http } from "../../services/http";
import { OrderTimeline } from "../../components/orders/OrderTimeline";


/* Labels legibles para el estado logístico */
const STATUS_LABELS = {
  created: "Pedido recibido",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export function OrderTracking() {
  const [searchParams] = useSearchParams();

  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------------------------------------------------
   * CONSULTAR PEDIDO
   * --------------------------------------------------------- */
  async function handleSearch(
    orderIdParam = orderId,
    emailParam = email
  ) {
    setError("");
    setOrder(null);

    if (!orderIdParam || !emailParam) {
      setError("Introduce el número de pedido y el email.");
      return;
    }

    try {
      setLoading(true);

      const { data } = await http.get("/api/orders/track", {
        params: {
          orderId: orderIdParam,
          email: emailParam,
        },
      });

      if (data?.ok) {
        setOrder(data.order);
      } else {
        setError("No se pudo encontrar el pedido.");
      }
    } catch (err) {
      console.error("Error consultando pedido:", err);
      setError("No se pudo encontrar el pedido.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------
   * AUTOCOMPLETAR DESDE URL
   * --------------------------------------------------------- */
  useEffect(() => {
    const urlOrderId = searchParams.get("orderId");
    const urlEmail = searchParams.get("email");

    if (urlOrderId) setOrderId(urlOrderId);
    if (urlEmail) setEmail(urlEmail);

    // Si vienen ambos → consulta automática
    if (urlOrderId && urlEmail) {
      handleSearch(urlOrderId, urlEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------
   * RENDER
   * --------------------------------------------------------- */
  return (
    <Box maxW="520px" mx="auto" p={6}>
      <Heading mb={4}>Seguimiento de pedido</Heading>

      <Text fontSize="sm" color="gray.500" mb={6}>
        Introduce el número de pedido y el email usado en la compra.
      </Text>

      {/* FORMULARIO */}
      <Stack spacing={3}>
        <Input
          placeholder="Número de pedido"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />

        <Input
          placeholder="Email usado en la compra"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button
          onClick={() => handleSearch()}
          colorScheme="blue"
          isLoading={loading}
        >
          Consultar pedido
        </Button>
      </Stack>

      {/* ERROR */}
      {error && (
        <Text mt={4} color="red.500">
          {error}
        </Text>
      )}

      {/* RESULTADO */}
      {order && (
        <Box mt={6} p={4} borderWidth="1px" borderRadius="md">
          <Text fontWeight="bold" mb={1}>
            Pedido #{order._id}
          </Text>

          <Badge colorScheme="blue" mb={2}>
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
          <OrderTimeline status={order.status} />


          <Text>
            <strong>Total:</strong>{" "}
            {Number(order.total).toFixed(2)} €
          </Text>

          <Text fontSize="sm" color="gray.500">
            Realizado el{" "}
            {new Date(order.createdAt).toLocaleString()}
          </Text>

          <Divider my={3} />

          <Text fontWeight="bold" mb={2}>
            Productos
          </Text>

          <Stack spacing={1}>
            {order.items.map((item, idx) => (
              <Text key={idx} fontSize="sm">
                {item.name} × {item.quantity}
              </Text>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

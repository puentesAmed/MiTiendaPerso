import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Stack,
  Badge,
  SimpleGrid,
  Divider,
  Spinner,
  useColorModeValue,
} from "@chakra-ui/react";
import { useAuth } from "../../hooks/useAuth";
import { getMyOrdersRequest } from "../../services/orders.service";

export function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cardBg = useColorModeValue("white", "gray.800");
  const subTextColor = useColorModeValue("gray.600", "gray.400");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true, state: { from: "/mis-pedidos" } });
      return;
    }

    const loadOrders = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getMyOrdersRequest(); // { ok, orders }
        if (!data.ok) {
          setError(data.message || "No se pudieron cargar los pedidos");
          return;
        }
        setOrders(data.orders || []);
      } catch (err) {
        console.error(err);
        setError("Error al cargar los pedidos");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <Box>
      <Heading size="lg" mb={2}>
        Mis pedidos
      </Heading>
      <Text fontSize="sm" color={subTextColor} mb={4}>
        Consulta el historial de tus pedidos realizados en MiTiendaPerso.
      </Text>

      {loading && (
        <Box py={10} textAlign="center">
          <Spinner />
          <Text mt={2} fontSize="sm">
            Cargando pedidos...
          </Text>
        </Box>
      )}

      {error && !loading && (
        <Text color="red.400" fontSize="sm" mb={4}>
          {error}
        </Text>
      )}

      {!loading && !error && orders.length === 0 && (
        <Text fontSize="sm" color={subTextColor}>
          Todavía no tienes pedidos.
        </Text>
      )}

      {!loading && !error && orders.length > 0 && (
        <Stack spacing={4}>
          {orders.map((order) => (
            <Box
              key={order._id}
              borderWidth="1px"
              borderRadius="lg"
              p={4}
              bg={cardBg}
              boxShadow="sm"
            >
              <Stack
                direction={{ base: "column", md: "row" }}
                justify="space-between"
                align={{ base: "flex-start", md: "center" }}
                mb={3}
                spacing={2}
              >
                <Box>
                  <Text fontSize="sm" color={subTextColor}>
                    Nº de pedido
                  </Text>
                  <Text fontWeight="semibold">{order._id}</Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color={subTextColor}>
                    Fecha
                  </Text>
                  <Text>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString()
                      : "-"}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color={subTextColor}>
                    Importe total
                  </Text>
                  <Text fontWeight="semibold">
                    {(order.total ?? order.totalAmount ?? 0).toFixed(2)} €
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color={subTextColor}>
                    Envio
                  </Text>
                  <Badge
                    colorScheme={
                      order.status === "delivered"
                        ? "green"
                        : order.status === "shipped"
                        ? "blue"
                        : order.status === "cancelled"
                        ? "red"
                        : "yellow"
                    }
                  >
                    {order.status || "pending"}
                  </Badge>
                </Box>

                <Box>
                  <Text fontSize="sm" color={subTextColor}>
                    Pago
                  </Text>
                  <Badge
                    colorScheme={
                      order.paymentStatus === "paid"
                        ? "green"
                        : order.status === "pending"
                        ? "blue"
                        : order.status === "failed"
                        ? "red"
                        : "yellow"
                    }
                  >
                    {order.paymentStatus || "pending"}
                  </Badge>
                </Box>

                <Box>
                  <Text fontSize="sm" color={subTextColor}>
                    Metodo de Pago
                  </Text>
                  <Badge
                    colorScheme={
                      order.paymentMethod === "Card"
                        ? "green"
                        : order.status === "Paypal"
                        ? "blue"
                        : order.status === "Cash on Delivery"
                        ? "red"
                        : "yellow"
                    }
                  >
                    {order.paymentMethod || "Card"}
                  </Badge>
                </Box>
              </Stack>

              <Divider mb={3} />

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Productos
                </Text>
                <SimpleGrid
                  columns={{ base: 1, sm: 2, md: 3 }}
                  spacing={2}
                  fontSize="sm"
                >
                  {order.items?.map((it, idx) => (
                    <Box
                      key={it.productId?._id || it.productId || idx}
                      borderWidth="1px"
                      borderRadius="md"
                      p={2}
                    >
                      <Text fontWeight="semibold">
                        {it.name || it.productId?.name || "Producto"}
                      </Text>
                      <Text color={subTextColor}>
                        Cantidad: {it.quantity} · Precio:{" "}
                        {(it.price ?? 0).toFixed(2)} €
                      </Text>
                      <Text>
                        Subtotal:{" "}
                        {((it.price ?? 0) * (it.quantity ?? 0)).toFixed(2)} €
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}


// src/pages/Admin/Admin.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Button,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
  useColorModeValue,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  Textarea,
  Switch,
  Stack,
  Spacer,
  Select,
  Image,
  Modal,
  ModalBody,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalFooter,
} from "@chakra-ui/react";

import { AddIcon, EditIcon, DeleteIcon, RepeatIcon, DownloadIcon } from "@chakra-ui/icons";

import { http } from "../../services/http";
import {
  adminGetOrders,
  adminUpdateOrderStatus,
  adminConfirmDeliveryDate,
  confirmOrderPayment,
} from "../../services/orders.service";
import { getOrderItemVariant } from "../../utils/orderVariantAdapter";

/* 🔧 Helper: nombre del usuario del pedido */
function getOrderUserLabel(order) {
  if (order.userEmail) return order.userEmail;
  if (order.user) return order.user.name || order.user.email;
  if (order.userId) {
    if (typeof order.userId === "string") return order.userId;
    return order.userId.name || order.userId.email;
  }
  return "—";
}


function getNumericPrice(price) {
  if (typeof price === "number") return price;
  if (price && typeof price.final === "number") return price.final;
  return 0;
}

function getOrderPaymentStatus(order) {
  return order?.payment?.status || order?.paymentStatus || "pending";
}

function getPaymentStatusLabel(status) {
  switch (status) {
    case "paid":
      return "Pagado";
    case "failed":
      return "Fallido";
    case "refunded":
      return "Reembolsado";
    case "pending":
    default:
      return "Pendiente";
  }
}

export function Admin() {
  const toast = useToast();

  // ---------------------------
  //  ESTADOS: PRODUCTOS
  // ---------------------------
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [errorProducts, setErrorProducts] = useState("");

  // Formulario de producto
  const [editingProduct, setEditingProduct] = useState(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formImages, setFormImages] = useState("");

  const [formActive, setFormActive] = useState(true);
  const [formSizes, setFormSizes] = useState("");
  const [formColors, setFormColors] = useState("");


  // Personalización
  const [formCustomizable, setFormCustomizable] = useState(false);
  const [formCustomizationType, setFormCustomizationType] =
    useState("tshirt");
  const [formCustomizationConfig, setFormCustomizationConfig] =
    useState(`{
  "maxImages": 1,
  "maxTextLength": 50,
  "allowedPositions": ["front", "back"],
  "allowedColors": ["black", "white", "red"],
  "notes": "Ejemplo de configuración de personalización"
}`);

  // ---------------------------
  //  ESTADOS: PEDIDOS
  // ---------------------------
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [errorOrders, setErrorOrders] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Confirmación de entrega
  const [deliveryDateInput, setDeliveryDateInput] = useState("");
  const [savingDeliveryDate, setSavingDeliveryDate] = useState(false);


  // ---------------------------
  //  ESTADOS: PERSONALIZACIONES
  // ---------------------------
  const [customizations, setCustomizations] = useState([]);
  const [loadingCustomizations, setLoadingCustomizations] = useState(false);
  const [errorCustomizations, setErrorCustomizations] = useState("");

  
  const [filterProduct, setFilterProduct] = useState("");
  const [filterUser, setFilterUser] = useState("");
  
  // Modal detalle
  const [selectedCustomization, setSelectedCustomization] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);

  
  // Chakra UI colors
  const cardBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.100", "gray.700");

  // ---------------------------
  //  RESET FORM PRODUCTO
  // ---------------------------
  const resetForm = useCallback(() => {
    setEditingProduct(null);
    setFormName("");
    setFormPrice("");
    setFormCategory("");
    setFormStock("");
    setFormDescription("");
    setFormImage("");
    setFormImages("");
    setFormSizes("");
    setFormColors("");

    setFormActive(true);

    setFormCustomizable(false);
    setFormCustomizationType("tshirt");
    setFormCustomizationConfig(`{
  "maxImages": 1,
  "maxTextLength": 50,
  "allowedPositions": ["front", "back"],
  "allowedColors": ["black", "white", "red"]
}`);
  }, []);

  // ---------------------------
  //  LLENAR FORM DESDE PRODUCTO
  // ---------------------------
  const fillFormFromProduct = useCallback((p) => {
    setEditingProduct(p);
    setFormName(p.name || "");
    setFormPrice(String(p.price ?? ""));
    setFormCategory(p.category || "");
    setFormStock(String(p.stock ?? ""));
    setFormDescription(p.description || "");
    setFormImage(p.image || "");
    setFormImages(
      Array.isArray(p.images) && p.images.length
        ? p.images.join("\n")
        : ""
    );
    setFormSizes(
      Array.isArray(p.variants?.sizes)
        ? p.variants.sizes.join(", ")
        : ""
    );

    setFormColors(
      Array.isArray(p.variants?.colors)
        ? p.variants.colors.join(", ")
        : ""
    );


    setFormActive(!!p.active);

    setFormCustomizable(!!p.customizable);
    setFormCustomizationType(p.customizationType || "tshirt");

    if (p.customizationConfig) {
      try {
        setFormCustomizationConfig(
          JSON.stringify(p.customizationConfig, null, 2)
        );
      } catch {
        setFormCustomizationConfig("");
      }
    } else {
      setFormCustomizationConfig("");
    }
  }, []);

  // ---------------------------
  //  CARGA DE PRODUCTOS
  // ---------------------------
  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setErrorProducts("");
      const { data } = await http.get("/api/products");

      if (data?.ok) {
        setProducts(data.products || []);
      } else {
        setErrorProducts("No se pudieron cargar los productos.");
      }
    } catch (err) {
      console.error("Error cargando productos:", err);
      setErrorProducts("Error al cargar productos.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ---------------------------
  //  EDITAR PRODUCTO
  // ---------------------------
  const handleEditProduct = (p) => fillFormFromProduct(p);

  // ---------------------------
  //  ELIMINAR PRODUCTO
  // ---------------------------
  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`¿Eliminar el producto "${p.name}"?`)) return;

    try {
      await http.delete(`/api/products/${p._id}`);
      toast({
        title: "Producto eliminado",
        status: "success",
        duration: 2000,
      });
      loadProducts();
    } catch (err) {
      console.error("Error eliminando producto:", err);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        status: "error",
        duration: 3000,
      });
    }
  };

  // ---------------------------
  //  GUARDAR PRODUCTO (CREAR/EDITAR)
  // ---------------------------
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);

    let customizationConfigObj = null;
    if (formCustomizable && formCustomizationConfig.trim()) {
      try {
        customizationConfigObj = JSON.parse(formCustomizationConfig);
      } catch {
        toast({
          title: "JSON inválido",
          description: "Revisa la configuración de personalización.",
          status: "error",
          duration: 4000,
        });
        setSavingProduct(false);
        return;
      }
    }

    const imagesArray = formImages
      .split("\n")
      .map((i) => i.trim())
      .filter(Boolean);

    const sizesArray = formSizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const colorsArray = formColors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);


    const payload = {
      name: formName.trim(),
      price: Number(formPrice),
      category: formCategory.trim(),
      stock: Number(formStock),
      description: formDescription.trim(),
      image: formImage.trim() || imagesArray[0] || "",
      images: imagesArray,
      variants: {
        sizes: sizesArray,
        colors: colorsArray,
      },

      active: formActive,
      customizable: formCustomizable,
      customizationType: formCustomizationType,
      customizationConfig: customizationConfigObj,
    };

    try {
      if (editingProduct) {
        await http.put(`/api/products/${editingProduct._id}`, payload);
        toast({ title: "Producto actualizado", status: "success" });
      } else {
        await http.post("/api/products", payload);
        toast({ title: "Producto creado", status: "success" });
      }

      resetForm();
      loadProducts();
    } catch (err) {
      console.error("Error guardando producto:", err);
      toast({
        title: "Error al guardar",
        status: "error",
        duration: 3000,
      });
    } finally {
      setSavingProduct(false);
    }
  };

  // ---------------------------
  //  RESUMEN PRODUCTOS
  // ---------------------------
  const summary = useMemo(() => {
    const total = products.length;
    const activos = products.filter((p) => p.active).length;
    const sinStock = products.filter((p) => (p.stock || 0) <= 0).length;
    return { total, activos, sinStock };
  }, [products]);

  // ---------------------------
  //  PEDIDOS ADMIN
  // ---------------------------
  const loadAdminOrders = useCallback(async (params = {}) => {
    try {
      setLoadingOrders(true);
      setErrorOrders("");

      const data = await adminGetOrders(params);
      if (data?.ok) {
        setOrders(data.orders || []);
      } else {
        setErrorOrders("No se pudieron cargar los pedidos.");
      }
    } catch (err) {
      console.error("Error cargando pedidos:", err);
      setErrorOrders("Error al cargar pedidos.");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadAdminOrders();
  }, [loadAdminOrders]);

  /* ---------------------------------------------------------
   * CAMBIAR ESTADO DE PEDIDO
   * --------------------------------------------------------- */

  const handleChangeOrderStatus = async (orderId, status) => {
    try {
      const data = await adminUpdateOrderStatus(orderId, status);
      if (data?.ok) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status } : o))
        );
        toast({ title: "Estado actualizado", status: "success" });
      } else {
        toast({ title: "No se pudo actualizar", status: "error" });
      }
    } catch (err) {
      console.error("Error actualizando pedido:", err);
      toast({ title: "Error", status: "error" });
    }
  };

  const handleConfirmOrderPayment = async (order) => {
    const isPending = getOrderPaymentStatus(order) === "pending";
    if (!isPending) return;

    const ok = window.confirm("¿Confirmar pago manual de este pedido?");
    if (!ok) return;

    try {
      const data = await confirmOrderPayment(order._id);
      if (data?.ok) {
        toast({ title: "Pago confirmado", status: "success" });
        loadAdminOrders();
      } else {
        toast({
          title: "No se pudo confirmar el pago",
          description: data?.message || "Error inesperado",
          status: "error",
        });
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Error confirmando el pago";
      if (status === 401 || status === 403 || status === 409) {
        toast({ title: "No permitido", description: message, status: "error" });
      } else {
        toast({ title: "Error", description: message, status: "error" });
      }
    }
  };

  //Confirmar fecha de entrega
  const handleConfirmDeliveryDate = async (orderId) => {
    if (!deliveryDateInput) {
      toast({
        title: "Fecha requerida",
        description: "Debes indicar una fecha de entrega",
        status: "warning",
      });
      return;
    }

    try {
      setSavingDeliveryDate(true);

      const data = await adminConfirmDeliveryDate(orderId, deliveryDateInput);

      if (data?.ok) {
        toast({
          title: "Entrega confirmada",
          description: "La fecha de entrega ha sido notificada al cliente",
          status: "success",
        });

        // Actualizar pedido en memoria
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? data.order : o
          )
        );

        setDeliveryDateInput("");
        setOrderDetailOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo confirmar la fecha de entrega",
        status: "error",
      });
    } finally {
      setSavingDeliveryDate(false);
    }
  };


  /* ---------------------------------------------------------
   * PERSONALIZACIONES (CUSTOMIZATIONS)
   * --------------------------------------------------------- */

    const loadCustomizations = useCallback(async (params = {}) => {
    try {
      setLoadingCustomizations(true);
      setErrorCustomizations("");

      const { data } = await http.get("/api/customizations", {
        params,
      });

      if (data?.ok) {
        setCustomizations(data.customizations || []);
      } else {
        setErrorCustomizations("No se pudieron cargar las personalizaciones");
      }
    } catch (err) {
      console.error("Error cargando personalizaciones:", err);
      setErrorCustomizations("Error al cargar diseños");
    } finally {
      setLoadingCustomizations(false);
    }
  }, []);

  useEffect(() => {
    loadCustomizations();
  }, [loadCustomizations]);

  /* ---------------------------------------------------------
   * ABRIR MODAL DE DETALLES DEL DISEÑO
   * --------------------------------------------------------- */

  const openCustomizationDetail = (c) => {
    setSelectedCustomization(c);
    setDetailOpen(true);
  };
 

const handleDownloadZip = async (customization) => {
  if (!customization.zipUrl) return;

  try {
    const API_URL = import.meta.env.VITE_API_URL;

    const response = await fetch(
      `${API_URL}${customization.zipUrl}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();


    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `custom_${customization._id}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error("Error descargando ZIP:", err);
  }
};


  return (
    <Box>
      <Heading size="lg" mb={2}>
        Panel de administración
      </Heading>

      <Text fontSize="sm" color="gray.500" mb={6}>
        Gestiona el catálogo, pedidos y la información general de la tienda.
      </Text>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Resumen</Tab>
          <Tab>Productos</Tab>
          <Tab>Pedidos</Tab>
          <Tab>Personalizaciones</Tab> {/* NUEVA PESTAÑA */}
        </TabList>

        <TabPanels mt={4}>
          {/* ---------------------------------------------------- */}
          {/* 🟦 TAB 1 — RESUMEN */}
          {/* ---------------------------------------------------- */}
          <TabPanel>
            <Flex gap={4} flexWrap="wrap">
              {/* Tarjeta: Productos totales */}
              <Box flex="1 1 220px" bg={cardBg} borderRadius="lg" p={4} boxShadow="md">
                <Heading size="sm" mb={2}>Productos totales</Heading>
                <Text fontSize="3xl" fontWeight="bold">{summary.total}</Text>
                <Text fontSize="xs" color="gray.500">Número total de productos registrados</Text>
              </Box>

              {/* Tarjeta: Activos */}
              <Box flex="1 1 220px" bg={cardBg} borderRadius="lg" p={4} boxShadow="md">
                <Heading size="sm" mb={2}>Activos</Heading>
                <Text fontSize="3xl" fontWeight="bold" color="green.400">
                  {summary.activos}
                </Text>
                <Text fontSize="xs" color="gray.500">Visibles para los clientes</Text>
              </Box>

              {/* Tarjeta: Sin stock */}
              <Box flex="1 1 220px" bg={cardBg} borderRadius="lg" p={4} boxShadow="md">
                <Heading size="sm" mb={2}>Sin stock</Heading>
                <Text fontSize="3xl" fontWeight="bold" color="red.400">
                  {summary.sinStock}
                </Text>
                <Text fontSize="xs" color="gray.500">Productos agotados</Text>
              </Box>
            </Flex>
          </TabPanel>

          {/* ---------------------------------------------------- */}
          {/* 🟦 TAB 2 — PRODUCTOS */}
          {/* ---------------------------------------------------- */}
          <TabPanel>
            <Flex
              gap={6}
              align="flex-start"
              flexWrap={{ base: "wrap", lg: "nowrap" }}
            >
              {/* 🟩 LISTA DE PRODUCTOS */}
              <Box
                flex="3 1 0"
                bg={cardBg}
                borderRadius="lg"
                boxShadow="md"
                overflow="hidden"
              >
                <Flex
                  align="center"
                  px={4}
                  py={3}
                  bg={headerBg}
                  borderBottom="1px solid"
                  borderColor="gray.300"
                >
                  <Heading size="sm">Productos</Heading>
                  <Spacer />
                  <IconButton
                    aria-label="Recargar productos"
                    icon={<RepeatIcon />}
                    size="sm"
                    onClick={loadProducts}
                    isLoading={loadingProducts}
                  />
                </Flex>

                {errorProducts && (
                  <Box px={4} py={2}>
                    <Text color="red.400" fontSize="sm">{errorProducts}</Text>
                  </Box>
                )}

                <Box maxH="420px" overflowY="auto">
                  <Table size="sm">
                    <Thead position="sticky" top={0} bg={headerBg} zIndex={2}>
                      <Tr>
                        <Th>Nombre</Th>
                        <Th>Precio</Th>
                        <Th>Stock</Th>
                        <Th>Estado</Th>
                        <Th>Personalizable</Th>
                        <Th>Categoria</Th>
                        <Th textAlign="right">Acciones</Th>
                      </Tr>
                    </Thead>

                    <Tbody>
                      {products.map((p) => (
                        <Tr key={p._id}>
                          <Td maxW="180px">
                            <Text noOfLines={1} title={p.name}>{p.name}</Text>
                          </Td>

                          <Td>{getNumericPrice(p.price).toFixed(2)} €</Td>

                          <Td>{p.stock ?? 0}</Td>

                          <Td>
                            {p.active ? (
                              <Badge colorScheme="green">Activo</Badge>
                            ) : (
                              <Badge colorScheme="gray">Oculto</Badge>
                            )}
                          </Td>

                          <Td>
                            {p.customizable ? (
                              <Badge colorScheme="purple">Sí</Badge>
                            ) : (
                              <Badge colorScheme="gray">No</Badge>
                            )}
                          </Td>

                          <Td>{p.category || "-"}</Td>

                          <Td textAlign="right">
                            <IconButton
                              aria-label="Editar"
                              icon={<EditIcon />}
                              size="xs"
                              mr={2}
                              onClick={() => handleEditProduct(p)}
                            />

                            <IconButton
                              aria-label="Eliminar"
                              icon={<DeleteIcon />}
                              size="xs"
                              colorScheme="red"
                              variant="outline"
                              onClick={() => handleDeleteProduct(p)}
                            />
                          </Td>
                        </Tr>
                      ))}

                      {!loadingProducts && products.length === 0 && (
                        <Tr>
                          <Td colSpan={7}>
                            <Text fontSize="sm" color="gray.500" textAlign="center">
                              No hay productos registrados.
                            </Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Box>

              {/* 🟧 FORMULARIO DEL PRODUCTO */}
              <Box
                flex="2 1 0"
                bg={cardBg}
                borderRadius="lg"
                boxShadow="md"
                p={4}
              >
                <Flex align="center" mb={3}>
                  <Heading size="sm">
                    {editingProduct ? "Editar producto" : "Nuevo producto"}
                  </Heading>

                  <Spacer />

                  {editingProduct && (
                    <Button
                      size="xs"
                      variant="ghost"
                      leftIcon={<AddIcon />}
                      onClick={resetForm}
                    >
                      Nuevo
                    </Button>
                  )}
                </Flex>

                <form onSubmit={handleSubmitProduct}>
                  <Stack spacing={3}>
                    {/* Nombre */}
                    <FormControl isRequired>
                      <FormLabel>Nombre</FormLabel>
                      <Input
                        size="sm"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </FormControl>

                    {/* Precio */}
                    <FormControl isRequired>
                      <FormLabel>Precio (€)</FormLabel>
                      <NumberInput
                        size="sm"
                        min={0}
                        precision={2}
                        value={formPrice}
                        onChange={(v) => setFormPrice(v)}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    {/* Categoría */}
                    <FormControl>
                      <FormLabel>Categoría</FormLabel>
                      <Input
                        size="sm"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        placeholder="ropa, hogar, electrónica..."
                      />
                    </FormControl>

                    {/* Stock */}
                    <FormControl>
                      <FormLabel>Stock</FormLabel>
                      <NumberInput
                        size="sm"
                        min={0}
                        value={formStock}
                        onChange={(v) => setFormStock(v)}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    {/* Tallas y colores */}
                    <FormControl>
                      <FormLabel>Tallas (separadas por coma)</FormLabel>
                      <Input
                        size="sm"
                        value={formSizes}
                        onChange={(e) => setFormSizes(e.target.value)}
                        placeholder="S, M, L, XL"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Colores (separados por coma)</FormLabel>
                      <Input
                        size="sm"
                        value={formColors}
                        onChange={(e) => setFormColors(e.target.value)}
                        placeholder="Negro, Blanco, Rojo"
                      />
                    </FormControl>


                    {/* Imagen */}
                    <FormControl>
                      <FormLabel>Imagen (URL)</FormLabel>
                      <Input
                        size="sm"
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        placeholder="https://..."
                      />
                    </FormControl>
                    {/* Imágenes adicionales */}
                    <FormControl>
                      <FormLabel>Imágenes adicionales (una por línea)</FormLabel>
                      <Textarea
                        size="sm"
                        rows={4}
                        value={formImages}
                        onChange={(e) => setFormImages(e.target.value)}
                        placeholder={`https://...\nhttps://...\nhttps://...`}
                      />
                    </FormControl>


                    {/* Descripción */}
                    <FormControl>
                      <FormLabel>Descripción</FormLabel>
                      <Textarea
                        size="sm"
                        rows={3}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </FormControl>

                    {/* Visible */}
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Visible en catálogo</FormLabel>
                      <Switch
                        isChecked={formActive}
                        onChange={(e) => setFormActive(e.target.checked)}
                        colorScheme="green"
                      />
                    </FormControl>

                    {/* Personalizable */}
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Producto personalizable</FormLabel>
                      <Switch
                        isChecked={formCustomizable}
                        onChange={(e) => setFormCustomizable(e.target.checked)}
                        colorScheme="purple"
                      />
                    </FormControl>

                    {/* Configuración de personalización */}
                    {formCustomizable && (
                      <>
                        <FormControl>
                          <FormLabel>Tipo de diseño</FormLabel>
                          <Select
                            size="sm"
                            value={formCustomizationType}
                            onChange={(e) => setFormCustomizationType(e.target.value)}
                          >
                            <option value="tshirt">Camiseta</option>
                            <option value="hoodie">Sudadera</option>
                            <option value="mug">Taza</option>
                          </Select>
                        </FormControl>

                        <FormControl>
                          <FormLabel>Configuración JSON</FormLabel>
                          <Textarea
                            size="sm"
                            rows={6}
                            fontFamily="mono"
                            value={formCustomizationConfig}
                            onChange={(e) => setFormCustomizationConfig(e.target.value)}
                          />
                        </FormControl>
                      </>
                    )}

                    {/* Guardar */}
                    <Button
                      type="submit"
                      colorScheme="blue"
                      size="sm"
                      isLoading={savingProduct}
                    >
                      {editingProduct ? "Guardar cambios" : "Crear producto"}
                    </Button>
                  </Stack>
                </form>
              </Box>
            </Flex>
          </TabPanel>
          {/* ---------------------------------------------------- */}
          {/* 🟦 TAB 3 — PEDIDOS */}
          {/* ---------------------------------------------------- */}
          <TabPanel>
            <Flex
              direction="column"
              gap={4}
              bg={cardBg}
              borderRadius="lg"
              p={4}
              boxShadow="md"
            >
              {/* Header */}
              <Flex align="center" mb={2}>
                <Heading size="sm">Pedidos</Heading>
                <Spacer />
                <Button
                  size="xs"
                  leftIcon={<RepeatIcon />}
                  onClick={loadAdminOrders}
                  isLoading={loadingOrders}
                >
                  Recargar
                </Button>
              </Flex>

              {/* Filtros */}
              <Flex gap={3} wrap="wrap" mb={2}>
                <FormControl maxW="200px">
                  <FormLabel fontSize="xs" mb={1}>Estado</FormLabel>
                  <Select
                    size="sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="created">Creado</option>
                    <option value="processing">En preparación</option>
                    
                    <option value="shipped">Enviado</option>
                    <option value="delivered">Entregado</option>
                    <option value="cancelled">Cancelado</option>
                  </Select>
                </FormControl>

                <Button
                  size="sm"
                  onClick={() =>
                    loadAdminOrders({
                      status: statusFilter || undefined,
                    })
                  }
                  isLoading={loadingOrders}
                >
                  Filtrar
                </Button>
              </Flex>

              {errorOrders && (
                <Text color="red.400" fontSize="sm">
                  {errorOrders}
                </Text>
              )}

              {/* Tabla de pedidos */}
              <Box maxH="420px" overflowY="auto">
                <Table size="sm">
                  <Thead
                    position="sticky"
                    top={0}
                    bg={headerBg}
                    zIndex={2}
                  >
                    <Tr>
                      <Th>Nº Pedido</Th>
                      <Th>Cliente</Th>
                      <Th>Total</Th>
                      <Th>Estado</Th>
                      <Th>Pago</Th>
                      <Th>Fecha</Th>
                      <Th>Acciones</Th>
                    </Tr>
                  </Thead>

                  <Tbody>
                    {orders.map((o) => (
                      <Tr key={o._id}>
                        {/* Número pedido */}
                        <Td>
                          <Text fontSize="xs" fontFamily="mono">
                            {String(o._id).slice(-8)}
                          </Text>
                        </Td>

                        {/* Cliente */}
                        <Td>
                          <Text fontSize="sm">{getOrderUserLabel(o)}</Text>
                        </Td>

                        {/* Total */}
                        <Td>
                          {(o.totalAmount ?? o.total ?? 0).toFixed(2)} €
                        </Td>

                        {/* Cambiar estado */}
                        <Td>
                          <Select
                            size="xs"
                            value={o.status}
                            onChange={(e) =>
                              handleChangeOrderStatus(o._id, e.target.value)
                            }
                          >
                            <option value="created">Creado</option>
                            <option value="processing">En preparación</option>
                            <option value="shipped">Enviado</option>
                            <option value="delivered">Entregado</option>
                            <option value="cancelled">Cancelado</option>
                          </Select>
                        </Td>

	                        {/* Fecha */}
	                        <Td>
                            <Badge
                              colorScheme={
                                getOrderPaymentStatus(o) === "paid"
                                  ? "green"
                                  : getOrderPaymentStatus(o) === "failed"
                                    ? "red"
                                    : getOrderPaymentStatus(o) === "refunded"
                                      ? "purple"
                                      : "yellow"
                              }
                            >
                              {getPaymentStatusLabel(getOrderPaymentStatus(o))}
                            </Badge>
                          </Td>

	                        {/* Fecha */}
	                        <Td fontSize="xs">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleString()
                            : "—"}
                        </Td>

	                        {/* Botón ver detalles (opcional futuro) */}
	                        <Td>
                            <Flex gap={2} wrap="wrap">
	                            <Button
	                              size="xs"
	                              variant="outline"
	                              onClick={() => {
	                                setSelectedOrder(o);
	                                setOrderDetailOpen(true);
	                              }}
	                            >
	                              Ver
	                            </Button>
                              {getOrderPaymentStatus(o) === "pending" && (
                                <Button
                                  size="xs"
                                  colorScheme="green"
                                  variant="outline"
                                  onClick={() => handleConfirmOrderPayment(o)}
                                  isDisabled={o.status === "cancelled"}
                                >
                                  Confirmar pago
                                </Button>
                              )}
                            </Flex>
	                        </Td>
                      </Tr>
                    ))}

                    {!loadingOrders && orders.length === 0 && (
                      <Tr>
	                        <Td colSpan={7}>
                          <Text
                            fontSize="sm"
                            color="gray.500"
                            textAlign="center"
                          >
                            No hay pedidos registrados.
                          </Text>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            </Flex>
          </TabPanel>
          {/* ---------------------------------------------------- */}
          {/* 🟣 TAB 4 — PERSONALIZACIONES */}
          {/* ---------------------------------------------------- */}
          <TabPanel>
            <Flex
              direction="column"
              gap={4}
              bg={cardBg}
              borderRadius="lg"
              p={4}
              boxShadow="md"
            >
              {/* --------------------------------------------------- */}
              {/* ENCABEZADO */}
              {/* --------------------------------------------------- */}
              <Flex align="center" mb={2}>
                <Heading size="sm">Diseños personalizados</Heading>
                <Spacer />
                <Button
                  size="xs"
                  leftIcon={<RepeatIcon />}
                  onClick={loadCustomizations}
                  isLoading={loadingCustomizations}
                >
                  Recargar
                </Button>
              </Flex>

              {/* --------------------------------------------------- */}
              {/* FILTROS */}
              {/* --------------------------------------------------- */}
              <Flex gap={3} wrap="wrap" mb={2}>
                <FormControl maxW="240px">
                  <FormLabel fontSize="xs" mb={1}>Producto</FormLabel>
                  <Input
                    size="sm"
                    placeholder="ID o nombre del producto"
                    value={filterProduct}
                    onChange={(e) => setFilterProduct(e.target.value)}
                  />
                </FormControl>

                <FormControl maxW="240px">
                  <FormLabel fontSize="xs" mb={1}>Usuario</FormLabel>
                  <Input
                    size="sm"
                    placeholder="email o id"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                  />
                </FormControl>

                <Button
                  size="sm"
                  onClick={() =>
                    loadCustomizations({
                      product: filterProduct || undefined,
                      user: filterUser || undefined,
                    })
                  }
                >
                  Filtrar
                </Button>
              </Flex>

              {errorCustomizations && (
                <Text color="red.400" fontSize="sm">{errorCustomizations}</Text>
              )}

              {/* --------------------------------------------------- */}
              {/* TABLA DE PERSONALIZACIONES */}
              {/* --------------------------------------------------- */}
              <Box maxH="420px" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg={headerBg} zIndex={1}>
                    <Tr>
                      <Th>ID</Th>
                      <Th>Preview</Th>
                      <Th>Producto</Th>
                      <Th>Usuario</Th>
                      <Th>Fecha</Th>
                      <Th>ZIP</Th>
                      <Th>Acciones</Th>
                    </Tr>
                  </Thead>

                  <Tbody>
                    {customizations.map((c) => (
                      <Tr key={c._id}>
                        {/* ID recortado */}
                        <Td fontSize="xs" fontFamily="mono">
                          {String(c._id).slice(-8)}
                        </Td>

                        {/* PREVIEW */}
                        <Td>
                          {c.previewImage ? (
                            <Image
                              src={c.previewLowQuality || c.previewImage}
                              alt="preview"
                              boxSize="60px"
                              objectFit="cover"
                              borderRadius="6px"
                              border="1px solid #ddd"
                            />
                          ) : (
                            <Text fontSize="xs" color="gray.500">
                              Sin preview
                            </Text>
                          )}
                        </Td>

                        {/* PRODUCTO */}
                        <Td>
                          {c.productName ||
                            c.productId?.name ||
                            c.productId ||
                            "—"}
                        </Td>

                        {/* USUARIO */}
                        <Td>
                          {c.userEmail ||
                            c.userId?.email ||
                            c.userId?._id ||
                            "—"}
                        </Td>

                        {/* FECHA */}
                        <Td fontSize="xs">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleString()
                            : "—"}
                        </Td>

                        {/* DESCARGAR ZIP */}
                        <Td>
                          {c.zipUrl ? (
                            <Button
                              size="xs"
                              colorScheme="purple"
                              onClick={() => handleDownloadZip(c)}
                            >
                              Descargar
                            </Button>
                          ) : (
                            <Badge colorScheme="gray">Pendiente</Badge>
                          )}
                        </Td>

                        {/* VER DETALLES */}
                        <Td>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => openCustomizationDetail(c)}
                          >
                            Ver
                          </Button>
                        </Td>
                      </Tr>
                    ))}

                    {!loadingCustomizations && customizations.length === 0 && (
                      <Tr>
                        <Td colSpan={6}>
                          <Text fontSize="sm" color="gray.500" textAlign="center">
                            No hay personalizaciones registradas.
                          </Text>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            </Flex>

            {/* --------------------------------------------------- */}
            {/* MODAL DETALLE */}
            {/* --------------------------------------------------- */}
            <Modal
              isOpen={detailOpen}
              onClose={() => setDetailOpen(false)}
              size="xl"
              isCentered
            >
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Detalles del diseño</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                  {selectedCustomization ? (
                    <Stack spacing={4}>
                      {/* Información base */}
                      <Text fontSize="sm">
                        <strong>ID:</strong> {selectedCustomization._id}
                      </Text>

                      <Text fontSize="sm">
                        <strong>Producto:</strong>{" "}
                        {selectedCustomization.productName ||
                          selectedCustomization.productId?.name ||
                          "—"}
                      </Text>

                      <Text fontSize="sm">
                        <strong>Usuario:</strong>{" "}
                        {selectedCustomization.userEmail ||
                          selectedCustomization.userId?.email ||
                          "—"}
                      </Text>

                      {/* PREVIEW HD */}
                      <Box>
                        <Text fontWeight="bold" mb={1}>
                          Vista previa HD
                        </Text>

                        {selectedCustomization.previewImage ? (
                          <Image
                            src={selectedCustomization.previewImage}
                            alt="preview HD"
                            width="100%"
                            borderRadius="8px"
                            border="1px solid #ddd"
                          />
                        ) : (
                          <Text fontSize="sm" color="gray.500">
                            Sin imagen generada
                          </Text>
                        )}
                      </Box>

                      {/* JSON DEL DISEÑO */}
                      <Box>
                        <Text fontWeight="bold" mb={1}>
                          JSON del diseño
                        </Text>

                        <pre
                          style={{
                            background: "#000000",
                            padding: "12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            maxHeight: "300px",
                            overflowY: "auto",
                          }}
                        >
                          {JSON.stringify(selectedCustomization.design, null, 2)}
                        </pre>
                      </Box>

                      {/* ZIP */}
                      {selectedCustomization.zipUrl && (
                        <Button
                          colorScheme="purple"
                          onClick={() => handleDownloadZip(selectedCustomization)}
                        >
                          Descargar ZIP
                        </Button>
                      )}
                    </Stack>
                  ) : (
                    <Text>Cargando…</Text>
                  )}
                </ModalBody>

                <ModalFooter>
                  <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
            <Modal
              isOpen={orderDetailOpen}
              onClose={() => setOrderDetailOpen(false)}
              size="lg"
              isCentered
            >
              <ModalOverlay />
              <ModalContent>
                <ModalHeader>Detalle del pedido</ModalHeader>
                <ModalCloseButton />

                

                <ModalBody>
                  {selectedOrder ? (
                    <Stack spacing={4}>
                      {/* Datos generales */}
                      <Box>
                        <Text fontSize="sm">
                          <strong>Pedido:</strong> {selectedOrder._id}
                        </Text>
                        <Text fontSize="sm">
                          <strong>Cliente:</strong> {getOrderUserLabel(selectedOrder)}
                        </Text>
                        <Text fontSize="sm">
                          <strong>Total:</strong>{" "}
                          {(selectedOrder.total ?? 0).toFixed(2)} €
                        </Text>
                      </Box>

                      <Box>
                        <Text fontSize="sm">
                          <strong>Entrega estimada:</strong>{" "}
                          {selectedOrder.shipping?.estimatedDeliveryDate
                            ? new Date(
                                selectedOrder.shipping.estimatedDeliveryDate
                              ).toLocaleDateString()
                            : "—"}
                        </Text>

                        <Text fontSize="sm">
                          <strong>Estado de entrega:</strong>{" "}
                          <Badge colorScheme={
                            selectedOrder.shipping?.deliveryStatus === "confirmed"
                              ? "green"
                              : "orange"
                          }>
                            {selectedOrder.shipping?.deliveryStatus || "estimada"}
                          </Badge>
                        </Text>

                        {selectedOrder.shipping?.confirmedDeliveryDate && (
                          <Text fontSize="sm" color="green.500">
                            <strong>Entrega confirmada:</strong>{" "}
                            {new Date(
                              selectedOrder.shipping.confirmedDeliveryDate
                            ).toLocaleDateString()}
                          </Text>
                        )}
                      </Box>

                      <Box borderTop="1px solid #eee" pt={3}>
                        <FormControl>
                          <FormLabel fontSize="sm">
                            Confirmar fecha de entrega
                          </FormLabel>

                          <Input
                            type="date"
                            size="sm"
                            value={deliveryDateInput}
                            onChange={(e) => setDeliveryDateInput(e.target.value)}
                          />
                        </FormControl>

                        <Button
                          mt={3}
                          size="sm"
                          colorScheme="green"
                          isLoading={savingDeliveryDate}
                          onClick={() =>
                            handleConfirmDeliveryDate(selectedOrder._id)
                          }
                        >
                          Confirmar entrega y notificar cliente
                        </Button>
                      </Box>



                      

                      {/* LÍNEAS DEL PEDIDO */}
                      <Box>
                        <Text fontWeight="bold" mb={2}>
                          Productos
                        </Text>                 


                        {selectedOrder.items.map((i, idx) => (

                          <Box key={idx} mb={2}>
                            <Text fontSize="sm">
                              {i.name} × {i.quantity}
                            </Text>

                            {getOrderItemVariant(i) && (
                              <Text fontSize="xs" color="gray.500">
                                {getOrderItemVariant(i).size && (
                                  <>Talla: {getOrderItemVariant(i).size}</>
                                )}
                                {getOrderItemVariant(i).size &&
                                  getOrderItemVariant(i).color &&
                                  " · "}
                                {getOrderItemVariant(i).color && (
                                  <>Color: {getOrderItemVariant(i).color}</>
                                )}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Stack>
                  ) : (
                    <Text>Cargando…</Text>
                  )}
                </ModalBody>

                <ModalFooter>
                  <Button onClick={() => setOrderDetailOpen(false)}>Cerrar</Button>
                </ModalFooter>
              </ModalContent>
            </Modal>

          </TabPanel>

        </TabPanels>
      </Tabs>
    </Box>
  );
}

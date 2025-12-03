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
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon, RepeatIcon } from "@chakra-ui/icons";
import { http } from "../../services/http";
import { adminGetOrders, adminUpdateOrderStatus } from "../../services/orders.service";

export function Admin() {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  const [errorProducts, setErrorProducts] = useState("");

    // al principio del componente Admin (junto a estado de productos)
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [errorOrders, setErrorOrders] = useState("");
  const [statusFilter, setStatusFilter] = useState("");


  // Formulario de producto
  const [editingProduct, setEditingProduct] = useState(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formActive, setFormActive] = useState(true);

  const cardBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.100", "gray.700");

  const resetForm = useCallback(() => {
    setEditingProduct(null);
    setFormName("");
    setFormPrice("");
    setFormCategory("");
    setFormStock("");
    setFormDescription("");
    setFormImage("");
    setFormActive(true);
  }, []);

  const fillFormFromProduct = useCallback((p) => {
    setEditingProduct(p);
    setFormName(p.name || "");
    setFormPrice(p.price != null ? String(p.price) : "");
    setFormCategory(p.category || "");
    setFormStock(p.stock != null ? String(p.stock) : "");
    setFormDescription(p.description || "");
    setFormImage(p.image || "");
    setFormActive(!!p.active);
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      setErrorProducts("");
      const { data } = await http.get("/api/products");
      // backend devuelve { ok, products }
      if (data?.ok) {
        setProducts(data.products || []);
      } else {
        setErrorProducts("No se pudieron cargar los productos");
      }
    } catch (err) {
      console.error("Error cargando productos:", err);
      setErrorProducts("Error al cargar productos");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleEditProduct = (p) => {
    fillFormFromProduct(p);
  };

  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`¿Eliminar el producto "${p.name}"?`)) return;
    try {
      await http.delete(`/api/products/${p._id}`);
      toast({
        title: "Producto eliminado",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      loadProducts();
    } catch (err) {
      console.error("Error eliminando producto:", err);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el producto",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);

    const payload = {
      name: formName.trim(),
      price: Number(formPrice) || 0,
      category: formCategory.trim(),
      stock: Number(formStock) || 0,
      description: formDescription.trim(),
      image: formImage.trim(),
      active: formActive,
    };

    try {
      if (editingProduct) {
        await http.put(`/api/products/${editingProduct._id}`, payload);
        toast({
          title: "Producto actualizado",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        await http.post("/api/products", payload);
        toast({
          title: "Producto creado",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
      resetForm();
      loadProducts();
    } catch (err) {
      console.error("Error guardando producto:", err);
      toast({
        title: "Error al guardar",
        description: "Revisa los datos e inténtalo de nuevo",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSavingProduct(false);
    }
  };

  const summary = useMemo(() => {
    const total = products.length;
    const activos = products.filter((p) => p.active).length;
    const sinStock = products.filter((p) => (p.stock || 0) <= 0).length;
    return { total, activos, sinStock };
  }, [products]);

    const loadAdminOrders = useCallback(
    async (params = {}) => {
      try {
        setLoadingOrders(true);
        setErrorOrders("");
        const data = await adminGetOrders(params);
        if (data?.ok) {
          setOrders(data.orders || []);
        } else {
          setErrorOrders("No se pudieron cargar los pedidos");
        }
      } catch (err) {
        console.error("Error cargando pedidos (admin):", err);
        setErrorOrders("Error al cargar pedidos");
      } finally {
        setLoadingOrders(false);
      }
    },
    []
  );

  useEffect(() => {
    // si quieres cargar pedidos al abrir la pestaña admin directamente
    loadAdminOrders();
  }, [loadAdminOrders]);

  const handleChangeOrderStatus = async (orderId, status) => {
    try {
      const data = await adminUpdateOrderStatus(orderId, status);
      if (data?.ok) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status } : o))
        );
        toast({
          title: "Estado actualizado",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        toast({
          title: "No se pudo actualizar",
          status: "error",
          duration: 2500,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error("Error actualizando estado del pedido:", err);
      toast({
        title: "Error al actualizar estado",
        status: "error",
        duration: 2500,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <Heading size="lg" mb={2}>
        Panel de administración
      </Heading>
      <Text fontSize="sm" color="gray.500" mb={6}>
        Gestiona el catálogo, pedidos y la información de la tienda.
      </Text>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Resumen</Tab>
          <Tab>Productos</Tab>
          <Tab>Pedidos</Tab>
        </TabList>

        <TabPanels mt={4}>
          {/* TAB RESUMEN */}
          <TabPanel>
            <Flex gap={4} flexWrap="wrap">
              <Box
                flex="1 1 220px"
                bg={cardBg}
                borderRadius="lg"
                p={4}
                boxShadow="md"
              >
                <Heading size="sm" mb={2}>
                  Productos totales
                </Heading>
                <Text fontSize="3xl" fontWeight="bold">
                  {summary.total}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Número de productos registrados
                </Text>
              </Box>

              <Box
                flex="1 1 220px"
                bg={cardBg}
                borderRadius="lg"
                p={4}
                boxShadow="md"
              >
                <Heading size="sm" mb={2}>
                  Activos en catálogo
                </Heading>
                <Text fontSize="3xl" fontWeight="bold" color="green.400">
                  {summary.activos}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Productos visibles para el cliente
                </Text>
              </Box>

              <Box
                flex="1 1 220px"
                bg={cardBg}
                borderRadius="lg"
                p={4}
                boxShadow="md"
              >
                <Heading size="sm" mb={2}>
                  Sin stock
                </Heading>
                <Text fontSize="3xl" fontWeight="bold" color="red.400">
                  {summary.sinStock}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Productos que necesitan reposición
                </Text>
              </Box>
            </Flex>
          </TabPanel>

          {/* TAB PRODUCTOS */}
          <TabPanel>
            <Flex
              gap={6}
              align="flex-start"
              flexWrap={{ base: "wrap", lg: "nowrap" }}
            >
              {/* Lista de productos */}
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
                  borderColor="gray.200"
                >
                  <Heading size="sm">Productos</Heading>
                  <Spacer />
                  <IconButton
                    aria-label="Recargar"
                    icon={<RepeatIcon />}
                    size="sm"
                    onClick={loadProducts}
                    isLoading={loadingProducts}
                  />
                </Flex>

                {errorProducts && (
                  <Box px={4} py={2}>
                    <Text color="red.400" fontSize="sm">
                      {errorProducts}
                    </Text>
                  </Box>
                )}

                <Box maxH="420px" overflowY="auto">
                  <Table size="sm">
                    <Thead position="sticky" top={0} bg={headerBg} zIndex={1}>
                      <Tr>
                        <Th>Nombre</Th>
                        <Th>Precio</Th>
                        <Th>Stock</Th>
                        <Th>Estado</Th>
                        <Th>Categoría</Th>
                        <Th textAlign="right">Acciones</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {products.map((p) => (
                        <Tr key={p._id}>
                          <Td maxW="180px">
                            <Text noOfLines={1} title={p.name}>
                              {p.name}
                            </Text>
                          </Td>
                          <Td>{(p.price ?? 0).toFixed(2)} €</Td>
                          <Td>{p.stock ?? 0}</Td>
                          <Td>
                            {p.active ? (
                              <Badge colorScheme="green">Activo</Badge>
                            ) : (
                              <Badge colorScheme="gray">Oculto</Badge>
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
                      {products.length === 0 && !loadingProducts && (
                        <Tr>
                          <Td colSpan={6}>
                            <Text fontSize="sm" color="gray.500">
                              No hay productos registrados.
                            </Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Box>

              {/* Formulario producto */}
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
                      onClick={resetForm}
                      leftIcon={<AddIcon />}
                    >
                      Nuevo
                    </Button>
                  )}
                </Flex>

                <form onSubmit={handleSubmitProduct}>
                  <Stack spacing={3}>
                    <FormControl isRequired>
                      <FormLabel>Nombre</FormLabel>
                      <Input
                        size="sm"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Precio (€)</FormLabel>
                      <NumberInput
                        size="sm"
                        min={0}
                        precision={2}
                        value={formPrice}
                        onChange={(val) => setFormPrice(val)}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Categoría</FormLabel>
                      <Input
                        size="sm"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        placeholder="ropa, electronica, hogar..."
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Stock</FormLabel>
                      <NumberInput
                        size="sm"
                        min={0}
                        value={formStock}
                        onChange={(val) => setFormStock(val)}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Imagen (URL)</FormLabel>
                      <Input
                        size="sm"
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        placeholder="https://..."
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Descripción</FormLabel>
                      <Textarea
                        size="sm"
                        rows={3}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </FormControl>

                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Visible en catálogo</FormLabel>
                      <Switch
                        isChecked={formActive}
                        onChange={(e) => setFormActive(e.target.checked)}
                        colorScheme="green"
                      />
                    </FormControl>

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

         {/* TAB PEDIDOS (ADMIN) */}
          <TabPanel>
            <Flex
              direction="column"
              gap={4}
              bg={cardBg}
              borderRadius="lg"
              p={4}
              boxShadow="md"
            >
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

              {/* Filtros básicos por estado */}
              <Flex gap={3} wrap="wrap" mb={2}>
                <FormControl maxW="200px">
                  <FormLabel fontSize="xs" mb={1}>
                    Estado
                  </FormLabel>
                  <Select
                    size="sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </FormControl>
                <Button
                  size="sm"
                  onClick={() => loadAdminOrders({ status: statusFilter || undefined })}
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

              <Box maxH="420px" overflowY="auto">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg={headerBg} zIndex={1}>
                    <Tr>
                      <Th>Nº Pedido</Th>
                      <Th>Cliente</Th>
                      <Th>Total</Th>
                      <Th>Estado</Th>
                      <Th>Fecha</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {orders.map((o) => (
                      <Tr key={o._id}>
                        <Td>
                          <Text fontSize="xs" fontFamily="mono">
                            {String(o._id).slice(-8)}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {o.userId?.name || o.userId?.email || "—"}
                          </Text>
                        </Td>
                        <Td>{(o.totalAmount ?? 0).toFixed(2)} €</Td>
                        <Td>
                          <Select
                            size="xs"
                            value={o.status}
                            onChange={(e) =>
                              handleChangeOrderStatus(o._id, e.target.value)
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </Select>
                        </Td>
                        <Td fontSize="xs">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleString()
                            : "—"}
                        </Td>
                      </Tr>
                    ))}
                    {orders.length === 0 && !loadingOrders && (
                      <Tr>
                        <Td colSpan={5}>
                          <Text fontSize="sm" color="gray.500">
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

        </TabPanels>
      </Tabs>
    </Box>
  );
}

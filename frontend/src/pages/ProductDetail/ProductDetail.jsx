/*// src/pages/ProductDetail/ProductDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Image,
  Stack,
  HStack,
  Button,
  Spinner,
  Badge,
  useColorModeValue,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { apiGetProductById} from "../../services/products.service";
import { useCart } from "../../hooks/useCart";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetProductById(id);
        if (isMounted) {
          setProduct(data);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("No se pudo cargar el producto");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleAddToCart = () => {
    const qty = Number(quantity) || 1;
    if (product && qty > 0) {
      addItem(product, qty); // adapta si tu CartContext tiene otra firma
    }
  };

  if (loading) {
    return (
      <Box
        minH="60vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bg} borderRadius="xl" boxShadow="md">
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text color="red.400" fontSize="sm">
          {error || "Producto no encontrado"}
        </Text>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }} bg={bg} borderRadius="xl" boxShadow="md">
      <Button
        leftIcon={<ArrowBackIcon />}
        size="sm"
        mb={4}
        variant="ghost"
        onClick={() => navigate(-1)}
      >
        Volver
      </Button>

      <Box
        display="flex"
        flexDirection={{ base: "column", md: "row" }}
        gap={6}
        bg={cardBg}
        borderRadius="xl"
        p={4}
      >
        
        <Box flex="1" minW={{ base: "100%", md: "320px" }}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              borderRadius="lg"
              w="100%"
              h={{ base: "260px", md: "360px" }}
              objectFit="contain"
            />
          ) : (
            <Box
              borderRadius="lg"
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="gray.400"
              h={{ base: "260px", md: "360px" }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="sm"
              color="gray.500"
            >
              Sin imagen
            </Box>
          )}
        </Box>

        
        <Box flex="2">
          <Stack spacing={3}>
            <HStack justify="space-between">
              <Heading size="lg">{product.name}</Heading>
              {product.category && (
                <Badge colorScheme="blue" fontSize="0.8rem">
                  {product.category}
                </Badge>
              )}
            </HStack>

            {product.description && (
              <Text fontSize="sm" color="gray.500">
                {product.description}
              </Text>
            )}

            <HStack spacing={6} mt={2}>
              <Text fontSize="2xl" fontWeight="bold">
                {product.price?.toFixed
                  ? product.price.toFixed(2)
                  : product.price}{" "}
                €
              </Text>
              <Text
                fontSize="sm"
                color={product.stock > 0 ? "green.400" : "red.400"}
              >
                {product.stock > 0
                  ? `Stock disponible: ${product.stock}`
                  : "Sin stock"}
              </Text>
            </HStack>

            
            <HStack mt={4} spacing={4}>
              <Box>
                <Text mb={1} fontSize="xs" color="gray.500">
                  Cantidad
                </Text>
                <NumberInput
                  size="sm"
                  min={1}
                  max={product.stock || 99}
                  value={quantity}
                  onChange={(value) => setQuantity(value)}
                  isDisabled={product.stock <= 0}
                  w="120px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>

              <Button
                colorScheme="blue"
                onClick={handleAddToCart}
                isDisabled={product.stock <= 0}
              >
                Añadir al carrito
              </Button>
            </HStack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
*/

// src/pages/ProductDetail/ProductDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Image,
  Stack,
  HStack,
  Button,
  Spinner,
  Badge,
  useColorModeValue,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Select,
  Input,
  Textarea,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { apiGetProductById } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";
import { http } from "../../services/http";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado de personalización
  const [areaCode, setAreaCode] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [customText, setCustomText] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [customError, setCustomError] = useState("");

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetProductById(id);
        if (isMounted) {
          setProduct(data);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("No se pudo cargar el producto");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleUploadImage = async (file) => {
    if (!file) return;
    setCustomError("");
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      // Debes tener en el backend POST /api/uploads/image
      const { data } = await http.post("/api/uploads/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!data?.url) {
        throw new Error("Respuesta de subida inválida");
      }
      setCustomImageUrl(data.url);
    } catch (err) {
      console.error(err);
      setCustomError("No se pudo subir la imagen. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddToCart = () => {
    const qty = Number(quantity) || 1;
    if (!product || qty <= 0) return;

    setCustomError("");

    let customization = null;

    if (product.customizable) {
      // Si es personalizable, construimos el objeto de personalización.
      if (!areaCode && (customImageUrl || customText)) {
        setCustomError("Selecciona una zona de personalización.");
        return;
      }

      const selectedArea = product.customizationAreas?.find(
        (a) => a.code === areaCode
      );

      // Validación básica en front (el back debe validar también)
      if (selectedArea) {
        const w = Number(widthMm) || 0;
        const h = Number(heightMm) || 0;
        if (w > selectedArea.maxWidthMm || h > selectedArea.maxHeightMm) {
          setCustomError(
            `Las medidas (${w}x${h} mm) superan el máximo permitido en ${selectedArea.name} (${selectedArea.maxWidthMm}x${selectedArea.maxHeightMm} mm).`
          );
          return;
        }
      }

      customization =
        customImageUrl || customText || customNotes || areaCode
          ? {
              enabled: true,
              areaCode: areaCode || null,
              imageUrl: customImageUrl || null,
              text: customText || "",
              notes: customNotes || "",
              widthMm: widthMm ? Number(widthMm) : null,
              heightMm: heightMm ? Number(heightMm) : null,
            }
          : null;
    }

    // IMPORTANTE: tu CartContext debe aceptar el 3er parámetro customization
    addItem(product, qty, customization);
  };

  if (loading) {
    return (
      <Box
        minH="60vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={{ base: 4, md: 6 }} bg={bg} borderRadius="xl" boxShadow="md">
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text color="red.400" fontSize="sm">
          {error || "Producto no encontrado"}
        </Text>
      </Box>
    );
  }

  const selectedArea = product.customizationAreas?.find(
    (a) => a.code === areaCode
  );

  return (
    <Box p={{ base: 4, md: 6 }} bg={bg} borderRadius="xl" boxShadow="md">
      <Button
        leftIcon={<ArrowBackIcon />}
        size="sm"
        mb={4}
        variant="ghost"
        onClick={() => navigate(-1)}
      >
        Volver
      </Button>

      <Box
        display="flex"
        flexDirection={{ base: "column", md: "row" }}
        gap={6}
        bg={cardBg}
        borderRadius="xl"
        p={4}
      >
        {/* Imagen */}
        <Box flex="1" minW={{ base: "100%", md: "320px" }}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              borderRadius="lg"
              w="100%"
              h={{ base: "260px", md: "360px" }}
              objectFit="contain"
            />
          ) : (
            <Box
              borderRadius="lg"
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="gray.400"
              h={{ base: "260px", md: "360px" }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="sm"
              color="gray.500"
            >
              Sin imagen
            </Box>
          )}
        </Box>

        {/* Info + Personalización */}
        <Box flex="2">
          <Stack spacing={4}>
            <HStack justify="space-between">
              <Heading size="lg">{product.name}</Heading>
              <HStack spacing={2}>
                {product.category && (
                  <Badge colorScheme="blue" fontSize="0.8rem">
                    {product.category}
                  </Badge>
                )}
                {product.customizable && (
                  <Badge colorScheme="purple" fontSize="0.7rem">
                    Personalizable
                  </Badge>
                )}
              </HStack>
            </HStack>

            {product.description && (
              <Text fontSize="sm" color="gray.500">
                {product.description}
              </Text>
            )}

            <HStack spacing={6} mt={2}>
              <Text fontSize="2xl" fontWeight="bold">
                {product.price?.toFixed
                  ? product.price.toFixed(2)
                  : product.price}{" "}
                €
              </Text>
              <Text
                fontSize="sm"
                color={product.stock > 0 ? "green.400" : "red.400"}
              >
                {product.stock > 0
                  ? `Stock disponible: ${product.stock}`
                  : "Sin stock"}
              </Text>
            </HStack>

            {/* Bloque de personalización */}
            {product.customizable && (
              <Box
                mt={2}
                p={3}
                borderWidth="1px"
                borderRadius="lg"
                bg={useColorModeValue("gray.50", "gray.700")}
              >
                <Text fontWeight="semibold" mb={2}>
                  Personaliza tu producto
                </Text>
                <Text fontSize="xs" color="gray.500" mb={3}>
                  Sube tu diseño y elige la zona donde quieres que lo
                  imprimamos. Respeta las medidas máximas indicadas.
                </Text>

                <Stack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="sm">Zona de impresión</FormLabel>
                    <Select
                      size="sm"
                      placeholder="Selecciona una zona"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value)}
                    >
                      {product.customizationAreas?.map((area) => (
                        <option key={area.code} value={area.code}>
                          {area.name} ({area.maxWidthMm}x{area.maxHeightMm} mm)
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedArea && (
                    <Alert status="info" fontSize="xs">
                      <AlertIcon />
                      <AlertDescription>
                        Área: {selectedArea.name}. Máximo{" "}
                        {selectedArea.maxWidthMm}x{selectedArea.maxHeightMm} mm.{" "}
                        {selectedArea.notes && ` ${selectedArea.notes}`}
                      </AlertDescription>
                    </Alert>
                  )}

                  <FormControl>
                    <FormLabel fontSize="sm">Imagen a imprimir</FormLabel>
                    <Input
                      type="file"
                      size="sm"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file);
                      }}
                    />
                    {uploading && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Subiendo imagen...
                      </Text>
                    )}
                    {customImageUrl && !uploading && (
                      <Text fontSize="xs" color="green.400" mt={1}>
                        Imagen subida correctamente.
                      </Text>
                    )}
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">
                      Texto (opcional)
                    </FormLabel>
                    <Input
                      size="sm"
                      placeholder="Texto a imprimir"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                    />
                  </FormControl>

                  <HStack spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="sm">Ancho (mm)</FormLabel>
                      <Input
                        size="sm"
                        type="number"
                        value={widthMm}
                        onChange={(e) => setWidthMm(e.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Alto (mm)</FormLabel>
                      <Input
                        size="sm"
                        type="number"
                        value={heightMm}
                        onChange={(e) => setHeightMm(e.target.value)}
                      />
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel fontSize="sm">
                      Instrucciones adicionales
                    </FormLabel>
                    <Textarea
                      size="sm"
                      placeholder="Ej: centrado, reducir tamaño, imprimir solo en blanco, etc."
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                    />
                  </FormControl>

                  {customError && (
                    <Text fontSize="xs" color="red.400">
                      {customError}
                    </Text>
                  )}
                </Stack>
              </Box>
            )}

            <Divider />

            {/* Cantidad + añadir al carrito */}
            <HStack mt={2} spacing={4}>
              <Box>
                <Text mb={1} fontSize="xs" color="gray.500">
                  Cantidad
                </Text>
                <NumberInput
                  size="sm"
                  min={1}
                  max={product.stock || 99}
                  value={quantity}
                  onChange={(value) => setQuantity(value)}
                  isDisabled={product.stock <= 0}
                  w="120px"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>

              <Button
                colorScheme="blue"
                onClick={handleAddToCart}
                isDisabled={product.stock <= 0 || uploading}
              >
                Añadir al carrito
              </Button>
            </HStack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

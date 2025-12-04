/*// src/pages/ProductDetail/ProductDetail.jsx
import { useEffect, useState, useMemo } from "react";
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
  Select,
  Textarea,
  Divider,
  FormControl,
  FormLabel,
  Input,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { apiGetProductById } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // estado para personalización
  const [customText, setCustomText] = useState("");
  const [position, setPosition] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [customImageFile, setCustomImageFile] = useState(null);

  // TODOS los hooks (incluidos useColorModeValue) SIEMPRE aquí arriba
  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const customBoxBg = useColorModeValue("purple.50", "purple.900Alpha.200");

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

  const isCustomizable = !!product?.customizable;

  // Configuración de personalización con valores por defecto seguros
  const customizationConfig = useMemo(() => {
    if (!product || !product.customizationConfig) {
      return {
        maxImages: 1,
        maxTextLength: 50,
        allowedPositions: ["front", "back"],
        allowedColors: ["black", "white", "red"],
        notes: "",
      };
    }

    const cfg = product.customizationConfig;
    const safe = typeof cfg === "object" && cfg !== null ? cfg : {};

    return {
      maxImages: safe.maxImages ?? 1,
      maxTextLength: safe.maxTextLength ?? 50,
      allowedPositions: Array.isArray(safe.allowedPositions)
        ? safe.allowedPositions
        : ["front", "back"],
      allowedColors: Array.isArray(safe.allowedColors)
        ? safe.allowedColors
        : ["black", "white", "red"],
      notes: typeof safe.notes === "string" ? safe.notes : "",
    };
  }, [product]);

  // Inicializa posición/color cuando el producto es personalizable
  useEffect(() => {
    if (isCustomizable) {
      if (!position && customizationConfig.allowedPositions.length > 0) {
        setPosition(customizationConfig.allowedPositions[0]);
      }
      if (!color && customizationConfig.allowedColors.length > 0) {
        setColor(customizationConfig.allowedColors[0]);
      }
    }
  }, [isCustomizable, customizationConfig, position, color]);

  const handleAddToCart = () => {
    const qty = Number(quantity) || 1;
    if (!product || qty <= 0) return;

    let customizationPayload = undefined;

    if (product.customizable) {
      customizationPayload = {
        text: customText || null,
        position: position || null,
        color: color || null,
        notes: notes || null,
        // aquí, por ahora, solo guardamos el nombre del archivo
        imageFileName: customImageFile?.name || null,
      };
    }

    addItem(
      {
        ...product,
        customization: customizationPayload,
      },
      qty
    );
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
            <HStack justify="space-between" align="flex-start">
              <Box>
                <Heading size="lg">{product.name}</Heading>
                {product.category && (
                  <Badge mt={1} colorScheme="blue" fontSize="0.8rem">
                    {product.category}
                  </Badge>
                )}
              </Box>

              {isCustomizable && (
                <Badge colorScheme="purple" alignSelf="flex-start">
                  Personalizable
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

           
            {isCustomizable && (
              <Box
                mt={4}
                p={3}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="purple.300"
                bg={customBoxBg}
              >
                <Heading size="sm" mb={2}>
                  Personaliza tu producto
                </Heading>
                {customizationConfig.notes && (
                  <Text fontSize="xs" color="gray.600" mb={2}>
                    {customizationConfig.notes}
                  </Text>
                )}

                <Stack spacing={3}>
                  
                  <FormControl>
                    <FormLabel fontSize="sm">
                      Imagen de referencia (opcional)
                    </FormLabel>
                    <Input
                      size="sm"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setCustomImageFile(
                          e.target.files && e.target.files[0]
                            ? e.target.files[0]
                            : null
                        )
                      }
                    />
                    {customImageFile && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Archivo seleccionado: {customImageFile.name}
                      </Text>
                    )}
                  </FormControl>

                  
                  <FormControl>
                    <FormLabel fontSize="sm">
                      Texto a imprimir (opcional)
                    </FormLabel>
                    <Input
                      size="sm"
                      maxLength={customizationConfig.maxTextLength}
                      placeholder={`Máx. ${customizationConfig.maxTextLength} caracteres`}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {customText.length}/{customizationConfig.maxTextLength}{" "}
                      caracteres
                    </Text>
                  </FormControl>

                 
                  <FormControl>
                    <FormLabel fontSize="sm">Posición</FormLabel>
                    <Select
                      size="sm"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    >
                      {customizationConfig.allowedPositions.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  
                  <FormControl>
                    <FormLabel fontSize="sm">Color principal</FormLabel>
                    <Select
                      size="sm"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    >
                      {customizationConfig.allowedColors.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                 
                  <FormControl>
                    <FormLabel fontSize="sm">
                      Notas para el diseño (opcional)
                    </FormLabel>
                    <Textarea
                      size="sm"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Indica detalles, por ejemplo: centrar el texto, tamaño aproximado, etc."
                    />
                  </FormControl>
                </Stack>

                <Divider my={3} />

                <Text fontSize="xs" color="gray.500">
                  Una vez realizado el pedido, revisaremos el diseño y, si hay
                  algún problema con la imagen o la posición, nos pondremos en
                  contacto contigo.
                </Text>
              </Box>
            )}

            
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
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  Select,
  Textarea,
  Divider,
  FormControl,
  FormLabel,
  Input,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { apiGetProductById } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  // estado producto / vista
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // estado personalización
  const [customText, setCustomText] = useState("");
  const [position, setPosition] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [customImageFile, setCustomImageFile] = useState(null);

  // hooks de tema SIEMPRE arriba
  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const customBoxBg = useColorModeValue("purple.50", "purple.900Alpha.200");

  // cargar producto
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetProductById(id);
        if (alive) setProduct(data);
      } catch (err) {
        console.error(err);
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      alive = false;
    };
  }, [id]);

  const isCustomizable = !!product?.customizable;

  // configuración de personalización segura
  const customizationConfig = useMemo(() => {
    if (!product || !product.customizationConfig) {
      return {
        maxImages: 1,
        maxTextLength: 50,
        allowedPositions: ["front", "back"],
        allowedColors: ["black", "white", "red"],
        notes: "",
      };
    }

    const cfg = product.customizationConfig;
    const safe = typeof cfg === "object" && cfg !== null ? cfg : {};

    return {
      maxImages: safe.maxImages ?? 1,
      maxTextLength: safe.maxTextLength ?? 50,
      allowedPositions: Array.isArray(safe.allowedPositions)
        ? safe.allowedPositions
        : ["front", "back"],
      allowedColors: Array.isArray(safe.allowedColors)
        ? safe.allowedColors
        : ["black", "white", "red"],
      notes: typeof safe.notes === "string" ? safe.notes : "",
    };
  }, [product]);

  // inicializar selects
  useEffect(() => {
    if (!isCustomizable) return;

    if (!position && customizationConfig.allowedPositions.length > 0) {
      setPosition(customizationConfig.allowedPositions[0]);
    }
    if (!color && customizationConfig.allowedColors.length > 0) {
      setColor(customizationConfig.allowedColors[0]);
    }
  }, [isCustomizable, customizationConfig, position, color]);

  const handleAddToCart = () => {
    const qty = Number(quantity) || 1;
    if (!product || qty <= 0) return;

    let customizationPayload = undefined;

    if (product.customizable) {
      customizationPayload = {
        text: customText || null,
        position: position || null,
        color: color || null,
        notes: notes || null,
        imageFileName: customImageFile?.name || null,
      };
    }

    addItem(
      {
        ...product,
        customization: customizationPayload,
      },
      qty
    );
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

        {/* Info + personalización */}
        <Box flex="2">
          <Stack spacing={3}>
            <HStack justify="space-between" align="flex-start">
              <Box>
                <Heading size="lg">{product.name}</Heading>
                {product.category && (
                  <Badge mt={1} colorScheme="blue" fontSize="0.8rem">
                    {product.category}
                  </Badge>
                )}
              </Box>

              {isCustomizable && (
                <Badge colorScheme="purple" alignSelf="flex-start">
                  Personalizable
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

            {/* Personalización básica */}
            {isCustomizable && (
              <Box
                mt={4}
                p={3}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="purple.300"
                bg={customBoxBg}
              >
                <Heading size="sm" mb={2}>
                  Personaliza tu producto
                </Heading>
                {customizationConfig.notes && (
                  <Text fontSize="xs" color="gray.600" mb={2}>
                    {customizationConfig.notes}
                  </Text>
                )}

                <Stack spacing={3}>
                  {/* Imagen de referencia */}
                  <FormControl>
                    <FormLabel fontSize="sm">
                      Imagen de referencia (opcional)
                    </FormLabel>
                    <Input
                      size="sm"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setCustomImageFile(
                          e.target.files && e.target.files[0]
                            ? e.target.files[0]
                            : null
                        )
                      }
                    />
                    {customImageFile && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Archivo seleccionado: {customImageFile.name}
                      </Text>
                    )}
                  </FormControl>

                  {/* Texto */}
                  <FormControl>
                    <FormLabel fontSize="sm">
                      Texto a imprimir (opcional)
                    </FormLabel>
                    <Input
                      size="sm"
                      maxLength={customizationConfig.maxTextLength}
                      placeholder={`Máx. ${customizationConfig.maxTextLength} caracteres`}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {customText.length}/{customizationConfig.maxTextLength}{" "}
                      caracteres
                    </Text>
                  </FormControl>

                  {/* Posición */}
                  <FormControl>
                    <FormLabel fontSize="sm">Posición</FormLabel>
                    <Select
                      size="sm"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    >
                      {customizationConfig.allowedPositions.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Color */}
                  <FormControl>
                    <FormLabel fontSize="sm">Color principal</FormLabel>
                    <Select
                      size="sm"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    >
                      {customizationConfig.allowedColors.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Notas */}
                  <FormControl>
                    <FormLabel fontSize="sm">
                      Notas para el diseño (opcional)
                    </FormLabel>
                    <Textarea
                      size="sm"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Indica detalles, por ejemplo: centrar el texto, tamaño aproximado, etc."
                    />
                  </FormControl>
                </Stack>

                <Divider my={3} />

                <Text fontSize="xs" color="gray.500">
                  Una vez realizado el pedido, revisaremos el diseño y, si hay
                  algún problema con la imagen o la posición, nos pondremos en
                  contacto contigo.
                </Text>

                {/* Botón hacia el diseñador avanzado (opcional) */}
                <Box mt={3}>
                  <Button
                    as={Link}
                    to={`/personalizar/${product._id}`}
                    size="sm"
                    variant="outline"
                  >
                    Abrir diseñador avanzado
                  </Button>
                </Box>
              </Box>
            )}

            {/* Cantidad + carrito */}
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

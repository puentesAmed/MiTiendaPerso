/*// src/pages/ProductDetail/ProductDetail.jsx
import { useEffect, useState } from "react";
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Select,
  Divider,
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
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeImage, setActiveImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const data = await apiGetProductById(id);
        if (!alive) return;

        setProduct(data);
        const imgs = [
          ...(data.image ? [data.image] : []),
          ...(Array.isArray(data.images) ? data.images : []),
        ];
        setActiveImage(imgs[0] || null);
      } catch {
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) load();
    return () => (alive = false);
  }, [id]);

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={6}>
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text color="red.400">{error || "Producto no encontrado"}</Text>
      </Box>
    );
  }

  const requiresSize = product?.variants?.sizes?.length > 0;
  const requiresColor = product?.variants?.colors?.length > 0;
  const canAddToCart =
    product.stock > 0 &&
    (!requiresSize || selectedSize) &&
    (!requiresColor || selectedColor);

  const handleAddToCart = () => {
    addItem(product, Number(quantity) || 1, null, {
      size: selectedSize || null,
      color: selectedColor || null,
    });
  };

  return (
    <Box>
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
        bg="bgSurface"
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={8}
      >
        {/* GALERÍA */
        /*}
        <Box>
          <Image
            src={activeImage}
            alt={product.name}
            borderRadius="lg"
            w="100%"
            h="360px"
            objectFit="contain"
          />

          <HStack mt={3} spacing={2} justify="center">
            {[product.image, ...(product.images || [])]
              .filter(Boolean)
              .map((img, idx) => (
                <Image
                  key={idx}
                  src={img}
                  boxSize="64px"
                  objectFit="cover"
                  borderRadius="md"
                  cursor="pointer"
                  border="1px solid"
                  borderColor={
                    activeImage === img ? "brand" : "borderSubtle"
                  }
                  onClick={() => setActiveImage(img)}
                />
              ))}
          </HStack>
        </Box>

        {/* BUY BOX */
      /*}
        <Stack spacing={4}>
          <Box>
            <Heading size="lg">{product.name}</Heading>
            {product.category && (
              <Badge mt={1} colorScheme="blue">
                {product.category}
              </Badge>
            )}
          </Box>

          <Text fontSize="3xl" fontWeight="bold">
            {product.price.toFixed(2)} €
          </Text>

          <Text fontSize="sm" color={product.stock > 0 ? "green.400" : "red.400"}>
            {product.stock > 0
              ? `Stock disponible: ${product.stock}`
              : "Sin stock"}
          </Text>

          {(requiresSize || requiresColor) && (
            <HStack spacing={4}>
              {requiresSize && (
                <FormControl>
                  <FormLabel>Talla</FormLabel>
                  <Select
                    size="sm"
                    placeholder="Selecciona"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                  >
                    {product.variants.sizes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </FormControl>
              )}

              {requiresColor && (
                <FormControl>
                  <FormLabel>Color</FormLabel>
                  <Select
                    size="sm"
                    placeholder="Selecciona"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                  >
                    {product.variants.colors.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </FormControl>
              )}
            </HStack>
          )}

          <HStack>
            <NumberInput
              size="sm"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(v) => setQuantity(v)}
              w="100px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>

            <Button
              bg="brand"
              color="white"
              flex="1"
              onClick={handleAddToCart}
              isDisabled={!canAddToCart}
              _hover={{ opacity: 0.9 }}
            >
              Añadir al carrito
            </Button>
          </HStack>

          {/* ENVÍO */
        /*}
          <Box
            p={4}
            borderRadius="lg"
            bg="infoSurface"
            border="1px solid"
            borderColor="borderSubtle"
          >
            <Text fontWeight="semibold">🚚 Envío</Text>
            <Text fontSize="sm">
              El precio y el plazo de entrega se calcularán en el checkout.
            </Text>
            <Text fontSize="xs" color="textMuted">
              Puede variar según la dirección de envío (Península, Islas o internacional).
            </Text>
          </Box>


          {/* DEVOLUCIONES */
        /*}
          <Box p={4} borderRadius="lg" bg="infoSurface">
            <Text fontWeight="semibold">🔄 Devoluciones</Text>
            <Text fontSize="xs" color="textMuted">
              Consulta las condiciones de devolución antes de finalizar la compra.
            </Text>
          </Box>

        </Stack>
      </Box>

      <Divider my={10} />

      {product.description && (
        <Box>
          <Heading size="sm" mb={2}>
            Descripción
          </Heading>
          <Text fontSize="sm" color="textMuted">
            {product.description}
          </Text>
        </Box>
      )}
    </Box>
  );
}
*/
/*
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Select,
  Divider,
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

  // 🔵 INTERNOS
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // 🟠 ALIEXPRESS
  const [selectedSkuAttrs, setSelectedSkuAttrs] = useState(null);

  const [activeImage, setActiveImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ─────────────────────────────
     LOAD PRODUCT
  ───────────────────────────── */
  /*
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const data = await apiGetProductById(id);
        if (!alive) return;

        setProduct(data);

        const imgs = [
          ...(data.image ? [data.image] : []),
          ...(Array.isArray(data.images) ? data.images : []),
        ];
        setActiveImage(imgs[0] || null);
      } catch {
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }
    
    
    if (id) load();
    return () => (alive = false);
  }, [id]);
  
  console.log("🧩 ALIEXPRESS PRODUCT:", product);
  console.log("🧩 FIRST VARIANT:", product?.variants?.[0]);
  /* ─────────────────────────────
     LOADING / ERROR
  ───────────────────────────── */
  /*
  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={6}>
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text color="red.400">{error || "Producto no encontrado"}</Text>
      </Box>
    );
  }

  /* ─────────────────────────────
     DETECCIÓN DE TIPO
  ───────────────────────────── */
  /*
  const isAliExpress =
    Array.isArray(product.variants) &&
    product.variants.length > 0 &&
    product.variants[0]?.skuId;

  /* ─────────────────────────────
     PRODUCTOS INTERNOS (SIN CAMBIOS)
  ───────────────────────────── */
  /*
  const requiresSize = !isAliExpress && product?.variants?.sizes?.length > 0;
  const requiresColor = !isAliExpress && product?.variants?.colors?.length > 0;

  /* ─────────────────────────────
     ALIEXPRESS – ATRIBUTOS DINÁMICOS
  ───────────────────────────── */
  /*
  const aliAttributes = {};

  if (isAliExpress) {
    product.variants.forEach(v => {
      Object.entries(v.attributes || {}).forEach(([key, value]) => {
        if (!aliAttributes[key]) aliAttributes[key] = new Set();
        aliAttributes[key].add(value);
      });
    });
  }

  const activeSku = isAliExpress
    ? product.variants.find(v =>
        Object.entries(selectedSkuAttrs || {}).every(
          ([k, val]) => v.attributes?.[k] === val
        )
      )
    : null;

  /* ─────────────────────────────
     PRECIO / STOCK
  ───────────────────────────── */
  /*
  const displayPrice = isAliExpress
    ? activeSku?.price?.final
    : product.price;

  const displayStock = isAliExpress
    ? activeSku?.stock?.quantity ?? 0
    : product.stock;

  const canAddToCart = isAliExpress
    ? !!activeSku && displayStock > 0
    : displayStock > 0 &&
      (!requiresSize || selectedSize) &&
      (!requiresColor || selectedColor);

  /* ─────────────────────────────
     ADD TO CART
  ───────────────────────────── */
  /*
  const handleAddToCart = () => {
    if (!canAddToCart) return;

    addItem(
      product,
      Number(quantity) || 1,
      isAliExpress
        ? {
            provider: "aliexpress",
            externalId: product.externalId,
            providerSku: activeSku.skuId,
          }
        : null,
      !isAliExpress
        ? {
            size: selectedSize || null,
            color: selectedColor || null,
          }
        : null
    );
  };

  /* ─────────────────────────────
     RENDER
  ───────────────────────────── */
  /*
  return (
    <Box>
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
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={8}
      >
        {/* GALERÍA */
      /*}
        <Box>
          <Image
            src={activeImage}
            alt={product.name}
            borderRadius="lg"
            w="100%"
            h="360px"
            objectFit="contain"
          />

          <HStack mt={3} spacing={2} justify="center">
            {[product.image, ...(product.images || [])]
              .filter(Boolean)
              .map((img, idx) => (
                <Image
                  key={idx}
                  src={img}
                  boxSize="64px"
                  objectFit="cover"
                  borderRadius="md"
                  cursor="pointer"
                  border="1px solid"
                  borderColor={activeImage === img ? "blue.400" : "gray.200"}
                  onClick={() => setActiveImage(img)}
                />
              ))}
          </HStack>
        </Box>

        {/* BUY BOX */
      /*}
        <Stack spacing={4}>
          <Box>
            <Heading size="lg">{product.name}</Heading>
            {product.category && (
              <Badge mt={1} colorScheme="blue">
                {product.category}
              </Badge>
            )}
          </Box>

          <Text fontSize="3xl" fontWeight="bold">
            {displayPrice
              ? `${displayPrice.toFixed(2)} €`
              : "Selecciona una opción"}
          </Text>

          <Text fontSize="sm" color={displayStock > 0 ? "green.400" : "red.400"}>
            {displayStock > 0
              ? `Stock disponible: ${displayStock}`
              : "Sin stock"}
          </Text>

          {/* 🔵 INTERNOS */
        /*}
          {!isAliExpress && (requiresSize || requiresColor) && (
            <HStack spacing={4}>
              {requiresSize && (
                <FormControl>
                  <FormLabel>Talla</FormLabel>
                  <Select
                    size="sm"
                    value={selectedSize}
                    onChange={e => setSelectedSize(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {product.variants.sizes.map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </FormControl>
              )}

              {requiresColor && (
                <FormControl>
                  <FormLabel>Color</FormLabel>
                  <Select
                    size="sm"
                    value={selectedColor}
                    onChange={e => setSelectedColor(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {product.variants.colors.map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </FormControl>
              )}
            </HStack>
          )}

          {/* 🟠 ALIEXPRESS */
        /*}
          {isAliExpress &&
            Object.entries(aliAttributes).map(([attr, values]) => (
              <FormControl key={attr}>
                <FormLabel>{attr}</FormLabel>
                <Select
                  size="sm"
                  onChange={e =>
                    setSelectedSkuAttrs(prev => ({
                      ...(prev || {}),
                      [attr]: e.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {[...values].map(v => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </FormControl>
            ))}

          <HStack>
            <NumberInput
              size="sm"
              min={1}
              max={displayStock}
              value={quantity}
              onChange={v => setQuantity(v)}
              w="100px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>

            <Button
              colorScheme="blue"
              flex="1"
              onClick={handleAddToCart}
              isDisabled={!canAddToCart}
            >
              Añadir al carrito
            </Button>
          </HStack>
        </Stack>
      </Box>

      <Divider my={10} />

      {product.description && (
        <Box>
          <Heading size="sm" mb={2}>
            Descripción
          </Heading>
          <Text fontSize="sm" color="gray.600">
            {product.description}
          </Text>
        </Box>
      )}
    </Box>
  );
}
*/
/*
import { useEffect, useMemo, useState } from "react";
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Select,
  Divider,
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
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [activeImage, setActiveImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ─────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const data = await apiGetProductById(id);
        if (!alive) return;

        setProduct(data);

        const imgs = [
          ...(data?.image ? [data.image] : []),
          ...(Array.isArray(data?.images) ? data.images : []),
        ];
        setActiveImage(imgs[0] || null);
      } catch {
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) load();
    return () => (alive = false);
  }, [id]);

  // ─────────────────────────────────────────────
  // DETECCIÓN ALIEXPRESS (SIEMPRE SE EVALÚA)
  // ─────────────────────────────────────────────
  const isAliExpress =
    product?.provider === "aliexpress" &&
    Array.isArray(product?.variants) &&
    product.variants.length > 0;

  // ─────────────────────────────────────────────
  // ATRIBUTOS DE VARIANTES (SIEMPRE useMemo)
  // ─────────────────────────────────────────────
  const attributeOptions = useMemo(() => {
    if (!isAliExpress) return {};

    const map = {};
    product.variants.forEach((v) => {
      Object.entries(v.attributes || {}).forEach(([k, val]) => {
        if (!map[k]) map[k] = new Set();
        map[k].add(val);
      });
    });

    Object.keys(map).forEach((k) => {
      map[k] = Array.from(map[k]);
    });

    return map;
  }, [isAliExpress, product]);

  // ─────────────────────────────────────────────
  // VARIANTE SELECCIONADA REAL
  // ─────────────────────────────────────────────
  const selectedVariant = useMemo(() => {
    if (!isAliExpress) return null;

    return product.variants.find((v) =>
      Object.entries(selectedAttributes).every(
        ([k, val]) => v.attributes?.[k] === val
      )
    );
  }, [isAliExpress, product, selectedAttributes]);

  const galleryImages = useMemo(() => {
    if (!product) return [];

    const baseImages = [
      ...(product.image ? [product.image] : []),
      ...(Array.isArray(product.images) ? product.images : []),
    ];

    const variantImages = isAliExpress
      ? product.variants
          .map((v) => v.image)
          .filter(Boolean)
      : [];

    return Array.from(new Set([...variantImages, ...baseImages]));
  }, [product, isAliExpress]);


  // ─────────────────────────────────────────────
  // CAMBIO DE IMAGEN POR VARIANTE
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (selectedVariant?.image) {
      setActiveImage(selectedVariant.image);
    }
  }, [selectedVariant]);

  // ─────────────────────────────────────────────
  // ESTADOS VISUALES
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={6}>
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text color="red.400">{error || "Producto no encontrado"}</Text>
      </Box>
    );
  }

  const canAddToCart = isAliExpress
    ? Boolean(selectedVariant)
    : product.stock > 0;

  const displayPrice = isAliExpress
    ? product.price?.final
    : product.price;

  const displayStock = isAliExpress
    ? selectedVariant?.stock?.quantity ?? 0
    : product.stock;

  const handleAddToCart = () => {
    if (isAliExpress && !selectedVariant) return;

    if (isAliExpress) {
      addItem(
        {
          productId: product._id,
          provider: "aliexpress",
          externalId: product.externalId,
          providerSku: selectedVariant.skuId,
          name: product.name || product.title,
          image: selectedVariant.image,
          price: product.price.final,
          attributes: selectedVariant.attributes,
        },
        quantity
      );
    } else {
      addItem(product, quantity);
    }
  };

  return (
    <Box>
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
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={8}
      >
        
        <Box>
          <Image
            src={activeImage}
            alt={product.name || product.title}
            h="360px"
            w="100%"
            objectFit="contain"
            borderRadius="lg"
          />

          {galleryImages.length > 1 && (
            <HStack mt={3} spacing={2} justify="center" flexWrap="wrap">
              {galleryImages.map((img, idx) => (
                <Image
                  key={idx}
                  src={img}
                  boxSize="64px"
                  objectFit="cover"
                  borderRadius="md"
                  cursor="pointer"
                  border="2px solid"
                  borderColor={activeImage === img ? "blue.400" : "transparent"}
                  onClick={() => setActiveImage(img)}
                />
              ))}
            </HStack>
          )}
        </Box>

        
        <Stack spacing={4}>
          <Heading size="lg">
            {product.name || product.title}
          </Heading>

          <Text fontSize="3xl" fontWeight="bold">
            {displayPrice?.toFixed(2)} €
          </Text>

          <Text fontSize="sm" color={displayStock > 0 ? "green.400" : "red.400"}>
            {displayStock > 0
              ? `Stock disponible: ${displayStock}`
              : "Sin stock"}
          </Text>

          {isAliExpress &&
            Object.entries(attributeOptions).map(([attr, values]) => (
              <FormControl key={attr}>
                <FormLabel>{attr}</FormLabel>
                <Select
                  placeholder="Selecciona"
                  value={selectedAttributes[attr] || ""}
                  onChange={(e) =>
                    setSelectedAttributes((prev) => ({
                      ...prev,
                      [attr]: e.target.value,
                    }))
                  }
                >
                  {values.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
              </FormControl>
            ))}

          <HStack>
            <NumberInput
              min={1}
              max={displayStock || 1}
              value={quantity}
              onChange={(v) => setQuantity(Number(v))}
              w="100px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>

            <Button
              colorScheme="blue"
              flex="1"
              onClick={handleAddToCart}
              isDisabled={!canAddToCart}
            >
              Añadir al carrito
            </Button>
          </HStack>
        </Stack>
      </Box>

      <Divider my={10} />

      {product.description && (
        <Box>
          <Heading size="sm" mb={2}>
            Descripción
          </Heading>
          <Text fontSize="sm">{product.description}</Text>
        </Box>
      )}
    </Box>
  );
}
*/


// src/pages/ProductDetail/ProductDetail.jsx
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  Select,
  Divider,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { apiGetProductById } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);

  // 🔹 INTERNOS
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // 🔹 ALIEXPRESS
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [activeImage, setActiveImage] = useState(null);

  const isAliExpress = product?.provider === "aliexpress";

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const data = await apiGetProductById(id);
        if (!alive) return;

        setProduct(data);

        const imgs = [
          ...(data.image ? [data.image] : []),
          ...(Array.isArray(data.images) ? data.images : []),
        ];
        setActiveImage(imgs[0] || null);
      } catch {
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) load();
    return () => (alive = false);
  }, [id]);

  // ─────────────────────────────────────
  // 🟥 ALIEXPRESS: atributos dinámicos
  // ─────────────────────────────────────
  const aliAttributes = useMemo(() => {
    if (!isAliExpress || !Array.isArray(product?.variants)) return {};

    const map = {};
    product.variants.forEach((v) => {
      Object.entries(v.attributes || {}).forEach(([key, value]) => {
        if (!map[key]) map[key] = new Set();
        map[key].add(value);
      });
    });

    Object.keys(map).forEach((k) => {
      map[k] = Array.from(map[k]);
    });

    return map;
  }, [isAliExpress, product]);

  useEffect(() => {
    if (!isAliExpress) return;

    const match = product.variants.find((v) =>
      Object.entries(selectedAttributes).every(
        ([k, vAttr]) => v.attributes?.[k] === vAttr
      )
    );

    setSelectedVariant(match || null);
    if (match?.image) setActiveImage(match.image);
  }, [selectedAttributes, isAliExpress, product]);

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={6}>
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text color="red.400">{error || "Producto no encontrado"}</Text>
      </Box>
    );
  }

  const canAddToCart = isAliExpress
    ? !!selectedVariant
    : product.stock > 0 &&
      (!product?.variants?.sizes?.length || selectedSize) &&
      (!product?.variants?.colors?.length || selectedColor);

  const handleAddToCart = () => {
    addItem(
      product,
      Number(quantity) || 1,
      isAliExpress ? selectedVariant?.skuId : null,
      isAliExpress
        ? { attributes: selectedAttributes }
        : { size: selectedSize || null, color: selectedColor || null }
    );
  };

  const displayedPrice = isAliExpress
  ? selectedVariant?.price?.final ?? product.price?.final
  : product.price?.final;


  return (
    <Box>
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
        bg="bgSurface"
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap={8}
      >
        {/* GALERÍA */}
        <Box>
          <Image
            src={activeImage}
            alt={product.name}
            borderRadius="lg"
            w="100%"
            h="360px"
            objectFit="contain"
          />
        </Box>

        {/* BUY BOX */}
        <Stack spacing={4}>
          <Heading size="lg">{product.name}</Heading>

          <Text fontSize="3xl" fontWeight="bold">
            {displayedPrice?.toFixed(2)} €
          </Text>

          {/* 🟦 VARIANTES INTERNAS */}
          {!isAliExpress && product?.variants && (
            <HStack spacing={4}>
              {product.variants.sizes?.length > 0 && (
                <FormControl>
                  <FormLabel>Talla</FormLabel>
                  <Select
                    size="sm"
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {product.variants.sizes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </FormControl>
              )}

              {product.variants.colors?.length > 0 && (
                <FormControl>
                  <FormLabel>Color</FormLabel>
                  <Select
                    size="sm"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {product.variants.colors.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </FormControl>
              )}
            </HStack>
          )}

          {/* 🟥 VARIANTES ALIEXPRESS */}
          {isAliExpress &&
            Object.entries(aliAttributes).map(([attr, values]) => (
              <FormControl key={attr}>
                <FormLabel>{attr}</FormLabel>
                <Select
                  size="sm"
                  value={selectedAttributes[attr] || ""}
                  onChange={(e) =>
                    setSelectedAttributes((prev) => ({
                      ...prev,
                      [attr]: e.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {values.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </Select>
              </FormControl>
            ))}

          <HStack>
            <NumberInput
              size="sm"
              min={1}
              value={quantity}
              onChange={(v) => setQuantity(v)}
              w="100px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>

            <Button
              bg="brand"
              color="white"
              flex="1"
              onClick={handleAddToCart}
              isDisabled={!canAddToCart}
            >
              Añadir al carrito
            </Button>
          </HStack>
        </Stack>
      </Box>

      <Divider my={10} />

      {product.description && (
        <Box>
          <Heading size="sm" mb={2}>
            Descripción
          </Heading>
          <Text fontSize="sm" color="textMuted">
            {product.description}
          </Text>
        </Box>
      )}
    </Box>
  );
}

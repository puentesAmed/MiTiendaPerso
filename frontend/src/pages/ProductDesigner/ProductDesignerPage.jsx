

// src/pages/ProductDesigner/ProductDesignerPage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Spinner,
  Button,
  useColorModeValue,
  HStack,
  Stack,
} from "@chakra-ui/react";

import { ArrowBackIcon } from "@chakra-ui/icons";
import { apiGetProductById } from "../../services/products.service";
import { useCart } from "../../hooks/useCart";

import { ProductDesigner } from "../../components/ProductDesigner";
import { ProductPreview360 } from "../../components/ProductPreview360";
import { DESIGN_TEMPLATES } from "../../config/designTemplates";

export function ProductDesignerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [design, setDesign] = useState(null);
  const stageRef = useRef(null);
  const [mode, setMode] = useState("edit");

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  /* ────────────────────────────────────────────────
     CARGAR PRODUCTO
  ─────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        const data = await apiGetProductById(id);
        if (alive) setProduct(data);
      } catch (err) {
        setError("No se pudo cargar el producto");
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
    return () => (alive = false);
  }, [id]);

  /* ────────────────────────────────────────────────
     EXPORTAR PREVIEW HD
  ─────────────────────────────────────────────────── */
  const getPreviewImageHD = () => {
    if (!stageRef.current) return null;

    try {
      return stageRef.current.toDataURL({
        pixelRatio: 3, // HD
      });
    } catch (err) {
      console.error("Error exportando preview HD:", err);
      return null;
    }
  };

  /* ────────────────────────────────────────────────
     AÑADIR AL CARRITO (ACTUALIZADO)
  ─────────────────────────────────────────────────── */
  const handleAddToCart = () => {
    if (!product || !design) return;

    const template = DESIGN_TEMPLATES[product.customizationType || "tshirt"];

    const previewHD = getPreviewImageHD();

    const customizationPayload = {
      type: "designer",

      // 🎨 Diseño completo (texto, imágenes, notas)
      design,

      // 🖼 Mockups del producto
      mockupFront: template.frontImage 
        ? window.location.origin + template.frontImage
        : null,
      mockupBack: template.backImage
        ? window.location.origin + template.backImage
        : null,
      previewImageHD: previewHD
    };

    addItem(product, 1, customizationPayload);
    navigate("/carrito");
  };

  /* ────────────────────────────────────────────────
     CAMBIAR MODO
  ─────────────────────────────────────────────────── */
  const handlePreviewClick = () => setMode("preview");
  const handleBackToEdit = () => setMode("edit");

  /* ────────────────────────────────────────────────
     UI PRINCIPAL
  ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box p={6} bg={cardBg} borderRadius="xl">
        <Text color="red.400">{error || "Producto no encontrado"}</Text>
      </Box>
    );
  }

  if (!product.customizable) {
    return (
      <Box p={6} bg={cardBg} borderRadius="xl">
        <Text>Este producto no es personalizable</Text>
      </Box>
    );
  }

  const customizationType = product.customizationType || "tshirt";
  const template = DESIGN_TEMPLATES[customizationType];

  return (
    <Box p={6} bg={bg} borderRadius="xl">
      <HStack justify="space-between" mb={4}>
        <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={() => navigate(-1)}>
          Volver
        </Button>
        <Heading size="md">Personalizar: {product.name}</Heading>
      </HStack>

      <Box bg={cardBg} borderRadius="xl" p={4}>
        <Stack spacing={4}>

          {mode === "edit" ? (
            <ProductDesigner
              frontImage={template.frontImage}
              backImage={template.backImage}
              printArea={template.printArea}
              stageWidth={template.width}
              stageHeight={template.height}
              value={design}
              onChange={setDesign}
              stageRef={stageRef}
            />
          ) : (
            <ProductPreview360
              frames={template.frames360}
              design={design}
              printArea={template.printArea}
              width={template.width}
              height={template.height}
            />
          )}

          <HStack justify="space-between">
            {mode === "edit" ? (
              <Button variant="outline" onClick={handlePreviewClick} disabled={!design}>
                Previsualizar prenda (360º)
              </Button>
            ) : (
              <Button variant="outline" onClick={handleBackToEdit}>
                Volver al editor
              </Button>
            )}

            <Button colorScheme="blue" onClick={handleAddToCart} disabled={!design}>
              Añadir diseño al carrito
            </Button>
          </HStack>
        </Stack>
      </Box>
    </Box>
  );
}

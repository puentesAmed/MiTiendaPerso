/*// src/pages/ProductDesigner/ProductDesignerPage.jsx
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
  const [designImage, setDesignImage] = useState(null); // dataURL del diseño
  const [mode, setMode] = useState("edit"); // 'edit' | 'preview'

  const designerStageRef = useRef(null);

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetProductById(id);
        if (alive) setProduct(data);
      } catch (e) {
        console.error(e);
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

  const handleAddToCart = () => {
    if (!product || !design) return;

    addItem(
      {
        ...product,
        customization: {
          type: "designer",
          design,
          customizationType: product.customizationType || "tshirt",
          previewImage: designImage || null,
        },
      },
      1
    );

    navigate("/carrito");
  };

  const handlePreviewClick = () => {
    if (!designerStageRef.current) return;
    const uri = designerStageRef.current.toDataURL({ pixelRatio: 2 });
    setDesignImage(uri);
    setMode("preview");
  };

  const handleBackToEdit = () => {
    setMode("edit");
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
      <Box p={6} bg={bg} borderRadius="xl" boxShadow="md">
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

  if (!product.customizable) {
    return (
      <Box p={6} bg={bg} borderRadius="xl" boxShadow="md">
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text fontSize="sm">Este producto no admite personalización.</Text>
      </Box>
    );
  }

  const customizationType = product.customizationType || "tshirt";
  const template =
    DESIGN_TEMPLATES[customizationType] || DESIGN_TEMPLATES.tshirt;

  return (
    <Box p={6} bg={bg} borderRadius="xl" boxShadow="md">
      <HStack justify="space-between" mb={4}>
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          variant="ghost"
          onClick={() => navigate(-1)}
        >
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
              stageRef={designerStageRef}   // pasamos ref para exportar imagen
            />
          ) : (
            <ProductPreview360
              frames={template.frames360 || [template.frontImage]}
              designUrl={designImage}
              width={template.width}
              height={template.height}
              printArea={template.printArea}
            />
          )}

          <HStack justify="space-between">
            {mode === "edit" ? (
              <Button
                variant="outline"
                onClick={handlePreviewClick}
                isDisabled={!design}
              >
                Previsualizar prenda (360º)
              </Button>
            ) : (
              <Button variant="outline" onClick={handleBackToEdit}>
                Volver al editor
              </Button>
            )}

            <Button
              colorScheme="blue"
              onClick={handleAddToCart}
              isDisabled={!design}
            >
              Añadir diseño al carrito
            </Button>
          </HStack>
        </Stack>
      </Box>
    </Box>
  );
}
*/

// src/pages/ProductDesigner/ProductDesignerPage.jsx
import { useEffect, useState } from "react";
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
  const [mode, setMode] = useState("edit"); // 'edit' | 'preview'

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetProductById(id);
        if (alive) setProduct(data);
      } catch (e) {
        console.error(e);
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

  const handleAddToCart = () => {
    if (!product || !design) return;

    addItem(
      {
        ...product,
        customization: {
          type: "designer",
          design,
          customizationType: product.customizationType || "tshirt",
        },
      },
      1
    );

    navigate("/carrito");
  };

  const handlePreviewClick = () => {
    if (!design) return;
    setMode("preview");
  };

  const handleBackToEdit = () => {
    setMode("edit");
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
      <Box p={6} bg={bg} borderRadius="xl" boxShadow="md">
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

  if (!product.customizable) {
    return (
      <Box p={6} bg={bg} borderRadius="xl" boxShadow="md">
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          mb={4}
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
        <Text fontSize="sm">Este producto no admite personalización.</Text>
      </Box>
    );
  }

  const customizationType = product.customizationType || "tshirt";
  const template =
    DESIGN_TEMPLATES[customizationType] || DESIGN_TEMPLATES.tshirt;

  return (
    <Box p={6} bg={bg} borderRadius="xl" boxShadow="md">
      <HStack justify="space-between" mb={4}>
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          variant="ghost"
          onClick={() => navigate(-1)}
        >
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
            />
          ) : (
            <ProductPreview360
              frames={template.frames360 || [{ src: template.frontImage, side: "front" }]}
              design={design}
              width={template.width}
              height={template.height}
              printArea={template.printArea}
            />
          )}

          <HStack justify="space-between">
            {mode === "edit" ? (
              <Button
                variant="outline"
                onClick={handlePreviewClick}
                isDisabled={!design}
              >
                Previsualizar prenda (360º)
              </Button>
            ) : (
              <Button variant="outline" onClick={handleBackToEdit}>
                Volver al editor
              </Button>
            )}

            <Button
              colorScheme="blue"
              onClick={handleAddToCart}
              isDisabled={!design}
            >
              Añadir diseño al carrito
            </Button>
          </HStack>
        </Stack>
      </Box>
    </Box>
  );
}

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  Spinner,
  Button,
  HStack,
  Stack,
  useColorModeValue,
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
  const location = useLocation();
  const { addItem } = useCart();

  // 🔗 Ref expuesto por ProductDesigner (exportPreviewForSide, etc.)
  //const stageRef = useRef(null);

  const designerApiRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [design, setDesign] = useState(null);               // diseño editable
  const [committedDesign, setCommittedDesign] = useState(null); // diseño guardado
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("edit");
  const [error, setError] = useState("");

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  /* ───────────────────────────────
     CARGAR PRODUCTO
  ──────────────────────────────── */
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGetProductById(id);
        if (alive) setProduct(data);
      } catch {
        if (alive) setError("No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) load();
    return () => (alive = false);
  }, [id]);

  /* ───────────────────────────────
     SI VENIMOS DESDE CHECKOUT → CARGAR DISEÑO EXISTENTE
  ──────────────────────────────── */
  useEffect(() => {
    if (location.state?.customization?.design) {
      setDesign(location.state.customization.design);
      setCommittedDesign(location.state.customization.design);
      setMode("edit");
    }
  }, [location.state]);

  /* ───────────────────────────────
     SI NO HAY DISEÑO (ENTRADA NORMAL) → CREAR VACÍO
  ──────────────────────────────── */
  useEffect(() => {
    if (
      !design &&
      product?.customizable &&
      !location.state?.customization
    ) {
      setDesign({
        side: "front",
        elementsBySide: { front: [], back: [] },
        notes: "",
      });
    }
  }, [product, design, location.state]);

  /* ───────────────────────────────
     CALLBACK CUANDO EL USUARIO GUARDA DISEÑO
  ──────────────────────────────── */
  const handleDesignerSave = (savedDesign) => {
    setDesign(savedDesign);
    setCommittedDesign(savedDesign);
  };

  /* ───────────────────────────────
     PREVISUALIZAR (360º)
  ──────────────────────────────── */
  const handlePreviewClick = async () => {
    if (!designerApiRef.current?.exportPreviewForSide || !design) return;

    const front = await designerApiRef.current.exportPreviewForSide("front");
    const back = await designerApiRef.current.exportPreviewForSide("back");

    const savedDesign = {
      ...design,
      previewsBySide: { front, back },
    };

    // 🔑 CLAVE: guardar diseño
    setDesign(savedDesign);
    setCommittedDesign(savedDesign);

    setMode("preview");
  };

  /* ───────────────────────────────
     AÑADIR AL CARRITO (USA DISEÑO CONFIRMADO)
  ──────────────────────────────── */
  const handleAddToCart = async () => {
    if (!product || !committedDesign) return;

    let previewsBySide = committedDesign.previewsBySide;

    if (
      (!previewsBySide?.front || !previewsBySide?.back) &&
      designerApiRef.current?.exportPreviewForSide
    ) {
      const front = await designerApiRef.current.exportPreviewForSide("front");
      const back = await designerApiRef.current.exportPreviewForSide("back");
      previewsBySide = { front, back };
    }

    const texts =
      committedDesign.elementsBySide.front
        ?.filter((e) => e.type === "text")
        .map((e) => e.text) || [];

    const customizationPayload = {
      type: "designer",
      design: committedDesign,
      previewsBySide,
      previewImage: previewsBySide?.front || previewsBySide?.back || null,
      textSummary: texts,
    };

    addItem(product, 1, customizationPayload);

    navigate(location.state?.returnTo || "/carrito");
  };

  /* ───────────────────────────────
     UI
  ──────────────────────────────── */
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
        {mode !== "preview" && (
          <Button
            leftIcon={<ArrowBackIcon />}
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            Volver
          </Button>
        )}

        <Heading size="md">Personalizar: {product.name}</Heading>
      </HStack>


      <Box
        bg={cardBg}
        borderRadius="xl"
        p={{ base: 2, md: 4 }}
        display="flex"
        flexDirection="column"
        minH={{ base: "auto", md: "600px" }}
      >

        <Stack spacing={4}>
          {mode === "edit" ? (
            design ? (
              <ProductDesigner
                ref={designerApiRef}
                value={design}
                onChange={handleDesignerSave}
                frontImage={template.frontImage}
                backImage={template.backImage}
                printArea={template.printArea}
                stageWidth={template.width}
                stageHeight={template.height}
              />
            ) : (
              <Spinner size="lg" />
            )
          ) : (
            <ProductPreview360
              frames={template.frames360}
              design={design?.previewsBySide ? design : null}
              width={template.width}
              height={template.height}
            />
          )}

          <HStack justify="space-between">
            {mode === "edit" ? (
              <Button variant="outline" onClick={handlePreviewClick}>
                Previsualizar prenda (360º)
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setMode("edit")}>
                Volver al editor
              </Button>
            )}

            <Button
              colorScheme="blue"
              onClick={handleAddToCart}
              disabled={!committedDesign}
            >
              Añadir diseño al carrito
            </Button>
          </HStack>
        </Stack>
      </Box>
    </Box>
  );
}

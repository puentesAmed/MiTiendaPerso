// src/components/ProductDesigner/ProductDesigner.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Text as KonvaText,
  Transformer,
} from "react-konva";
import {
  Box,
  Stack,
  HStack,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  Text as ChakraText,
  Divider,
  Badge,
  Alert,
  AlertIcon,
  useColorModeValue,
} from "@chakra-ui/react";

import { forwardRef, useImperativeHandle } from "react";

/* ======================================================
   HOOK PARA CARGAR IMÁGENES (HTMLImageElement)
========================================================= */
function useImage(url) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => setImage(img);
  }, [url]);

  return image;
}


function useImagesMap(elements = []) {
  return useMemo(() => {
    const imgs = {};
    elements.forEach((el) => {
      if (el.type === "image" && el.url) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = el.url;
        imgs[el.id] = img;
      }
    });
    return imgs;
  }, [elements]);
}

/* ======================================================
   ELEMENTO IMAGEN EDITABLE
========================================================= */
function DesignerImageElement({ el, onSelect, onChange }) {
  const img = useImage(el.url);
  const shapeRef = useRef(null);

  

  return (
    <KonvaImage
      id={el.id}
      ref={shapeRef}
      image={img}
      x={el.x}
      y={el.y}
      draggable
      scaleX={el.scaleX ?? 1}
      scaleY={el.scaleY ?? 1}
      rotation={el.rotation || 0}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target;
        onChange(el.id, { x: node.x(), y: node.y() });
      }}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();

        onChange(el.id, {
          x: node.x(),
          y: node.y(),
          scaleX,
          scaleY,
          rotation,
        });

        // importante: reset escala visual
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
}

function getElementBounds(el) {
  if (!el) return null;
  if (el.type === "text") {
    const fontSize = el.fontSize || 24;
    const textLength = (el.text || "").length || 1;
    const approxWidth = Math.max(fontSize * 0.6 * textLength, fontSize * 0.8);
    const approxHeight = fontSize * 1.2;
    return { x: el.x || 0, y: el.y || 0, width: approxWidth, height: approxHeight };
  }
  if (el.type === "image") {
    return {
      x: el.x || 0,
      y: el.y || 0,
      width: 120 * Math.abs(el.scaleX ?? 1),
      height: 120 * Math.abs(el.scaleY ?? 1),
    };
  }
  return null;
}

function isBoundsInsidePrintArea(bounds, area) {
  if (!bounds || !area) return true;
  return (
    bounds.x >= area.x &&
    bounds.y >= area.y &&
    bounds.x + bounds.width <= area.x + area.width &&
    bounds.y + bounds.height <= area.y + area.height
  );
}

/* ======================================================
   STAGE DE RENDER PARA EXPORT (OCULTO)
   - Renderiza 1 lado (front/back) completo
========================================================= */
function ExportStage({
  stageRef,
  width,
  height,
  mockupSrc,
  printArea,
  elements,
  side,
}) {
  const currentPrintArea =
  printArea?.front || printArea?.back
    ? printArea[side] || printArea.front
    : printArea;

  const mockupImg = useImage(mockupSrc);
  const imagesMap = useImagesMap(elements);

  return (
    <Box
      position="absolute"
      left="-99999px"
      top="0"
      width="0"
      height="0"
      overflow="hidden"
      pointerEvents="none"
      opacity={0}
    >
      <Stage width={width} height={height} ref={stageRef}>
        <Layer>
          {mockupImg && (
            <KonvaImage image={mockupImg} x={0} y={0} width={width} height={height} />
          )}

          {/* Área imprimible (si quieres que NO salga en el preview, comenta este Rect) */}
          {currentPrintArea && (
            <Rect
              x={currentPrintArea.x}
              y={currentPrintArea.y}
              width={currentPrintArea.width}
              height={currentPrintArea.height}
              stroke="#00B5D8"
              dash={[4, 4]}
            />
          )}

          {(elements || [])
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((el) => {

              if (el.type === "text") {
                return (
                  <KonvaText
                    key={el.id}
                    text={el.text}
                    x={el.x}
                    y={el.y}
                    fontSize={el.fontSize || 24}
                    fontFamily={el.fontFamily || "Arial"}
                    fill={el.fill || "#000000"}
                    rotation={el.rotation || 0}                  
                    listening={false}
                  />


                );
              }

            if (el.type === "image") {
              const img = imagesMap[el.id];
              if (!img) return null;

              return (
                <KonvaImage
                  key={el.id}
                  image={img}
                  x={el.x}
                  y={el.y}
                  scaleX={el.scaleX || 1}
                  scaleY={el.scaleY || 1}
                  rotation={el.rotation || 0}
                />
              );
            }

            return null;
          })}
        </Layer>
      </Stage>
    </Box>
  );
}

/* ======================================================
   COMPONENTE PRINCIPAL
========================================================= */
export const ProductDesigner = forwardRef(function ProductDesigner(
  {
  frontImage,
  backImage,
  printArea = { x: 100, y: 40, width: 260, height: 360 },
  stageWidth = 500,
  stageHeight = 500,
  value,
  onChange,  
  },
  apiRef
) {

  const stageKonvaRef = useRef(null); 
  const exportFrontRef = useRef(null); 
  const exportBackRef = useRef(null);
  
  const [side, setSide] = useState(() => value?.side || "front");
  const [elementsBySide, setElementsBySide] = useState(
    () => value?.elementsBySide || { front: [], back: [] }
  );
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const MAX_HISTORY_STEPS = 30;

  const [selectedId, setSelectedId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const panelBg = useColorModeValue("white", "gray.800");
  const panelBorder = useColorModeValue("gray.200", "gray.700");
  const panelTitle = useColorModeValue("gray.700", "gray.100");
  const sectionTitle = useColorModeValue("gray.600", "gray.300");
  const helperText = useColorModeValue("gray.600", "gray.300");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const canvasWrapperBg = useColorModeValue("gray.50", "gray.900");
  
  const emitDesign = (overrides = {}) => {
    onChange?.({
      side,
      elementsBySide,
      ...overrides,
    });
  };

  const applyElementsBySideChange = (computeNext, { trackHistory = true } = {}) => {
    setElementsBySide((prev) => {
      const next = computeNext(prev);
      if (!next || next === prev) return prev;

      if (trackHistory) {
        setHistoryPast((past) => {
          const updatedPast = [...past, prev];
          if (updatedPast.length > MAX_HISTORY_STEPS) {
            return updatedPast.slice(updatedPast.length - MAX_HISTORY_STEPS);
          }
          return updatedPast;
        });
        setHistoryFuture([]);
      }

      setTimeout(() => emitDesign({ elementsBySide: next }), 0);
      return next;
    });
  };


  
  const layerRef = useRef(null);
  const trRef = useRef(null);
  
  // Stages ocultos para export
  
  
  // Mockup del editor
  const productImg = useImage(side === "front" ? frontImage : backImage);
  
  const currentElements = elementsBySide?.[side] || [];
  const selectedElement = currentElements.find((el) => el.id === selectedId);
  const currentPrintArea =
  printArea?.front || printArea?.back
    ? printArea[side] || printArea.front
    : printArea;
  const selectedBounds = getElementBounds(selectedElement);
  const selectedOutsideSafeArea = selectedElement
    ? !isBoundsInsidePrintArea(selectedBounds, currentPrintArea)
    : false;
  const hasOutOfAreaElements = currentElements.some(
    (el) => !isBoundsInsidePrintArea(getElementBounds(el), currentPrintArea)
  );



  // 🔹 SINCRONIZAR ESTADO INTERNO CUANDO CAMBIA `value`
// 🔹 NECESARIO PARA QUE EL TAMAÑO DEL TEXTO NO SE RESETEE AL PREVISUALIZAR
  useImperativeHandle(apiRef, () => ({ 
    exportPreviewForSide: async (side = "front", pixelRatio = 2) => { 
      const ref = side === "back" ? exportBackRef : exportFrontRef; 
      const stage = ref.current; 
      if (!stage) return null; 
      await new Promise((r) => requestAnimationFrame(r)); 
      stage.batchDraw(); 
      try { 
        return stage.toDataURL({ pixelRatio }); 
      } catch { 
        return null;
        } 
      }, 
      
      exportPreviewsBySide: async (pixelRatio = 2) => { 
        return { 
          front: await apiRef.current.exportPreviewForSide("front", pixelRatio), 
          back: await apiRef.current.exportPreviewForSide("back", pixelRatio), 
        }; 
      }, 
    }));  


 // 🔄 Rehidratar diseñador cuando cambia el diseño externo (preview, volver, etc.)
useEffect(() => {
  if (!value) return;

  const rehydrateTimer = setTimeout(() => {
    setSide(value.side || "front");
    setElementsBySide(value.elementsBySide || { front: [], back: [] });
    setHistoryPast([]);
    setHistoryFuture([]);
    // Mantener selección estable mientras el elemento siga existiendo
    setSelectedId((prevSelectedId) => {
      if (!prevSelectedId) return null;
      const nextSide = value.side || "front";
      const nextElements = value.elementsBySide?.[nextSide] || [];
      return nextElements.some((el) => el.id === prevSelectedId) ? prevSelectedId : null;
    });
  }, 0);

  return () => clearTimeout(rehydrateTimer);
}, [value]);


  /* ======================================================
     Transformer sync
========================================================= */
  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;
    const stage = layerRef.current.getStage();

    if (!selectedId) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
      return;
    }

    const node = stage.findOne(`#${selectedId}`);
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, side, elementsBySide]);



  /* ======================================================
     CRUD elementos
========================================================= */
  const updateElement = (id, attrs) => {
    applyElementsBySideChange((prev) => {
      const updated = {
        ...prev,
        [side]: prev[side].map((el) =>
          el.id === id ? { ...el, ...attrs } : el
        ),
      };
      return updated;
    });
  };


  const handleAddText = () => {
    const id = crypto.randomUUID();
    const newText = {
      id,
      type: "text",
      text: "Texto aquí",
      x: currentPrintArea.x + 20,
      y: currentPrintArea.y + 20,
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#000000",
      rotation: 0,
      order: (elementsBySide?.[side]?.length || 0),
    };

    applyElementsBySideChange((prev) => {
      const updated = {
        ...prev,
        [side]: [...(prev?.[side] || []), newText],
      };
      return updated;
    });

  };


  const handleAddImage = (file) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result;

      img.onload = () => {
        const id = crypto.randomUUID();

        // 🔹 calcular escala para que encaje en la printArea
        const scale = Math.min(
          currentPrintArea.width / img.width,
          currentPrintArea.height / img.height
        );

        const newImg = {
          id,
          type: "image",
          url: reader.result, // dataURL
          x: currentPrintArea.x + currentPrintArea.width / 2,
          y: currentPrintArea.y + currentPrintArea.height / 2,
          scaleX: scale,
          scaleY: scale,
          rotation: 0,
          order: (elementsBySide?.[side]?.length || 0),
        };

        applyElementsBySideChange((prev) => {
          const updated = {
            ...prev,
            [side]: [...(prev?.[side] || []), newImg],
          };
          return updated;
        });


        setSelectedId(id);
      };
    };

    reader.readAsDataURL(file);
  };


  const handleDeleteSelected = () => {
    if (!selectedId) return;
    applyElementsBySideChange((prev) => {
      const updated = {
        ...prev,
        [side]: prev[side].filter((el) => el.id !== selectedId),
      };
      return updated;
    });

    setSelectedId(null);
  };

  const handleFitSelectedInPrintArea = () => {
    if (!selectedElement || !currentPrintArea || !selectedBounds) return;
    const maxX = currentPrintArea.x + currentPrintArea.width - selectedBounds.width;
    const maxY = currentPrintArea.y + currentPrintArea.height - selectedBounds.height;
    const nextX = Math.min(Math.max(selectedBounds.x, currentPrintArea.x), maxX);
    const nextY = Math.min(Math.max(selectedBounds.y, currentPrintArea.y), maxY);
    updateElement(selectedElement.id, { x: nextX, y: nextY });
  };


  /* ======================================================
     Guardar diseño (SIN CAMBIAR SIDE)
     Genera previewsBySide usando stages ocultos.
========================================================= */
  const handleSaveDesign = async () => {
    if (!apiRef?.current) return;

    const previewsBySide = await apiRef.current.exportPreviewsBySide(2);


    setSavedAt(new Date().toISOString());

    onChange?.({
      side,
      elementsBySide,
      previewsBySide,
    });
  };


  // Función para mover capa arriba/abajo
  const moveLayer = (id, direction) => {
    applyElementsBySideChange((prev) => {
      const list = [...(prev?.[side] || [])];
      const index = list.findIndex((el) => el.id === id);
      if (index === -1) return prev;

      const target =
        direction === "up" ? index + 1 : index - 1;

      if (target < 0 || target >= list.length) return prev;

      [list[index], list[target]] = [list[target], list[index]];

      const updated = {
        ...prev,
        [side]: list.map((el, i) => ({ ...el, order: i })),
      };
      return updated;
    });
  };

  const setLayerPosition = (id, mode) => {
    applyElementsBySideChange((prev) => {
      const list = [...(prev?.[side] || [])];
      const index = list.findIndex((el) => el.id === id);
      if (index === -1) return prev;

      const [item] = list.splice(index, 1);

      if (mode === "toFront") list.push(item);
      else if (mode === "toBack") list.unshift(item);
      else return prev;

      const updated = {
        ...prev,
        [side]: list.map((el, i) => ({ ...el, order: i })),
      };
      return updated;
    });
  };

  const handleDuplicateSelected = () => {
    if (!selectedElement) return;
    const duplicated = {
      ...selectedElement,
      id: crypto.randomUUID(),
      x: (selectedElement.x || 0) + 14,
      y: (selectedElement.y || 0) + 14,
      order: (elementsBySide?.[side]?.length || 0),
    };

    applyElementsBySideChange((prev) => {
      const updated = {
        ...prev,
        [side]: [...(prev?.[side] || []), duplicated],
      };
      return updated;
    });

    setSelectedId(duplicated.id);
  };

  const handleCenterSelectedInPrintArea = () => {
    if (!selectedElement || !currentPrintArea || !selectedBounds) return;
    const centeredX = currentPrintArea.x + (currentPrintArea.width - selectedBounds.width) / 2;
    const centeredY = currentPrintArea.y + (currentPrintArea.height - selectedBounds.height) / 2;
    updateElement(selectedElement.id, { x: centeredX, y: centeredY });
  };

  const handleUndo = () => {
    if (!historyPast.length) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((past) => past.slice(0, -1));
    setHistoryFuture((future) => [elementsBySide, ...future].slice(0, MAX_HISTORY_STEPS));
    setElementsBySide(previous);
    setSelectedId(null);
    setTimeout(() => emitDesign({ elementsBySide: previous }), 0);
  };

  const handleRedo = () => {
    if (!historyFuture.length) return;
    const next = historyFuture[0];
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past, elementsBySide].slice(-MAX_HISTORY_STEPS));
    setElementsBySide(next);
    setSelectedId(null);
    setTimeout(() => emitDesign({ elementsBySide: next }), 0);
  };

  /* ======================================================
     Render
========================================================= */
  return (
    <>
      {/* STAGES OCULTOS PARA EXPORT (NO TOCAN EL UI) */}
      <ExportStage
        stageRef={exportFrontRef}
        width={stageWidth}
        height={stageHeight}
        mockupSrc={frontImage}
        printArea={printArea}
        elements={elementsBySide?.front || []}
      />
      <ExportStage
        stageRef={exportBackRef}
        width={stageWidth}
        height={stageHeight}
        mockupSrc={backImage}
        printArea={printArea}
        elements={elementsBySide?.back || []}
      />

      <Stack
        direction={{ base: "column", lg: "row" }}
        align="stretch"
        spacing={{ base: 4, lg: 6 }}
        minH={{ base: "auto", lg: "calc(100vh - 140px)" }}
      >
        {/* CANVAS RESPONSIVE */}
      <Box
        order={{ base: 1, lg: 2 }}
        flex="1"
        display="flex"
        justifyContent="center"
        alignItems="center"
        overflow="hidden"
        bg={canvasWrapperBg}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={panelBorder}
      >
        {/* CANVAS EDITOR */}
        <Box
          width="100%"
          maxW={{ base: "100%", lg: `${stageWidth}px` }}
          display="flex"
          justifyContent="center"
          alignItems="center"
          overflowX="auto"
        >
          <Box minW={`${stageWidth}px`}>
          <Stage
             width={stageWidth}
            height={stageHeight}
            ref={stageKonvaRef}
            onMouseDown={(e) =>
              e.target === e.target.getStage() && setSelectedId(null)
            }
          >
            
            <Layer ref={layerRef}>
            {/* 🔹 TODO LO VISUAL SE DESPLAZA JUNTO */}
            
              {productImg && (
                <KonvaImage
                  image={productImg}                  
                  width={stageHeight}
                  height={stageHeight}
                />
              )}

              <Rect
                x={currentPrintArea.x}
                y={currentPrintArea.y}
                width={currentPrintArea.width}
                height={currentPrintArea.height}
                stroke="#00B5D8"
                strokeWidth={2}
                dash={[4, 4]}
              />

              {currentElements
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((el) => {
                  if (el.type === "text") {
                    return (
                      <KonvaText
                        key={el.id}
                        id={el.id}
                        text={el.text}
                        x={el.x}
                        y={el.y}
                        fontSize={el.fontSize || 24}
                        fontFamily={el.fontFamily || "Arial"}
                        fill={el.fill || "#000"}
                        rotation={el.rotation || 0}
                        draggable
                        onClick={() => setSelectedId(el.id)}
                        onTap={() => setSelectedId(el.id)}
                        onDragEnd={(e) =>
                          updateElement(el.id, { x: e.target.x(), y: e.target.y() })
                        }
                        onTransformEnd={(e) => {
                          const node = e.target;

                          const scaleX = node.scaleX();
                          const scaleY = node.scaleY();

                          // 🔹 Mantén proporción: usamos el mayor para que no “encoga” raro
                          const scale = Math.max(scaleX, scaleY);

                          // ✅ Guardar tamaño real en el estado (esto es lo que faltaba)
                          updateElement(el.id, {
                            x: node.x(),
                            y: node.y(),
                            fontSize: (el.fontSize || 24) * scale,
                            rotation: node.rotation(),
                          });

                          // importante: reset de escala visual
                          node.scaleX(1);
                          node.scaleY(1);
                        }}
                      />
                    );
                  }


                if (el.type === "image") {
                  return (
                    <DesignerImageElement
                      key={el.id}
                      el={el}
                      isSelected={selectedId === el.id}
                      onSelect={() => setSelectedId(el.id)}
                      onChange={updateElement}
                    />
                  );
                }

                return null;
              })}

            <Transformer ref={trRef} rotateEnabled />
            
          </Layer>
          </Stage>
          </Box>
        </Box>
      </Box>

        {/* PANEL LATERAL */}
        <Stack
          order={{ base: 2, lg: 1 }}
          minW={{ base: "100%", lg: "280px" }}
          maxW={{ base: "100%", lg: "320px" }}
          spacing={{ base: 3, lg: 4 }}
          overflowY="auto"
          maxH={{ base: "none", lg: "calc(100vh - 140px)" }}
          pr={{ base: 0, lg: 2 }}
          bg={panelBg}
          borderWidth="1px"
          borderColor={panelBorder}
          borderRadius="lg"
          p={{ base: 3, lg: 3 }}
        >
          <HStack justify="space-between" align="center">
            <ChakraText fontWeight="bold" fontSize="sm" color={panelTitle}>
              Editor de diseño
            </ChakraText>
            <Badge colorScheme={selectedElement ? "green" : "gray"} variant="subtle">
              {selectedElement ? "Elemento seleccionado" : "Sin selección"}
            </Badge>
          </HStack>
          <Alert
            status={hasOutOfAreaElements ? "warning" : "success"}
            borderRadius="md"
            py={2}
            px={3}
          >
            <AlertIcon />
            <ChakraText fontSize="xs">
              {hasOutOfAreaElements
                ? "Hay elementos fuera del área imprimible."
                : "Diseño correcto dentro del área imprimible."}
            </ChakraText>
          </Alert>

          <ChakraText fontSize="xs" color={helperText}>
            Añade texto o imagen y arrastra los elementos sobre el área imprimible.
          </ChakraText>

          <Divider />

          <ChakraText fontWeight="semibold" fontSize="xs" color={sectionTitle} textTransform="uppercase">
            Contenido
          </ChakraText>
          <FormControl>
            <FormLabel>Lado del producto</FormLabel>
            <Select
              size={{ base: "md", lg: "sm" }}
              value={side}
              onChange={(e) => {
                const newSide = e.target.value;
                setSide(newSide);
                setSelectedId(null);

                emitDesign({ side: newSide });
              }}
            >
              <option value="front">Delante</option>
              <option value="back">Detrás</option>
            </Select>
          </FormControl>

          <Button size={{ base: "md", lg: "sm" }} onClick={handleAddText}>
            Añadir texto
          </Button>

          <FormControl>
            <FormLabel>Subir imagen</FormLabel>
            <Input
              type="file"
              accept="image/*"
              size={{ base: "md", lg: "sm" }}
              onChange={(e) => handleAddImage(e.target.files?.[0])}
            />
          </FormControl>

          <Divider />
          <ChakraText fontWeight="semibold" fontSize="xs" color={sectionTitle} textTransform="uppercase">
            Acciones
          </ChakraText>

          <Button colorScheme="green" size={{ base: "md", lg: "sm" }} onClick={handleSaveDesign}>
            Guardar diseño
          </Button>
          <HStack>
            <Button
              size={{ base: "sm", lg: "xs" }}
              variant="outline"
              onClick={handleUndo}
              isDisabled={!historyPast.length}
            >
              Deshacer
            </Button>
            <Button
              size={{ base: "sm", lg: "xs" }}
              variant="outline"
              onClick={handleRedo}
              isDisabled={!historyFuture.length}
            >
              Rehacer
            </Button>
          </HStack>

          {savedAt && (
            <ChakraText fontSize="xs" color={mutedText}>
              Guardado: {new Date(savedAt).toLocaleString()}
            </ChakraText>
          )}

          <Divider />
          <ChakraText fontWeight="semibold" fontSize="xs" color={sectionTitle} textTransform="uppercase">
            Inspector
          </ChakraText>

          {selectedElement && (
            <>
              <ChakraText fontWeight="bold" fontSize="sm">
                Elemento seleccionado
              </ChakraText>
              <HStack>
                <Button
                  size={{ base: "sm", lg: "xs" }}
                  variant="outline"
                  onClick={handleDuplicateSelected}
                  isDisabled={!selectedElement}
                >
                  Duplicar
                </Button>
                <Button
                  size={{ base: "sm", lg: "xs" }}
                  variant="outline"
                  onClick={handleCenterSelectedInPrintArea}
                  isDisabled={!selectedElement}
                >
                  Centrar en área
                </Button>
              </HStack>
              {selectedOutsideSafeArea && (
                <Alert status="warning" borderRadius="md" py={2}>
                  <AlertIcon />
                  <ChakraText fontSize="xs">
                    Este elemento está fuera del área imprimible.
                  </ChakraText>
                </Alert>
              )}

              {selectedElement.type === "text" && (
                <>
                  <FormControl>
                    <FormLabel fontSize="sm">Texto</FormLabel>
                    <Input
                      size={{ base: "md", lg: "sm" }}
                      value={selectedElement.text || ""}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { text: e.target.value })
                      }
                    />
                  </FormControl>

                  <ChakraText fontWeight="semibold" fontSize="xs" color={sectionTitle} textTransform="uppercase" mt={1}>
                    Estilo
                  </ChakraText>

                  <FormControl>
                    <FormLabel fontSize="sm">Fuente</FormLabel>
                    <Select
                      size={{ base: "md", lg: "sm" }}
                      value={selectedElement.fontFamily || "Arial"}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          fontFamily: e.target.value,
                        })
                      }
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Comic Sans MS">Comic Sans MS</option>
                      <option value="Impact">Impact</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Tamaño</FormLabel>
                    <NumberInput
                      size={{ base: "md", lg: "sm" }}
                      min={8}
                      max={120}
                      value={selectedElement.fontSize || 24}
                      onChange={(v) =>
                        updateElement(selectedElement.id, { fontSize: Number(v) || 24 })
                      }
                    >
                      <NumberInputField />
                    </NumberInput>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Color</FormLabel>
                    <Input
                      size={{ base: "md", lg: "sm" }}
                      type="color"
                      value={selectedElement.fill || "#ffffff"}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { fill: e.target.value })
                      }
                    />
                  </FormControl>
                </>
              )}

              <ChakraText fontWeight="semibold" fontSize="xs" color={sectionTitle} textTransform="uppercase" mt={1}>
                Posición / Tamaño
              </ChakraText>

              <FormControl>
                <FormLabel fontSize="sm">Rotación</FormLabel>
                <NumberInput
                  size={{ base: "md", lg: "sm" }}
                  min={-180}
                  max={180}
                  value={selectedElement.rotation || 0}
                  onChange={(v) =>
                    updateElement(selectedElement.id, { rotation: Number(v) || 0 })
                  }
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <Divider my={2} />
              <ChakraText fontWeight="semibold" fontSize="xs" color={sectionTitle} textTransform="uppercase">
                Capas
              </ChakraText>

              
              <HStack flexWrap="wrap">
                <Button
                  size={{ base: "sm", lg: "xs" }}
                  onClick={() => moveLayer(selectedElement.id, "up")}
                  isDisabled={!selectedElement}
                >
                  ↑ Al frente
                </Button>
                <Button
                  size={{ base: "sm", lg: "xs" }}
                  onClick={() => moveLayer(selectedElement.id, "down")}
                  isDisabled={!selectedElement}
                >
                  ↓ Al fondo
                </Button>
                <Button
                  size={{ base: "sm", lg: "xs" }}
                  variant="outline"
                  onClick={() => setLayerPosition(selectedElement.id, "toFront")}
                  isDisabled={!selectedElement}
                >
                  Traer al frente
                </Button>
                <Button
                  size={{ base: "sm", lg: "xs" }}
                  variant="outline"
                  onClick={() => setLayerPosition(selectedElement.id, "toBack")}
                  isDisabled={!selectedElement}
                >
                  Enviar al fondo
                </Button>
              </HStack>

              <ChakraText fontSize="xs" color={mutedText}>
                Consejo: arrastra directamente en el canvas para mover elementos.
              </ChakraText>

              <Button
                size={{ base: "sm", lg: "xs" }}
                colorScheme="red"
                variant="outline"
                onClick={handleDeleteSelected}
                isDisabled={!selectedElement}
              >
                Eliminar elemento
              </Button>
              {selectedOutsideSafeArea && (
                <Button
                  size={{ base: "sm", lg: "xs" }}
                  colorScheme="blue"
                  variant="ghost"
                  onClick={handleFitSelectedInPrintArea}
                >
                  Ajustar dentro del área
                </Button>
              )}
            </>
          )}

          {!selectedElement && (
            <ChakraText fontSize="xs" color={mutedText}>
              Selecciona un elemento del diseño para editar su contenido, estilo y capas.
            </ChakraText>
          )}

          <Divider />
          <ChakraText fontSize="sm" color={mutedText} lineHeight="1.4">
            Las indicaciones adicionales del pedido (envío, producción especial, etc.) podrás añadirlas
            más adelante en el formulario de finalización de compra.
          </ChakraText>
        </Stack>
      </Stack>
    </>
  );
}

)

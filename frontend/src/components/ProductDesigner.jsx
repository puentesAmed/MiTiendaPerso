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
  
} from "@chakra-ui/react";

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
  const [images, setImages] = useState({});

  useEffect(() => {
    const imgs = {};
    elements.forEach((el) => {
      if (el.type === "image" && el.url) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = el.url;
        imgs[el.id] = img;
      }
    });
    setImages(imgs);
  }, [elements]);

  return images;
}

/* ======================================================
   ELEMENTO IMAGEN EDITABLE
========================================================= */
function DesignerImageElement({ el, isSelected, onSelect, onChange }) {
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
export function ProductDesigner({
  frontImage,
  backImage,
  printArea = { x: 100, y: 40, width: 260, height: 360 },
  stageWidth = 500,
  stageHeight = 500,
  value,
  onChange,
  stageRef,
}) {
  
  const [side, setSide] = useState(() => value?.side || "front");
  const [elementsBySide, setElementsBySide] = useState(
    () => value?.elementsBySide || { front: [], back: [] }
  );
  //const [notes, setNotes] = useState(() => value?.notes || "");

  const [selectedId, setSelectedId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  
  const emitDesign = (overrides = {}) => {
    onChange?.({
      side,
      elementsBySide,
      ...overrides,
    });
  };


  // Stage principal (editor)
  const internalStageRef = useRef(null);
  const effectiveStageRef = stageRef || internalStageRef;
  
  const layerRef = useRef(null);
  const trRef = useRef(null);
  
  // Stages ocultos para export
  const exportFrontRef = useRef(null);
  const exportBackRef = useRef(null);
  
  // Mockup del editor
  const productImg = useImage(side === "front" ? frontImage : backImage);
  
  const currentElements = elementsBySide?.[side] || [];
  const selectedElement = currentElements.find((el) => el.id === selectedId);
  const currentPrintArea =
  printArea?.front || printArea?.back
    ? printArea[side] || printArea.front
    : printArea;


  // 🔑 CLAVE: evitar sobrescritura del diseño inicial
  const hasInitializedRef = useRef(false);

  // 🔹 SINCRONIZAR ESTADO INTERNO CUANDO CAMBIA `value`
// 🔹 NECESARIO PARA QUE EL TAMAÑO DEL TEXTO NO SE RESETEE AL PREVISUALIZAR



  /* ======================================================
     🔹 OFFSET PARA CENTRAR BLOQUE VISUAL
========================================================= */
  const DESIGN_BLOCK_WIDTH = 500; // 🔹 mismo ancho visual que ya usas
  const offsetX = (stageWidth - DESIGN_BLOCK_WIDTH) / 2; // 🔹 NUEVO

 // 🔄 Rehidratar diseñador cuando cambia el diseño externo (preview, volver, etc.)
useEffect(() => {
  if (!value) return;

  setSide(value.side || "front");
  setElementsBySide(value.elementsBySide || { front: [], back: [] });

  // reset selección para evitar referencias inválidas
  setSelectedId(null);
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
     Exponer métodos en stageRef.current (IMPORTANTE)
     Para que ProductDesignerPage pueda llamarlos.
========================================================= */
  useEffect(() => {
    const stage = effectiveStageRef.current;
    if (!stage) return;

    /*stage.exportPreviewForSide = (sideName = "front", pixelRatio = 2) => {
      const ref = sideName === "back" ? exportBackRef : exportFrontRef;
      const s = ref.current;
      if (!s) return null;

      try {
        return s.toDataURL({ pixelRatio });
      } catch {
        return null;
      }
    };*/

    stage.exportPreviewForSide = async (sideName = "front", pixelRatio = 2) => {
      const ref = sideName === "back" ? exportBackRef : exportFrontRef;
      const s = ref.current;
      if (!s) return null;

      // ⏱️ esperar a que React + Konva rendericen el texto
      await new Promise((resolve) => requestAnimationFrame(resolve));

      s.batchDraw();

      try {
        return s.toDataURL({ pixelRatio });
      } catch {
        return null;
      }
    };



    /*stage.exportPreviewsBySide = (pixelRatio = 2) => {
      return {
        front: stage.exportPreviewForSide("front", pixelRatio),
        back: stage.exportPreviewForSide("back", pixelRatio),
        };
      };*/

    stage.exportPreviewsBySide = async (pixelRatio = 2) => {
      return {
        front: await stage.exportPreviewForSide("front", pixelRatio),
        back: await stage.exportPreviewForSide("back", pixelRatio),
      };
    };
  

      
    
  }, [effectiveStageRef, elementsBySide, frontImage, backImage]);

  /* ======================================================
     CRUD elementos
========================================================= */
  const updateElement = (id, attrs) => {
    setElementsBySide((prev) => {
      const updated = {
        ...prev,
        [side]: prev[side].map((el) =>
          el.id === id ? { ...el, ...attrs } : el
        ),
      };

      // 🔑 sincroniza con el padre
      setTimeout(() => emitDesign({ elementsBySide: updated }), 0);

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

    setElementsBySide((prev) => {
      const updated = {
        ...prev,
        [side]: [...(prev?.[side] || []), newText],
      };

      setTimeout(() => emitDesign({ elementsBySide: updated }), 0);

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

        setElementsBySide((prev) => {
          const updated = {
            ...prev,
            [side]: [...(prev?.[side] || []), newImg],
          };

          setTimeout(() => emitDesign({ elementsBySide: updated }), 0);

          return updated;
        });


        setSelectedId(id);
      };
    };

    reader.readAsDataURL(file);
  };


  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setElementsBySide((prev) => {
      const updated = {
        ...prev,
        [side]: prev[side].filter((el) => el.id !== selectedId),
      };

      setTimeout(() => emitDesign({ elementsBySide: updated }), 0);

      return updated;
    });

    setSelectedId(null);
  };

  const handleStageClick = (e) => {
    if (e.target === e.target.getStage()) setSelectedId(null);
  };

  /* ======================================================
     Guardar diseño (SIN CAMBIAR SIDE)
     Genera previewsBySide usando stages ocultos.
========================================================= */
  const handleSaveDesign = async() => {
    const stage = effectiveStageRef.current;
    if (!stage) return;

    const previewsBySide = await stage.exportPreviewsBySide(2);

    console.log("PREVIEWS:", previewsBySide);

    console.log(
      "¿FRONT === BACK?",
      previewsBySide.front === previewsBySide.back
    );
    console.log("PREVIEWS:", previewsBySide);

    setSavedAt(new Date().toISOString());

    onChange?.({
      side,
      elementsBySide,      
      previewsBySide,
    });
  };

  // Función para mover capa arriba/abajo
  const moveLayer = (id, direction) => {
    setElementsBySide((prev) => {
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

      setTimeout(() => emitDesign({ elementsBySide: updated }), 0);

      return updated;

    });
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

      <HStack
        align="stretch"
        spacing={6}
        height="calc(100vh - 140px)"
      >
        {/* PANEL LATERAL */}
        <Stack
          minW="280px"
          maxW="320px"
          spacing={4}
          overflowY="auto"     
          pr={2}
        >
          <FormControl>
            <FormLabel>Lado del producto</FormLabel>
            <Select
              size="sm"
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

          <Divider />

          <Button size="sm" onClick={handleAddText}>
            Añadir texto
          </Button>

          <Divider />

          <FormControl>
            <FormLabel>Subir imagen</FormLabel>
            <Input
              type="file"
              accept="image/*"
              size="sm"
              onChange={(e) => handleAddImage(e.target.files?.[0])}
            />
          </FormControl>

          <Divider />

          <FormControl>
            <FormLabel>Notas adicionales</FormLabel>
            <ChakraText
              fontSize="sm"
              color="gray.400"
              whiteSpace="normal"      
              wordBreak="break-word" 
              maxW="100%"              
              lineHeight="1.4"
            >
              Las indicaciones adicionales del pedido (envío, producción, producción especial, etc.)
              podrás añadirlas más adelante en el formulario de finalización de compra.
            </ChakraText>
          </FormControl>

          <Divider />

          <Button colorScheme="green" size="sm" onClick={handleSaveDesign}>
            Guardar diseño
          </Button>

          {savedAt && (
            <ChakraText fontSize="xs" color="gray.500">
              Guardado: {new Date(savedAt).toLocaleString()}
            </ChakraText>
          )}

          <Divider />

          {selectedElement && (
            <>
              <ChakraText fontWeight="bold" fontSize="sm">
                Elemento seleccionado
              </ChakraText>

              {selectedElement.type === "text" && (
                <>
                  <FormControl>
                    <FormLabel fontSize="sm">Texto</FormLabel>
                    <Input
                      size="sm"
                      value={selectedElement.text || ""}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { text: e.target.value })
                      }
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Fuente</FormLabel>
                    <Select
                      size="sm"
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
                      size="sm"
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
                      size="sm"
                      type="color"
                      value={selectedElement.fill || "#ffffff"}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { fill: e.target.value })
                      }
                    />
                  </FormControl>
                </>
              )}

              <FormControl>
                <FormLabel fontSize="sm">Rotación</FormLabel>
                <NumberInput
                  size="sm"
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

              
              <HStack>
                <Button size="xs" onClick={() => moveLayer(selectedElement.id, "up")}>
                  ↑ Al frente
                </Button>
                <Button size="xs" onClick={() => moveLayer(selectedElement.id, "down")}>
                  ↓ Al fondo
                </Button>
              </HStack>



              <Button
                size="xs"
                colorScheme="red"
                variant="outline"
                onClick={handleDeleteSelected}
              >
                Eliminar elemento
              </Button>
            </>
          )}
        </Stack>

        {/* CANVAS RESPONSIVE */}
      <Box
        flex="1"
        display="flex"
        justifyContent="center"
        alignItems="center"
        overflow="hidden"
      >



        {/* CANVAS EDITOR */}
        <Box
          width="100%"
          maxW={`${stageWidth}px`}
          aspectRatio={stageWidth / stageHeight}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >

          <Stage
             width={stageWidth}
            height={stageHeight}
            ref={effectiveStageRef}
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
      </HStack>
    </>
  );
}


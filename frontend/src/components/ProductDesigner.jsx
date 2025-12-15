/*// src/components/ProductDesigner/ProductDesigner.jsx
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
  Textarea,
} from "@chakra-ui/react";

// Hook para cargar imágenes
function useImage(url) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => setImage(img);
  }, [url]);

  return image;
}

// Componente para una imagen arrastrable y transformable
function DesignerImageElement({ el, isSelected, onSelect, onChange }) {
  const img = useImage(el.url);
  const shapeRef = useRef();

  useEffect(() => {
    if (isSelected && shapeRef.current) {
      shapeRef.current.moveToTop();
    }
  }, [isSelected]);

  const handleDragEnd = (e) => {
    const node = e.target;
    onChange(el.id, {
      x: node.x(),
      y: node.y(),
    });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
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
  };

  return (
    <KonvaImage
      id={el.id}
      ref={shapeRef}
      image={img}
      x={el.x}
      y={el.y}
      draggable
      scaleX={el.scaleX ?? el.scale ?? 1}
      scaleY={el.scaleY ?? el.scale ?? 1}
      rotation={el.rotation || 0}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}

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
  const initialSide = value?.side || "front";
  const initialElementsBySide = useMemo(
    () =>
      value?.elementsBySide || {
        front: value?.elements || [],
        back: [],
      },
    [value]
  );

  const [side, setSide] = useState(initialSide);
  const [elementsBySide, setElementsBySide] = useState(initialElementsBySide);
  const [selectedId, setSelectedId] = useState(null);
  const [notes, setNotes] = useState(value?.notes || "");

  // Imagen de mockup según lado
  const productImg = useImage(side === "front" ? frontImage : backImage);

  const internalStageRef = useRef(null);
  const layerRef = useRef(null);
  const trRef = useRef(null);

  // si nos pasan ref desde fuera, usamos ese; si no, usamos el interno
  const effectiveStageRef = stageRef || internalStageRef;

  const fontOptions = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Courier New",
    "Comic Sans MS",
    "Impact",
  ];

  const currentElements = elementsBySide[side] || [];
  const selectedElement = currentElements.find((el) => el.id === selectedId);

  // Avisar al padre cuando cambie algo
  useEffect(() => {
    onChange?.({
      side,
      elementsBySide,
      notes,
    });
  }, [side, elementsBySide, notes, onChange]);

  // Actualización de Transformer cuando cambia la selección o los elementos
  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;

    const stage = layerRef.current.getStage();
    if (!selectedId) {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
      return;
    }

    const selectedNode = stage.findOne(`#${selectedId}`);
    if (selectedNode) {
      trRef.current.nodes([selectedNode]);
    } else {
      trRef.current.nodes([]);
    }
    trRef.current.getLayer().batchDraw();
  }, [selectedId, elementsBySide, side]);

  const updateElement = (id, attrs) => {
    setElementsBySide((prev) => {
      const nextSideEls = (prev[side] || []).map((el) =>
        el.id === id ? { ...el, ...attrs } : el
      );
      return {
        ...prev,
        [side]: nextSideEls,
      };
    });
  };

  const handleAddText = () => {
    const id = crypto.randomUUID();
    const newText = {
      id,
      type: "text",
      text: "Tu texto aquí",
      x: printArea.x + 20,
      y: printArea.y + 20,
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#ffffff",
      rotation: 0,
    };

    setElementsBySide((prev) => ({
      ...prev,
      [side]: [...(prev[side] || []), newText],
    }));
    setSelectedId(id);
  };

  const handleAddImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = crypto.randomUUID();
      const newImg = {
        id,
        type: "image",
        url: reader.result,
        x: printArea.x + 40,
        y: printArea.y + 40,
        scaleX: 0.5,
        scaleY: 0.5,
        rotation: 0,
      };
      setElementsBySide((prev) => ({
        ...prev,
        [side]: [...(prev[side] || []), newImg],
      }));
      setSelectedId(id);
    };
    reader.readAsDataURL(file);
  };

  const handleDragMove = (id, pos) => {
    updateElement(id, { x: pos.x, y: pos.y });
  };

  const handleSideChange = (newSide) => {
    setSide(newSide);
    setSelectedId(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setElementsBySide((prev) => ({
      ...prev,
      [side]: (prev[side] || []).filter((el) => el.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const handleStageClick = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  // centrar mockup en el Stage
  const mockupWidth = 500;
  const mockupHeight = 500;
  const offsetX = (stageWidth - mockupWidth) / 2;
  const offsetY = (stageHeight - mockupHeight) / 2;

  return (
    <HStack align="flex-start" spacing={6}>
      
      <Stack minW="260px" spacing={4}>
        <FormControl>
          <FormLabel>Lado del producto</FormLabel>
          <Select
            size="sm"
            value={side}
            onChange={(e) => handleSideChange(e.target.value)}
          >
            <option value="front">Delante</option>
            <option value="back">Detrás</option>
          </Select>
        </FormControl>

        <Divider />

        <Button size="sm" onClick={handleAddText}>
          Añadir texto
        </Button>

        <FormControl>
          <FormLabel>Cargar imagen</FormLabel>
          <Input
            type="file"
            accept="image/*"
            size="sm"
            onChange={(e) => handleAddImage(e.target.files?.[0])}
          />
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

        <Divider my={3} />

        <ChakraText fontSize="xs" color="gray.500">
          Una vez realizado el pedido, revisaremos el diseño y, si hay algún
          problema con la imagen o la posición, nos pondremos en contacto
          contigo.
        </ChakraText>

        {selectedElement && (
          <>
            <Divider />
            <ChakraText fontSize="sm" fontWeight="bold">
              Elemento seleccionado
            </ChakraText>
            <ChakraText fontSize="xs" color="gray.500">
              Tipo: {selectedElement.type}
            </ChakraText>

            {selectedElement.type === "text" && (
              <>
                <FormControl>
                  <FormLabel fontSize="sm">Texto</FormLabel>
                  <Input
                    size="sm"
                    value={selectedElement.text}
                    onChange={(e) =>
                      updateElement(selectedElement.id, {
                        text: e.target.value,
                      })
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
                    {fontOptions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Tamaño</FormLabel>
                  <NumberInput
                    size="sm"
                    min={8}
                    max={120}
                    value={selectedElement.fontSize || 24}
                    onChange={(val) =>
                      updateElement(selectedElement.id, {
                        fontSize: Number(val) || 24,
                      })
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
                      updateElement(selectedElement.id, {
                        fill: e.target.value,
                      })
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
                onChange={(val) =>
                  updateElement(selectedElement.id, {
                    rotation: Number(val) || 0,
                  })
                }
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

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

      
      <Box
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
        bg="gray.100"
        flex="1"
        display="flex"
        justifyContent="center"
      >
        <Stage
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleStageClick}
          onTouchStart={handleStageClick}
          ref={effectiveStageRef}
        >
          <Layer ref={layerRef}>
            
            {productImg && (
              <KonvaImage
                image={productImg}
                x={offsetX}
                y={offsetY}
                width={mockupWidth}
                height={mockupHeight}
              />
            )}

            
            <Rect
              x={offsetX + printArea.x}
              y={offsetY + printArea.y}
              width={printArea.width}
              height={printArea.height}
              stroke="#00B5D8"
              dash={[4, 4]}
            />

            
            {currentElements.map((el) => {
              if (el.type === "text") {
                return (
                  <KonvaText
                    key={el.id}
                    id={el.id}
                    text={el.text}
                    x={offsetX + el.x}
                    y={offsetY + el.y}
                    fontSize={el.fontSize || 24}
                    fontFamily={el.fontFamily || "Arial"}
                    fill={el.fill || "#ffffff"}
                    rotation={el.rotation || 0}
                    draggable
                    onClick={() => setSelectedId(el.id)}
                    onTap={() => setSelectedId(el.id)}
                    onDragEnd={(e) =>
                      handleDragMove(el.id, {
                        x: e.target.x() - offsetX,
                        y: e.target.y() - offsetY,
                      })
                    }
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const newFontSize = (el.fontSize || 24) * scaleX;

                      node.scaleX(1);
                      node.scaleY(1);

                      updateElement(el.id, {
                        x: node.x() - offsetX,
                        y: node.y() - offsetY,
                        fontSize: newFontSize,
                        rotation: node.rotation(),
                      });
                    }}
                  />
                );
              }
              if (el.type === "image") {
                // Nota: DesignerImageElement trabaja en coordenadas sin offset,
                // por lo que mantenemos x/y "lógicas" y sumamos offset solo al pintar
                return (
                  <DesignerImageElement
                    key={el.id}
                    el={{
                      ...el,
                      x: offsetX + el.x,
                      y: offsetY + el.y,
                    }}
                    isSelected={selectedId === el.id}
                    onSelect={() => setSelectedId(el.id)}
                    onChange={(id, attrs) =>
                      updateElement(id, {
                        ...attrs,
                        x:
                          attrs.x !== undefined
                            ? attrs.x - offsetX
                            : undefined,
                        y:
                          attrs.y !== undefined
                            ? attrs.y - offsetY
                            : undefined,
                      })
                    }
                  />
                );
              }
              return null;
            })}

            
            <Transformer
              ref={trRef}
              rotateEnabled
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
              ]}
            />
          </Layer>
        </Stage>
      </Box>
    </HStack>
  );
}
*/

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
  Textarea,
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

  useEffect(() => {
    if (isSelected && shapeRef.current) {
      shapeRef.current.moveToTop();
    }
  }, [isSelected]);

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
}) {
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
          <Rect
            x={printArea.x}
            y={printArea.y}
            width={printArea.width}
            height={printArea.height}
            stroke="#00B5D8"
            dash={[4, 4]}
          />

          {(elements || []).map((el) => {
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
                  scaleX={1}
                  scaleY={1}
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
  const initial = useMemo(() => {
    return {
      side: value?.side || "front",
      elementsBySide: value?.elementsBySide || { front: [], back: [] },
      notes: value?.notes || "",
    };
  }, [value]);

  const [side, setSide] = useState(initial.side);
  const [elementsBySide, setElementsBySide] = useState(initial.elementsBySide);
  const [notes, setNotes] = useState(initial.notes);
  const [selectedId, setSelectedId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

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

  /* ======================================================
     Notificar cambios al padre (sin previews)
========================================================= */
  useEffect(() => {
    onChange?.({
      side,
      elementsBySide,
      notes,
    });
  }, [side, elementsBySide, notes]);

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
  

      
    
  }, [effectiveStageRef, elementsBySide, notes, frontImage, backImage]);

  /* ======================================================
     CRUD elementos
========================================================= */
  const updateElement = (id, attrs) => {
    setElementsBySide((prev) => {
      const list = prev?.[side] || [];
      return {
        ...prev,
        [side]: list.map((el) => (el.id === id ? { ...el, ...attrs } : el)),
      };
    });
  };

  const handleAddText = () => {
    const id = crypto.randomUUID();
    const newText = {
      id,
      type: "text",
      text: "Texto aquí",
      x: printArea.x + 20,
      y: printArea.y + 20,
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#ffffff",
      rotation: 0,
    };

    setElementsBySide((prev) => ({
      ...prev,
      [side]: [...(prev?.[side] || []), newText],
    }));
    setSelectedId(id);
  };

  /*const handleAddImage = (file) => {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
      const id = crypto.randomUUID();
      const newImg = {
        id,
        type: "image",
        url: reader.result, // dataURL
        x: printArea.x + 40,
        y: printArea.y + 40,
        scaleX: 0.5,
        scaleY: 0.5,
        rotation: 0,
      };

      setElementsBySide((prev) => ({
        ...prev,
        [side]: [...(prev?.[side] || []), newImg],
      }));
      setSelectedId(id);
    };

    reader.readAsDataURL(file);
  };*/

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
          printArea.width / img.width,
          printArea.height / img.height
        );

        const newImg = {
          id,
          type: "image",
          url: reader.result, // dataURL
          x: printArea.x + printArea.width / 2,
          y: printArea.y + printArea.height / 2,
          scaleX: scale,
          scaleY: scale,
          rotation: 0,
        };

        setElementsBySide((prev) => ({
          ...prev,
          [side]: [...(prev?.[side] || []), newImg],
        }));

        setSelectedId(id);
      };
    };

    reader.readAsDataURL(file);
  };


  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setElementsBySide((prev) => ({
      ...prev,
      [side]: (prev?.[side] || []).filter((el) => el.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const handleStageClick = (e) => {
    if (e.target === e.target.getStage()) setSelectedId(null);
  };

  /* ======================================================
     Guardar diseño (SIN CAMBIAR SIDE)
     Genera previewsBySide usando stages ocultos.
========================================================= */
  const handleSaveDesign = () => {
    const stage = effectiveStageRef.current;
    if (!stage) return;

    const previewsBySide = stage.exportPreviewsBySide(2);

    console.log(
      "¿FRONT === BACK?",
      previewsBySide.front === previewsBySide.back
    );
    console.log("PREVIEWS:", previewsBySide);

    setSavedAt(new Date().toISOString());

    onChange?.({
      side,
      elementsBySide,
      notes,
      previewsBySide,
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

      <HStack align="flex-start" spacing={6}>
        {/* PANEL LATERAL */}
        <Stack minW="260px" spacing={4}>
          <FormControl>
            <FormLabel>Lado del producto</FormLabel>
            <Select
              size="sm"
              value={side}
              onChange={(e) => {
                setSide(e.target.value);
                setSelectedId(null);
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

          <FormControl>
            <FormLabel>Subir imagen</FormLabel>
            <Input
              type="file"
              accept="image/*"
              size="sm"
              onChange={(e) => handleAddImage(e.target.files?.[0])}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Notas</FormLabel>
            <Textarea
              size="sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormControl>

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

        {/* CANVAS EDITOR */}
        <Box borderWidth="1px" borderRadius="md" overflow="hidden" bg="gray.100" flex="1">
          <Stage
            width={stageWidth}
            height={stageHeight}
            onMouseDown={handleStageClick}
            onTouchStart={handleStageClick}
            ref={effectiveStageRef}
          >
            <Layer ref={layerRef}>
              {productImg && (
                <KonvaImage image={productImg} x={0} y={0} width={stageWidth} height={stageHeight} />
              )}

              <Rect
                x={printArea.x}
                y={printArea.y}
                width={printArea.width}
                height={printArea.height}
                stroke="#00B5D8"
                dash={[4, 4]}
              />

              {currentElements.map((el) => {
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
                      fill={el.fill || "#000000"}
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
                        node.scaleX(1);
                        node.scaleY(1);

                        updateElement(el.id, {
                          x: node.x(),
                          y: node.y(),
                          fontSize: (el.fontSize || 24) * scaleX,
                          rotation: node.rotation(),
                        });
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
      </HStack>
    </>
  );
}

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

/* =============================
   Hook seguro para imágenes
============================= */
function useImage(src) {
  const [img, setImg] = useState(null);

  useEffect(() => {
    if (!src) return;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.onload = () => setImg(image);
  }, [src]);

  return img;
}

/* =============================
   Imagen editable
============================= */
function DesignerImageElement({ el, isSelected, onSelect, onChange }) {
  const img = useImage(el.url);
  const ref = useRef();

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.moveToTop();
    }
  }, [isSelected]);

  return (
    <KonvaImage
      id={el.id}
      ref={ref}
      image={img}
      x={el.x}
      y={el.y}
      scaleX={el.scaleX ?? 1}
      scaleY={el.scaleY ?? 1}
      rotation={el.rotation || 0}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) =>
        onChange(el.id, {
          x: e.target.x(),
          y: e.target.y(),
        })
      }
      onTransformEnd={() => {
        const node = ref.current;
        onChange(el.id, {
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      }}
    />
  );
}

/* =============================
   COMPONENTE PRINCIPAL
============================= */
export function ProductDesigner({
  frontImage,
  backImage,
  printArea,
  stageWidth,
  stageHeight,
  value,
  onChange,
  stageRef,
}) {
  const [side, setSide] = useState(value?.side || "front");
  const [elementsBySide, setElementsBySide] = useState(
    value?.elementsBySide || { front: [], back: [] }
  );
  const [notes, setNotes] = useState(value?.notes || "");
  const [selectedId, setSelectedId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const internalStageRef = useRef(null);
  const effectiveStageRef = stageRef || internalStageRef;

  const layerRef = useRef();
  const trRef = useRef();

  const productImg = useImage(side === "front" ? frontImage : backImage);
  const currentElements = elementsBySide[side];

  /* =============================
     Sync Transformer
  ============================= */
  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;

    const stage = layerRef.current.getStage();
    const node = stage.findOne(`#${selectedId}`);
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer().batchDraw();
  }, [selectedId, side, elementsBySide]);

  /* =============================
     Update parent (sin preview)
  ============================= */
  useEffect(() => {
    onChange?.({
      side,
      elementsBySide,
      notes,
    });
  }, [side, elementsBySide, notes]);

  /* =============================
     Utils
  ============================= */
  const updateElement = (id, attrs) => {
    setElementsBySide((prev) => ({
      ...prev,
      [side]: prev[side].map((el) =>
        el.id === id ? { ...el, ...attrs } : el
      ),
    }));
  };

  const addText = () => {
    const id = crypto.randomUUID();
    setElementsBySide((prev) => ({
      ...prev,
      [side]: [
        ...prev[side],
        {
          id,
          type: "text",
          text: "Texto",
          x: printArea.x + 20,
          y: printArea.y + 20,
          fontSize: 24,
          fontFamily: "Arial",
          fill: "#ffffff",
          rotation: 0,
        },
      ],
    }));
    setSelectedId(id);
  };

  const addImage = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const id = crypto.randomUUID();
      setElementsBySide((prev) => ({
        ...prev,
        [side]: [
          ...prev[side],
          {
            id,
            type: "image",
            url: reader.result,
            x: printArea.x + 40,
            y: printArea.y + 40,
            scaleX: 0.5,
            scaleY: 0.5,
            rotation: 0,
          },
        ],
      }));
      setSelectedId(id);
    };
    reader.readAsDataURL(file);
  };

  /* =============================
     GENERAR PREVIEWS POR LADO
  ============================= */
  const handleSaveDesign = async () => {
    if (!effectiveStageRef.current) return;

    const previewsBySide = {};

    for (const sideName of ["front", "back"]) {
      setSide(sideName);
      await new Promise((r) => setTimeout(r, 50));

      previewsBySide[sideName] =
        effectiveStageRef.current.toDataURL({ pixelRatio: 2 });
    }

    setSavedAt(new Date().toISOString());

    onChange?.({
      side,
      elementsBySide,
      notes,
      previewsBySide,
    });
  };

  /* =============================
     Layout
  ============================= */
  return (
    <HStack align="flex-start" spacing={6}>
      {/* PANEL */}
      <Stack minW="260px" spacing={4}>
        <FormControl>
          <FormLabel>Lado</FormLabel>
          <Select value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="front">Delante</option>
            <option value="back">Detrás</option>
          </Select>
        </FormControl>

        <Button size="sm" onClick={addText}>
          Añadir texto
        </Button>

        <Input
          type="file"
          accept="image/*"
          size="sm"
          onChange={(e) => addImage(e.target.files[0])}
        />

        <Textarea
          size="sm"
          placeholder="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Button colorScheme="green" onClick={handleSaveDesign}>
          Guardar diseño
        </Button>

        {savedAt && (
          <ChakraText fontSize="xs" color="gray.500">
            Guardado: {new Date(savedAt).toLocaleString()}
          </ChakraText>
        )}
      </Stack>

      {/* CANVAS */}
      <Box borderWidth="1px" borderRadius="md" bg="gray.100">
        <Stage
          width={stageWidth}
          height={stageHeight}
          ref={effectiveStageRef}
        >
          <Layer ref={layerRef}>
            {productImg && (
              <KonvaImage
                image={productImg}
                width={stageWidth}
                height={stageHeight}
              />
            )}

            <Rect
              x={printArea.x}
              y={printArea.y}
              width={printArea.width}
              height={printArea.height}
              stroke="#00B5D8"
              dash={[4, 4]}
            />

            {currentElements.map((el) =>
              el.type === "text" ? (
                <KonvaText
                  key={el.id}
                  id={el.id}
                  {...el}
                  draggable
                  onClick={() => setSelectedId(el.id)}
                  onDragEnd={(e) =>
                    updateElement(el.id, {
                      x: e.target.x(),
                      y: e.target.y(),
                    })
                  }
                />
              ) : (
                <DesignerImageElement
                  key={el.id}
                  el={el}
                  isSelected={selectedId === el.id}
                  onSelect={() => setSelectedId(el.id)}
                  onChange={updateElement}
                />
              )
            )}

            <Transformer ref={trRef} />
          </Layer>
        </Stage>
      </Box>
    </HStack>
  );
}

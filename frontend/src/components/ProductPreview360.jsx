/*// src/components/ProductPreview360.jsx
import { useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import { Box, HStack, IconButton } from "@chakra-ui/react";
import { ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";
import { useEffect, useRef } from "react";

// Hook sencillo para cargar imágenes
function useImage(url) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => setImage(img);
  }, [url]);

  return image;
}

export function ProductPreview360({
  frames = [],
  designUrl,
  width = 500,
  height = 500,
  printArea = { x: 0, y: 0, width: 500, height: 500 },
}) {
  const [frameIndex, setFrameIndex] = useState(0);

  // Imagen del frame actual (mockup 3D)
  const currentFrameUrl = frames[frameIndex] || frames[0] || null;
  const frameImg = useImage(currentFrameUrl);

  // Imagen del diseño exportado desde el diseñador (dataURL)
  const designImg = useImage(designUrl);

  const handlePrev = () => {
    if (!frames.length) return;
    setFrameIndex((prev) => (prev - 1 + frames.length) % frames.length);
  };

  const handleNext = () => {
    if (!frames.length) return;
    setFrameIndex((prev) => (prev + 1) % frames.length);
  };

  return (
    <Box>
      <Box
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
        bg="gray.100"
        display="flex"
        justifyContent="center"
      >
        <Stage width={width} height={height}>
          <Layer>
           
            {frameImg && (
              <KonvaImage
                image={frameImg}
                x={0}
                y={0}
                width={width}
                height={height}
              />
            )}

           
            {designImg && (
              <KonvaImage
                image={designImg}
                x={printArea?.x ?? 0}
                y={printArea?.y ?? 0}
                width={printArea?.width ?? width}
                height={printArea?.height ?? height}
                listening={false}
                // opcional: un pelín de transparencia si quieres
                // opacity={0.95}
              />
            )}
          </Layer>
        </Stage>
      </Box>

      {frames.length > 1 && (
        <HStack justify="center" mt={2} spacing={4}>
          <IconButton
            aria-label="Frame anterior"
            icon={<ArrowBackIcon />}
            size="sm"
            onClick={handlePrev}
          />
          <IconButton
            aria-label="Frame siguiente"
            icon={<ArrowForwardIcon />}
            size="sm"
            onClick={handleNext}
          />
        </HStack>
      )}
    </Box>
  );
}
*/

// src/components/ProductPreview360.jsx
import { useState, useEffect, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Text as KonvaText } from "react-konva";
import { Box, HStack, IconButton } from "@chakra-ui/react";
import { ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";

// Hook sencillo para cargar imágenes
function useImage(url) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => setImage(img);
  }, [url]);

  return image;
}

// componente para imagen de diseño (solo lectura)
function PreviewImageElement({ el }) {
  const img = useImage(el.url);
  if (!img) return null;
  return (
    <KonvaImage
      image={img}
      x={el.x}
      y={el.y}
      scaleX={el.scaleX ?? el.scale ?? 1}
      scaleY={el.scaleY ?? el.scale ?? 1}
      rotation={el.rotation || 0}
      listening={false}
    />
  );
}

export function ProductPreview360({
  // frames puede ser:
  //   - array de strings:   ["/frame-1.png", "/frame-6.png"]
  //   - array de objetos:   [{ src, side: "front" | "back" }]
  frames = [],
  design,                    // objeto devuelto por ProductDesigner
  width = 500,
  height = 500,
  printArea = { x: 0, y: 0, width: 500, height: 500 },
}) {
  const [frameIndex, setFrameIndex] = useState(0);

  // normalizamos frames => { src, side }
  const normalizedFrames = useMemo(
    () =>
      (frames || []).map((f) =>
        typeof f === "string"
          ? { src: f, side: "front" }
          : { src: f.src, side: f.side || "front" }
      ),
    [frames]
  );

  const currentFrame = normalizedFrames[frameIndex] || normalizedFrames[0] || null;
  const frameImg = useImage(currentFrame?.src || null);
  const frameSide = currentFrame?.side || "front";

  const elementsBySide = design?.elementsBySide || {};
  const elements = elementsBySide[frameSide] || [];

  const handlePrev = () => {
    if (!normalizedFrames.length) return;
    setFrameIndex((prev) =>
      (prev - 1 + normalizedFrames.length) % normalizedFrames.length
    );
  };

  const handleNext = () => {
    if (!normalizedFrames.length) return;
    setFrameIndex((prev) => (prev + 1) % normalizedFrames.length);
  };

  return (
    <Box>
      <Box
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
        bg="gray.100"
        display="flex"
        justifyContent="center"
      >
        <Stage width={width} height={height}>
          <Layer>
            {/* 1) Mockup 3D */}
            {frameImg && (
              <KonvaImage
                image={frameImg}
                x={0}
                y={0}
                width={width}
                height={height}
              />
            )}

            {/* 2) Área de impresión (solo si quieres verla en preview) */}
            {/* 
            <Rect
              x={printArea.x}
              y={printArea.y}
              width={printArea.width}
              height={printArea.height}
              stroke="#ffffff"
              dash={[4, 4]}
              listening={false}
            />
            */}

            {/* 3) Elementos del lado correspondiente */}
            {elements.map((el) => {
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
                return <PreviewImageElement key={el.id} el={el} />;
              }
              return null;
            })}
          </Layer>
        </Stage>
      </Box>

      {normalizedFrames.length > 1 && (
        <HStack justify="center" mt={2} spacing={4}>
          <IconButton
            aria-label="Frame anterior"
            icon={<ArrowBackIcon />}
            size="sm"
            onClick={handlePrev}
          />
          <IconButton
            aria-label="Frame siguiente"
            icon={<ArrowForwardIcon />}
            size="sm"
            onClick={handleNext}
          />
        </HStack>
      )}
    </Box>
  );
}

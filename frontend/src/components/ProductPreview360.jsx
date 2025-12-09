/*
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
            
            {frameImg && (
              <KonvaImage
                image={frameImg}
                x={0}
                y={0}
                width={width}
                height={height}
              />
            )}

            

            
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
*/

// src/components/ProductPreview360.jsx
import { Box, Image } from "@chakra-ui/react";
import { useState } from "react";

/*
  props:
  - frames: [{ src, side }] → opcional
  - design: { elementsBySide, preview }
  - width, height
  - printArea
*/

export function ProductPreview360({
  frames = [],
  design,
  width = 500,
  height = 500,
  printArea,
}) {
  const [frameIndex, setFrameIndex] = useState(0);

  const hasFrames = Array.isArray(frames) && frames.length > 0;
  const currentFrame = hasFrames ? frames[frameIndex] : frames[0];

  const previewSrc = design?.preview || null;

  const elements =
    design?.elementsBySide?.[
      currentFrame?.side === "back" ? "back" : "front"
    ] || [];

  /*  MÉTODOS MANUALES PARA AVANZAR FRAME (sin auto-rotación) */
  const nextFrame = () => {
    if (!hasFrames) return;
    setFrameIndex((i) => (i + 1) % frames.length);
  };

  const prevFrame = () => {
    if (!hasFrames) return;
    setFrameIndex((i) => (i - 1 + frames.length) % frames.length);
  };

  return (
    <Box
      position="relative"
      width={width + "px"}
      height={height + "px"}
      borderRadius="md"
      overflow="hidden"
      bg="gray.200"
      userSelect="none"
    >
      {/* FRAME BASE */}
      {currentFrame?.src && (
        <Image
          src={currentFrame.src}
          width="100%"
          height="100%"
          objectFit="contain"
          draggable={false}
        />
      )}

      {/* ███████   REALISTIC BLEND MODE   ███████ */}
      {previewSrc && (
        <Image
          src={previewSrc}
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          objectFit="contain"
          mixBlendMode="multiply"       /* ← efecto realista */
          opacity={0.80}                /* ← ajuste de intensidad */
          pointerEvents="none"
        />
      )}

      {/* Render manual si NO hay preview */}
      {!previewSrc &&
        elements.map((el) => {
          if (el.type === "text") {
            return (
              <Box
                key={el.id}
                position="absolute"
                left={printArea.x + el.x + "px"}
                top={printArea.y + el.y + "px"}
                fontSize={el.fontSize + "px"}
                fontFamily={el.fontFamily}
                color={el.fill}
                style={{
                  transform: `rotate(${el.rotation}deg)`,
                  mixBlendMode: "multiply",  // ef. realista
                  opacity: 0.85,
                }}
                pointerEvents="none"
              >
                {el.text}
              </Box>
            );
          }

          if (el.type === "image") {
            return (
              <Image
                key={el.id}
                src={el.url}
                position="absolute"
                left={printArea.x + el.x + "px"}
                top={printArea.y + el.y + "px"}
                width={el.scaleX ? `${el.scaleX * 100}%` : "50%"}
                objectFit="contain"
                style={{
                  transform: `rotate(${el.rotation}deg)`,
                  mixBlendMode: "multiply",
                  opacity: 0.85,
                }}
                pointerEvents="none"
              />
            );
          }

          return null;
        })}

      {/* BOTONES MANUALES PARA CAMBIAR FRAME (si existen múltiples) */}
      {hasFrames && frames.length > 1 && (
        <>
          <Box
            position="absolute"
            top="50%"
            left="10px"
            transform="translateY(-50%)"
            bg="rgba(0,0,0,0.35)"
            color="white"
            px={2}
            py={1}
            borderRadius="md"
            cursor="pointer"
            onClick={prevFrame}
          >
            ◀
          </Box>

          <Box
            position="absolute"
            top="50%"
            right="10px"
            transform="translateY(-50%)"
            bg="rgba(0,0,0,0.35)"
            color="white"
            px={2}
            py={1}
            borderRadius="md"
            cursor="pointer"
            onClick={nextFrame}
          >
            ▶
          </Box>
        </>
      )}
    </Box>
  );
}

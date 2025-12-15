/*

// src/components/ProductPreview360.jsx
import { Box, Image } from "@chakra-ui/react";
import { useState } from "react";

export function ProductPreview360({
  frames = [],
  design,
  width = 500,
  height = 500,
  printArea,
}) {
  const [frameIndex, setFrameIndex] = useState(0);

  if (!frames.length || !design) return null;

  const currentFrame = frames[frameIndex];
  const side = currentFrame.side || "front";

  const elements = design.elementsBySide?.[side] || [];

  const nextFrame = () =>
    setFrameIndex((i) => (i + 1) % frames.length);

  const prevFrame = () =>
    setFrameIndex((i) => (i - 1 + frames.length) % frames.length);

  return (
    <Box
      position="relative"
      width={`${width}px`}
      height={`${height}px`}
      borderRadius="md"
      overflow="hidden"
      bg="gray.200"
      userSelect="none"
    >
      
      <Image
        src={currentFrame.src}
        width="100%"
        height="100%"
        objectFit="contain"
        draggable={false}
      />

      
      {elements.map((el) => {
        if (el.type === "text") {
          return (
            <Box
              key={el.id}
              position="absolute"
              left={`${printArea.x + el.x}px`}
              top={`${printArea.y + el.y}px`}
              fontSize={`${el.fontSize}px`}
              fontFamily={el.fontFamily}
              color={el.fill}
              transform={`rotate(${el.rotation}deg)`}
              mixBlendMode="multiply"
              opacity={0.85}
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
              left={`${printArea.x + el.x}px`}
              top={`${printArea.y + el.y}px`}
              width={`${el.scaleX * 100}px`}
              transform={`rotate(${el.rotation}deg)`}
              mixBlendMode="multiply"
              opacity={0.85}
              pointerEvents="none"
            />
          );
        }

        return null;
      })}

      
      {frames.length > 1 && (
        <>
          <Box
            position="absolute"
            top="50%"
            left="10px"
            transform="translateY(-50%)"
            bg="rgba(0,0,0,0.4)"
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
            bg="rgba(0,0,0,0.4)"
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
*/

// src/components/ProductPreview360.jsx
import { Box, Image } from "@chakra-ui/react";
import { useState } from "react";

export function ProductPreview360({
  frames = [],
  design,
  width = 500,
  height = 500,
}) {
  const [index, setIndex] = useState(0);
  const frame = frames[index];
  const side = frame?.side === "back" ? "back" : "front";

  const preview = design?.previewsBySide?.[side];

  return (
    <Box
      position="relative"
      width={`${width}px`}
      height={`${height}px`}
      bg="gray.200"
      borderRadius="md"
      overflow="hidden"
    >
      {preview && (
        <Image
          key={side}
          src={preview}
          width="100%"
          height="100%"
          objectFit="contain"
          draggable={false}
        />
      )}

      {frames.length > 1 && (
        <>
          <Box
            position="absolute"
            left="10px"
            top="50%"
            transform="translateY(-50%)"
            cursor="pointer"
            onClick={() =>
              setIndex((i) => (i - 1 + frames.length) % frames.length)
            }
          >
            ◀
          </Box>

          <Box
            position="absolute"
            right="10px"
            top="50%"
            transform="translateY(-50%)"
            cursor="pointer"
            onClick={() =>
              setIndex((i) => (i + 1) % frames.length)
            }
          >
            ▶
          </Box>
        </>
      )}
    </Box>
  );
}

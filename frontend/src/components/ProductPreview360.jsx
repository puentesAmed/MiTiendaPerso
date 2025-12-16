import { Box, Image } from "@chakra-ui/react";
import { useState } from "react";

export function ProductPreview360({
  frames = [],
  design,
  width = 500,
  height = 500,
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const hasFrames = frames.length > 0;

  const frame = frames[frameIndex];
  const side = frame?.side === "back" ? "back" : "front";

  // 👇 ESTA ES LA CLAVE
  const preview = design?.previewsBySide?.[side];

  if (!preview) {
    return (
      <Box
        width={`${width}px`}
        height={`${height}px`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.200"
      >
        No hay preview disponible
      </Box>
    );
  }

  return (
    <Box
      position="relative"
      width={`${width}px`}
      height={`${height}px`}
      bg="gray.200"
      borderRadius="md"
      overflow="hidden"
    >
      {/* IMAGEN FINAL (mockup + diseño) */}
      <Image
        key={side}
        src={preview}
        width="100%"
        height="100%"
        objectFit="contain"
        draggable={false}
        pointerEvents="none"
      />

      {/* CONTROLES */}
      {hasFrames && frames.length > 1 && (
        <>
          <Box
            position="absolute"
            left="10px"
            top="50%"
            transform="translateY(-50%)"
            cursor="pointer"
            fontSize="24px"
            onClick={() =>
              setFrameIndex((i) => (i - 1 + frames.length) % frames.length)
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
            fontSize="24px"
            onClick={() =>
              setFrameIndex((i) => (i + 1) % frames.length)
            }
          >
            ▶
          </Box>
        </>
      )}
    </Box>
  );
}

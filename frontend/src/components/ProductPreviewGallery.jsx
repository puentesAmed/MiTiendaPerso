// src/components/ProductPreviewGallery.jsx
import { Box, Image, Text, HStack } from "@/components/ui/legacy-ui";

export function ProductPreviewGallery({ design, width = 300 }) {
  const front = design?.previewsBySide?.front;
  const back = design?.previewsBySide?.back;

  return (
    <HStack spacing={6} justify="center">
      {front && (
        <Box textAlign="center">
          <Text fontWeight="bold" mb={2}>Frontal</Text>
          <Image
            src={front}
            width={`${width}px`}
            objectFit="contain"
            borderRadius="md"
          />
        </Box>
      )}

      {back && (
        <Box textAlign="center">
          <Text fontWeight="bold" mb={2}>Trasera</Text>
          <Image
            src={back}
            width={`${width}px`}
            objectFit="contain"
            borderRadius="md"
          />
        </Box>
      )}
    </HStack>
  );
}

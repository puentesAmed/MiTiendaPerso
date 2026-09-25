import { Box, Text, Button, Image, Stack, Badge } from "@/components/ui/legacy-ui";

export function CustomizationInlineSummary({ item, onEdit }) {
  const customization = item?.customization;
  if (!customization) return null;

  const preview = customization.previewImage || null;
  const texts = Array.isArray(customization.textSummary)
    ? customization.textSummary
    : [];

  return (
    <Box
      mt={3}
      p={3}
      border="1px solid"
      borderColor="purple.200"
      borderRadius="md"
      bg="purple.50"
    >
      <Stack spacing={2}>
        <Badge alignSelf="flex-start" colorScheme="purple">
          Producto personalizado
        </Badge>

        {/* 🖼 Preview del diseño */}
        {preview && (
          <Image
            src={preview}
            alt="Preview del diseño"
            maxH="120px"
            objectFit="contain"
            borderRadius="md"
          />
        )}

        {/* 📝 Resumen de texto */}
        {texts.length > 0 && (
          <Box>
            <Text fontSize="xs" color="gray.600">
              Texto añadido:
            </Text>
            {texts.slice(0, 2).map((t, i) => (
              <Text key={i} fontSize="sm" color="gray.700">
                “{t}”
              </Text>
            ))}
          </Box>
        )}

        {/* ✏️ Editar */}
        <Button
          size="sm"
          variant="outline"
          colorScheme="purple"
          alignSelf="flex-start"
          onClick={onEdit}
        >
          Editar personalización
        </Button>
      </Stack>
    </Box>
  );
}

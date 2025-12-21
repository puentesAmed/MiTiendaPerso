// src/pages/Legal/CookiesPolicy.jsx
import { Box, Heading, Text, Stack, useColorModeValue } from "@chakra-ui/react";

export function CookiesPolicy() {
  const textColor = useColorModeValue("gray.700", "gray.300");

  return (
    <Box maxW="800px" mx="auto" p={6}>
      <Heading mb={4}>Política de Cookies</Heading>

      <Stack spacing={4} fontSize="sm" color={textColor}>
        <Text>
          Este sitio web utiliza cookies y tecnologías similares para garantizar
          el correcto funcionamiento del sitio y mejorar la experiencia del
          usuario.
        </Text>

        <Heading size="sm">¿Qué son las cookies?</Heading>
        <Text>
          Las cookies son pequeños archivos que se almacenan en el dispositivo
          del usuario al navegar por un sitio web.
        </Text>

        <Heading size="sm">Cookies utilizadas</Heading>
        <Text>
          Este sitio utiliza únicamente cookies técnicas y almacenamiento local
          necesarias para:
        </Text>
        <Text pl={4}>
          • Mantener la sesión de compra como invitado.<br />
          • Guardar temporalmente los datos del pedido.<br />
          • Recordar la aceptación de esta política.
        </Text>

        <Heading size="sm">Cookies de terceros</Heading>
        <Text>
          Este sitio no utiliza cookies de terceros con fines publicitarios ni
          de análisis.
        </Text>

        <Heading size="sm">Gestión de cookies</Heading>
        <Text>
          El usuario puede eliminar o bloquear las cookies desde la configuración
          de su navegador. La desactivación de cookies técnicas puede afectar al
          correcto funcionamiento del sitio.
        </Text>
      </Stack>
    </Box>
  );
}

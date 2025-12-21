import { Box, Heading, Text, Stack, Link, useColorModeValue } from "@chakra-ui/react";

export function ContactoLegal() {
  const textColor = useColorModeValue("gray.700", "gray.300");

  return (
    <Box maxW="800px" mx="auto" p={6}>
      <Heading mb={4}>Contacto Legal</Heading>

      <Stack spacing={4} fontSize="sm" color={textColor}>
        <Text>
          De conformidad con la normativa vigente en materia de protección de
          datos y comercio electrónico, se pone a disposición de los usuarios
          el siguiente canal de contacto legal.
        </Text>

        <Heading size="sm">Titular del sitio web</Heading>
        <Text>
          <strong>Nombre comercial:</strong> MiLuGui / MiTiendaPerso<br />
          <strong>Correo electrónico legal:</strong>{" "}
          <Link href="mailto:info@mitiendaperso.com" color="blue.500">
            info@mitiendaperso.com
          </Link>
        </Text>

        <Heading size="sm">Finalidad del contacto</Heading>
        <Text>
          Este canal está destinado exclusivamente a:
        </Text>
        <Text pl={4}>
          • Ejercicio de derechos RGPD (acceso, rectificación, supresión, etc.)<br />
          • Consultas legales relacionadas con pedidos<br />
          • Comunicaciones formales con el titular del sitio
        </Text>

        <Heading size="sm">Protección de datos</Heading>
        <Text>
          Los datos facilitados a través del correo electrónico serán tratados
          únicamente para atender la solicitud recibida y se conservarán el
          tiempo estrictamente necesario para dicha finalidad.
        </Text>

        <Text fontSize="xs" color="gray.500">
          Para más información, consulte la{" "}
          <Link href="/politica-privacidad" textDecoration="underline">
            Política de Privacidad
          </Link>.
        </Text>
      </Stack>
    </Box>
  );
}

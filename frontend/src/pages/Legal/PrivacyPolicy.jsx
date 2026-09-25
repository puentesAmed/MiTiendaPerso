// src/pages/Legal/PrivacyPolicy.jsx
import { Box, Heading, Text, Stack } from "@/components/ui/legacy-ui";

export function PrivacyPolicy() {
  return (
    <Box maxW="800px" mx="auto" p={6}>
      <Heading mb={4}>Política de Privacidad</Heading>

      <Stack spacing={4} fontSize="sm" color="gray.700">
        <Text>
          En cumplimiento del Reglamento (UE) 2016/679 (Reglamento General de
          Protección de Datos) y de la Ley Orgánica 3/2018 de Protección de Datos
          Personales y garantía de los derechos digitales, se informa a los
          usuarios de lo siguiente:
        </Text>

        <Heading size="sm">Responsable del tratamiento</Heading>
        <Text>
          Titular: <strong>MiTiendaPersonalizar</strong><br />
          Correo electrónico de contacto: <strong>info@mitiendapersonalizar.com</strong>
        </Text>

        <Heading size="sm">Finalidad del tratamiento</Heading>
        <Text>
          Los datos personales facilitados durante el proceso de compra como
          invitado se utilizan exclusivamente para la gestión y tramitación del
          pedido solicitado.
        </Text>

        <Heading size="sm">Base legal</Heading>
        <Text>
          La base legal para el tratamiento de los datos es la ejecución de
          medidas precontractuales y contractuales, conforme al artículo 6.1.b
          del Reglamento General de Protección de Datos.
        </Text>

        <Heading size="sm">Plazo de conservación</Heading>
        <Text>
          Los datos se conservan de forma temporal y se eliminan automáticamente
          una vez finalizado el pedido o tras un periodo máximo de inactividad de
          7 días.
        </Text>

        <Heading size="sm">Derechos del usuario</Heading>
        <Text>
          El usuario puede ejercer sus derechos de acceso, rectificación,
          supresión, limitación, oposición y portabilidad enviando una solicitud
          al correo electrónico indicado.
        </Text>

        <Heading size="sm">Cesión de datos</Heading>
        <Text>
          No se cederán datos a terceros salvo obligación legal.
        </Text>
      </Stack>
    </Box>
  );
}

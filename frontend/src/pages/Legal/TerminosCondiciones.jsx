import { Box, Heading, Text, Stack, Divider } from "@chakra-ui/react";

export function TerminosCondiciones() {
  return (
    <Box maxW="900px" mx="auto" px={{ base: 4, md: 6 }} py={8}>
      <Stack spacing={6}>
        <Heading size="lg">Términos y Condiciones de Venta</Heading>

        <Text fontSize="sm" color="gray.500">
          Última actualización: [FECHA]
        </Text>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">1. Identificación del titular</Heading>
          <Text>
            En cumplimiento de la normativa vigente, se informa que el presente
            sitio web es titularidad de:
          </Text>
          <Text>
            <strong>Titular:</strong> [NOMBRE / RAZÓN SOCIAL]<br />
            <strong>NIF/CIF:</strong> […]<br />
            <strong>Domicilio:</strong> […]<br />
            <strong>Email de contacto:</strong> […]<br />
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">2. Objeto</Heading>
          <Text>
            Los presentes Términos y Condiciones regulan la compra de productos
            ofrecidos a través del sitio web <strong>MiTiendaPerso</strong>,
            incluyendo productos personalizados conforme a las especificaciones
            indicadas por el cliente durante el proceso de compra.
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">3. Proceso de compra</Heading>
          <Text>
            El usuario podrá seleccionar los productos deseados, personalizarlos
            cuando proceda y añadirlos al carrito. Antes de finalizar la compra,
            se mostrará un resumen completo del pedido.
          </Text>
          <Text>
            La confirmación del pedido implica la aceptación expresa de los
            presentes Términos y Condiciones.
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">4. Productos personalizados</Heading>
          <Text>
            Los productos personalizados se elaboran conforme a las indicaciones
            facilitadas por el cliente. Es responsabilidad del usuario revisar
            cuidadosamente el diseño, textos, imágenes y datos antes de
            confirmar el pedido.
          </Text>
          <Text fontWeight="bold">
            ⚠️ Los productos personalizados no admiten devolución ni desistimiento,
            salvo en caso de defecto de fabricación o error imputable al vendedor,
            conforme al artículo 103.c del Real Decreto Legislativo 1/2007.
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">5. Precios y pagos</Heading>
          <Text>
            Todos los precios se muestran en euros (€) e incluyen los impuestos
            legalmente aplicables, salvo que se indique lo contrario.
          </Text>
          <Text>
            El pago se realizará mediante los métodos disponibles en el proceso
            de compra. El pedido no será procesado hasta la confirmación del pago.
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">6. Envíos y plazos de entrega</Heading>
          <Text>
            Los plazos de entrega dependerán del tipo de producto y del destino.
            En el caso de productos personalizados, el plazo comenzará a contar
            una vez confirmado el diseño.
          </Text>
          <Text>
            El vendedor no se responsabiliza de retrasos imputables a causas
            ajenas (transportistas, fuerza mayor, etc.).
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">7. Derecho de desistimiento</Heading>
          <Text>
            El derecho de desistimiento no será aplicable a productos
            personalizados, de acuerdo con la normativa vigente.
          </Text>
          <Text>
            Para productos no personalizados, el usuario dispondrá de un plazo
            de 14 días naturales desde la recepción del pedido para ejercer su
            derecho de desistimiento.
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">8. Responsabilidad</Heading>
          <Text>
            El vendedor no se hace responsable de un uso indebido de los
            productos adquiridos ni de los daños derivados de dicho uso.
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">9. Propiedad intelectual</Heading>
          <Text>
            Todos los contenidos del sitio web, incluidos diseños, textos,
            imágenes y logotipos, están protegidos por derechos de propiedad
            intelectual.
          </Text>
        </Stack>

        <Divider />

        <Stack spacing={4}>
          <Heading size="md">10. Legislación aplicable y jurisdicción</Heading>
          <Text>
            Las presentes condiciones se rigen por la legislación española.
            Para cualquier controversia, las partes se someterán a los juzgados
            y tribunales del domicilio del consumidor.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}

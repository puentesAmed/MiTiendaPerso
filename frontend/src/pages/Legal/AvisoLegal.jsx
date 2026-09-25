import { Box, Heading, Text, Stack, Divider } from "@/components/ui/legacy-ui";

export function AvisoLegal() {
  return (
    <Box maxW="900px" mx="auto" px={5} py={10}>
      <Stack spacing={6}>
        <Heading as="h1" size="lg">
          Aviso Legal
        </Heading>

        <Text fontSize="sm" color="gray.500">
          En cumplimiento de lo dispuesto en la Ley 34/2002, de 11 de julio, de
          servicios de la sociedad de la información y de comercio electrónico
          (LSSI-CE), se informa a los usuarios de los siguientes datos:
        </Text>

        <Divider />

        <Heading as="h2" size="md">
          Titular del sitio web
        </Heading>

        <Text>
          <strong>Titular:</strong> [Nombre y apellidos o nombre comercial]
        </Text>
        <Text>
          <strong>NIF/CIF:</strong> [NIF o CIF]
        </Text>
        <Text>
          <strong>Domicilio:</strong> [Localidad, provincia, país]
        </Text>
        <Text>
          <strong>Correo electrónico de contacto:</strong>{" "}
          [correo electrónico de contacto legal]
        </Text>

        <Divider />

        <Heading as="h2" size="md">
          Actividad
        </Heading>

        <Text>
          Venta online de productos personalizados y otros servicios relacionados
          con la personalización de artículos.
        </Text>

        <Divider />

        <Heading as="h2" size="md">
          Condiciones de uso
        </Heading>

        <Text>
          El acceso y uso de este sitio web atribuye la condición de usuario e
          implica la aceptación plena y sin reservas de las presentes condiciones
          de uso.
        </Text>

        <Text>
          El titular se reserva el derecho a modificar, en cualquier momento y sin
          necesidad de previo aviso, la presentación, configuración y contenidos
          del sitio web, así como las condiciones requeridas para su acceso y/o
          utilización.
        </Text>

        <Text>
          El usuario se compromete a hacer un uso adecuado de los contenidos y
          servicios ofrecidos y a no emplearlos para actividades ilícitas,
          ilegales o contrarias a la buena fe y al orden público.
        </Text>

        <Divider />

        <Heading as="h2" size="md">
          Responsabilidad
        </Heading>

        <Text>
          El titular no se responsabiliza de los daños o perjuicios derivados del
          uso indebido de los contenidos del sitio web ni de cualquier actuación
          realizada sobre la base de la información que en él se facilita.
        </Text>

        <Text>
          Asimismo, no se garantiza la ausencia de virus u otros elementos que
          puedan causar alteraciones en los sistemas informáticos del usuario,
          declinando cualquier responsabilidad por los daños que pudieran
          derivarse de los mismos.
        </Text>

        <Divider />

        <Heading as="h2" size="md">
          Propiedad intelectual e industrial
        </Heading>

        <Text>
          Todos los contenidos del sitio web, incluyendo textos, imágenes,
          diseños, logotipos, iconos, software, nombres comerciales o marcas,
          están protegidos por la normativa vigente en materia de propiedad
          intelectual e industrial.
        </Text>

        <Text>
          Queda expresamente prohibida la reproducción, distribución,
          comunicación pública o transformación, total o parcial, de los
          contenidos sin la autorización expresa del titular.
        </Text>

        <Divider />

        <Heading as="h2" size="md">
          Enlaces externos
        </Heading>

        <Text>
          En caso de que el sitio web contenga enlaces a sitios de terceros, el
          titular no ejercerá ningún tipo de control sobre dichos sitios ni
          asumirá responsabilidad alguna por sus contenidos.
        </Text>

        <Divider />

        <Heading as="h2" size="md">
          Legislación aplicable y jurisdicción
        </Heading>

        <Text>
          La relación entre el titular y el usuario se regirá por la normativa
          española vigente. Para la resolución de cualquier controversia, las
          partes se someterán a los juzgados y tribunales que correspondan conforme
          a derecho.
        </Text>
      </Stack>
    </Box>
  );
  
}

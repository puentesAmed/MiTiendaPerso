import { Text } from "@chakra-ui/react";

export function GuestSessionNotice() {
  return (
    <Text fontSize="xs" color="gray.500" mt={2}>
      Los datos de este pedido se guardan temporalmente en tu dispositivo para
      poder completar la compra. Se eliminarán automáticamente al finalizar el
      pedido o tras un periodo de inactividad.
    </Text>
  );
}

import { Box, Flex, Text, Circle } from "@chakra-ui/react";

const STEPS = [
  { key: "created", label: "Pedido recibido" },
  { key: "processing", label: "En preparación" },
  { key: "shipped", label: "Enviado" },
  { key: "delivered", label: "Entregado" },
];

export function OrderTimeline({ status }) {
  if (status === "cancelled") {
    return (
      <Box
        mt={4}
        p={4}
        border="1px solid"
        borderColor="red.300"
        borderRadius="md"
        bg="red.50"
      >
        <Text fontWeight="bold" color="red.600">
          Pedido cancelado
        </Text>
        <Text fontSize="sm" color="red.500">
          Este pedido fue cancelado y no continuará su procesamiento.
        </Text>
      </Box>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <Flex mt={6} justify="space-between" align="center">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <Flex
            key={step.key}
            direction="column"
            align="center"
            flex="1"
            position="relative"
          >
            {/* Línea izquierda */}
            {index > 0 && (
              <Box
                position="absolute"
                top="14px"
                left="0"
                right="50%"
                height="2px"
                bg={isCompleted ? "green.400" : "gray.300"}
                zIndex={0}
              />
            )}

            {/* Línea derecha */}
            {index < STEPS.length - 1 && (
              <Box
                position="absolute"
                top="14px"
                left="50%"
                right="0"
                height="2px"
                bg={isCompleted ? "green.400" : "gray.300"}
                zIndex={0}
              />
            )}

            {/* Círculo */}
            <Circle
              size="28px"
              bg={
                isCompleted
                  ? "green.400"
                  : isActive
                  ? "blue.400"
                  : "gray.300"
              }
              color="white"
              fontWeight="bold"
              zIndex={1}
            >
              {index + 1}
            </Circle>

            {/* Texto */}
            <Text
              mt={2}
              fontSize="xs"
              textAlign="center"
              color={isCompleted || isActive ? "gray.800" : "gray.400"}
            >
              {step.label}
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
}

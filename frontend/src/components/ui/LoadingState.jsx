import { Center, Spinner, Stack, Text } from "@chakra-ui/react";

export function LoadingState({ message = "Cargando…", inline = false, ...props }) {
  return (
    <Center
      role="status"
      aria-live="polite"
      minH={inline ? undefined : "12rem"}
      py={inline ? 4 : 8}
      {...props}
    >
      <Stack align="center" spacing={3}>
        <Spinner thickness="3px" speed="0.65s" />
        <Text color="textMuted">{message}</Text>
      </Stack>
    </Center>
  );
}

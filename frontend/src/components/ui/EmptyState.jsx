import { Center, Heading, Stack, Text } from "@chakra-ui/react";

export function EmptyState({ title, description, action, ...props }) {
  return (
    <Center py={10} px={4} {...props}>
      <Stack align="center" spacing={3} maxW="lg" textAlign="center">
        <Heading as="h2" fontSize="lg">
          {title}
        </Heading>
        {description && <Text color="textMuted">{description}</Text>}
        {action}
      </Stack>
    </Center>
  );
}

import { Box, Flex, Heading, Text } from "@chakra-ui/react";

export function SectionHeader({ title, description, actions, ...props }) {
  return (
    <Flex
      align={{ base: "stretch", sm: "center" }}
      direction={{ base: "column", sm: "row" }}
      justify="space-between"
      gap={3}
      mb={4}
      {...props}
    >
      <Box minW={0}>
        <Heading as="h2" fontSize={{ base: "lg", md: "xl" }} lineHeight="short">
          {title}
        </Heading>
        {description && (
          <Text mt={1} fontSize="sm" color="textMuted">
            {description}
          </Text>
        )}
      </Box>
      {actions && <Box flexShrink={0}>{actions}</Box>}
    </Flex>
  );
}

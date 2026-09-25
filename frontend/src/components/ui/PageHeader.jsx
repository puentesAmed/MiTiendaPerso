import { Box, Flex, Heading, Text } from "@chakra-ui/react";

export function PageHeader({ title, description, actions, ...props }) {
  return (
    <Flex
      as="header"
      direction={{ base: "column", md: "row" }}
      align={{ base: "stretch", md: "flex-start" }}
      justify="space-between"
      gap={4}
      mb={6}
      {...props}
    >
      <Box minW={0}>
        <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} lineHeight="short">
          {title}
        </Heading>
        {description && (
          <Text mt={2} color="textMuted" maxW="3xl">
            {description}
          </Text>
        )}
      </Box>
      {actions && <Box flexShrink={0}>{actions}</Box>}
    </Flex>
  );
}

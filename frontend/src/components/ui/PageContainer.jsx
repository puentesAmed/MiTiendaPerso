import { Container } from "@chakra-ui/react";

const MAX_WIDTHS = {
  default: "container.xl",
  narrow: "container.md",
  wide: "container.2xl",
};

export function PageContainer({ children, size = "default", ...props }) {
  return (
    <Container
      maxW={MAX_WIDTHS[size] || MAX_WIDTHS.default}
      px={{ base: 4, md: 6, lg: 8 }}
      py={{ base: 6, md: 8 }}
      {...props}
    >
      {children}
    </Container>
  );
}

// theme/index.js
import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  semanticTokens: {
    colors: {
      bgPage: {
        default: "gray.50",
        _dark: "gray.900",
      },
      bgHeader: {
        default: "whiteAlpha.900",
        _dark: "blackAlpha.700",
      },
      bgSurface: {
        default: "white",
        _dark: "gray.800",
      },
      textPrimary: {
        default: "gray.800",
        _dark: "gray.100",
      },
      textMuted: {
        default: "gray.500",
        _dark: "gray.400",
      },
      brand: {
        default: "blue.500",
        _dark: "blue.300",
      },
      borderSubtle: {
        default: "gray.200",
        _dark: "gray.700",
      },
    },
  },
});

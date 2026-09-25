import { extendTheme } from "@chakra-ui/react";

const focusVisible = {
  outline: "2px solid",
  outlineColor: "focusRing",
  outlineOffset: "2px",
  boxShadow: "none",
};

export const theme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: "#EEF2FF",
      100: "#E0E7FF",
      200: "#C7D2FE",
      300: "#A5B4FC",
      400: "#818CF8",
      500: "#6366F1",
      600: "#4F46E5",
      700: "#4338CA",
      800: "#3730A3",
      900: "#312E81",
    },
  },
  semanticTokens: {
    colors: {
      bgPage: { default: "gray.50", _dark: "gray.900" },
      bgHeader: { default: "whiteAlpha.900", _dark: "blackAlpha.700" },
      bgSurface: { default: "white", _dark: "gray.800" },
      bgSubtle: { default: "gray.100", _dark: "gray.700" },
      bgElevated: { default: "white", _dark: "gray.700" },
      infoSurface: { default: "blue.50", _dark: "whiteAlpha.100" },

      textPrimary: { default: "gray.800", _dark: "gray.100" },
      textSecondary: { default: "gray.700", _dark: "gray.200" },
      textMuted: { default: "gray.600", _dark: "gray.400" },
      textInverse: { default: "white", _dark: "gray.900" },

      borderSubtle: { default: "gray.200", _dark: "gray.700" },
      borderDefault: { default: "gray.300", _dark: "gray.600" },
      borderStrong: { default: "gray.500", _dark: "gray.400" },

      actionPrimary: { default: "brand.600", _dark: "brand.300" },
      actionPrimaryHover: { default: "brand.700", _dark: "brand.200" },
      actionSecondary: { default: "brand.50", _dark: "whiteAlpha.100" },
      focusRing: { default: "brand.600", _dark: "brand.300" },

      statusInfo: { default: "blue.700", _dark: "blue.200" },
      statusInfoSurface: { default: "blue.50", _dark: "blue.900" },
      statusSuccess: { default: "green.700", _dark: "green.200" },
      statusSuccessSurface: { default: "green.50", _dark: "green.900" },
      statusWarning: { default: "orange.800", _dark: "orange.200" },
      statusWarningSurface: { default: "orange.50", _dark: "orange.900" },
      statusError: { default: "red.700", _dark: "red.200" },
      statusErrorSurface: { default: "red.50", _dark: "red.900" },

      availabilityAvailable: { default: "green.700", _dark: "green.200" },
      availabilityUnavailable: { default: "red.700", _dark: "red.200" },
    },
  },
  fonts: {
    body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  radii: {
    control: "0.375rem",
    surface: "0.75rem",
  },
  shadows: {
    focusRing: "0 0 0 3px var(--chakra-colors-focusRing)",
  },
  styles: {
    global: {
      "html, body, #root": {
        minHeight: "100%",
      },
      body: {
        margin: 0,
        minWidth: "320px",
        bg: "bgPage",
        color: "textPrimary",
      },
      "#root": {
        width: "100%",
      },
      "@media (prefers-reduced-motion: reduce)": {
        "*, *::before, *::after": {
          scrollBehavior: "auto !important",
          transitionDuration: "0.01ms !important",
          animationDuration: "0.01ms !important",
          animationIterationCount: "1 !important",
        },
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "control",
        fontWeight: "semibold",
        _focusVisible: focusVisible,
        _disabled: {
          opacity: 0.55,
          cursor: "not-allowed",
        },
      },
      sizes: {
        sm: { h: "44px", minW: "44px", px: 3 },
        md: { h: "44px", minW: "44px", px: 4 },
        lg: { h: "48px", minW: "48px", px: 6 },
      },
      defaultProps: {
        colorScheme: "brand",
        size: "md",
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: "control",
          _focusVisible: focusVisible,
        },
      },
      defaultProps: {
        focusBorderColor: "brand.500",
        errorBorderColor: "red.500",
        variant: "outline",
      },
    },
    Select: {
      baseStyle: {
        field: {
          borderRadius: "control",
          _focusVisible: focusVisible,
        },
      },
      defaultProps: {
        focusBorderColor: "brand.500",
        errorBorderColor: "red.500",
        variant: "outline",
      },
    },
    Textarea: {
      baseStyle: {
        borderRadius: "control",
        _focusVisible: focusVisible,
      },
      defaultProps: {
        focusBorderColor: "brand.500",
        errorBorderColor: "red.500",
        variant: "outline",
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: "bgSurface",
          borderWidth: "1px",
          borderColor: "borderSubtle",
          borderRadius: "surface",
          boxShadow: "sm",
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: "full",
        fontWeight: "semibold",
        textTransform: "none",
      },
      variants: {
        neutral: { bg: "bgSubtle", color: "textSecondary" },
        info: { bg: "statusInfoSurface", color: "statusInfo" },
        success: { bg: "statusSuccessSurface", color: "statusSuccess" },
        warning: { bg: "statusWarningSurface", color: "statusWarning" },
        error: { bg: "statusErrorSurface", color: "statusError" },
      },
      defaultProps: {
        variant: "neutral",
      },
    },
    Alert: {
      baseStyle: {
        container: {
          borderRadius: "control",
          borderWidth: "1px",
          borderColor: "borderSubtle",
        },
      },
    },
    Spinner: {
      baseStyle: {
        color: "actionPrimary",
      },
    },
  },
});

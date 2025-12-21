import { Box, Button, Text, HStack, Link, useColorModeValue } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useEffect, useState } from "react";

const COOKIE_KEY = "cookies_accepted_v1";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <Box
      position="fixed"
      bottom="0"
      left="0"
      width="100%"
      bg={useColorModeValue("gray.900", "gray.800")}
      color="white"
      px={4}
      py={3}
      zIndex="banner"
    >
      <HStack justify="space-between" spacing={4} flexWrap="wrap">
        <Text fontSize="sm">
          Utilizamos cookies técnicas para garantizar el correcto funcionamiento del sitio.
          {" "}
          <Link as={RouterLink} to="/politica-cookies" textDecoration="underline">
            Más información
          </Link>
        </Text>

        <Button
          size="sm"
          colorScheme="blue"
          onClick={() => {
            localStorage.setItem(COOKIE_KEY, "true");
            setVisible(false);
          }}
        >
          Aceptar
        </Button>
      </HStack>
    </Box>
  );
}

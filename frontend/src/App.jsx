// src/App.jsx
import React from "react";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Button,
  Link as ChakraLink,
  useColorMode,
  useDisclosure,
  useColorModeValue,
  Text,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  VStack,
  Spacer,
  Divider,
  Avatar,
} from "@chakra-ui/react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon } from "@chakra-ui/icons";

import { useAuth } from "./hooks/useAuth";
import Logo from "./components/common/Logo/Logo";

// Páginas visibles en la barra principal
const PAGES = Object.freeze([
  { name: "Inicio", path: "/" },
  { name: "Carrito", path: "/cart" },
  { name: "Checkout", path: "/checkout" },
  // Admin solo la mostraremos si el usuario es admin
  { name: "Admin", path: "/admin", adminOnly: true },
]);

function NavItem({ to, children, onClick }) {
  const activeBg = useColorModeValue("blue.100", "gray.700");
  const activeCol = useColorModeValue("blue.800", "gray.100");
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const linkCol = useColorModeValue("gray.800", "gray.100");

  return (
    <ChakraLink
      as={NavLink}
      to={to}
      onClick={onClick}
      px={3}
      py={2}
      borderRadius="lg"
      color={linkCol}
      _hover={{ textDecoration: "none", bg: hoverBg }}
      style={({ isActive }) => ({
        background: isActive ? activeBg : "transparent",
        color: isActive ? activeCol : undefined,
        fontWeight: isActive ? 700 : 500,
      })}
      aria-current={({ isActive }) => (isActive ? "page" : undefined)}
    >
      {children}
    </ChakraLink>
  );
}

export function App() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [scrolled, setScrolled] = React.useState(false);

  const headerBg = useColorModeValue(
    "rgba(255,255,255,0.9)",
    "rgba(17,24,39,0.9)"
  );
  const border = useColorModeValue("gray.200", "gray.700");
  const brandDot = useColorModeValue("blue.500", "pink.400");
  const contentBg = useColorModeValue("gray.50", "gray.900");
  const contentColor = useColorModeValue("gray.800", "gray.100");
  const footerBg = useColorModeValue("blue.50", "gray.900");
  const footerColor = useColorModeValue("gray.900", "gray.100");

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (isOpen) onClose();
  }, [loc.pathname, isOpen, onClose]);

  React.useEffect(() => {
    const el = document.getElementById("main-content");
    if (el) el.focus();
  }, [loc.pathname]);

  const handleLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  const isAdmin = user?.role === "admin";

  return (
    <Flex direction="column" minH="100vh" bg={contentBg} color={contentColor}>
      {/* HEADER */}
      <Box
        as="header"
        position="sticky"
        top="0"
        zIndex="sticky"
        bg={headerBg}
        backdropFilter="saturate(180%) blur(8px)"
        borderBottom="1px solid"
        borderColor={border}
        boxShadow={scrolled ? "sm" : "none"}
      >
        <Flex align="center" px={{ base: 4, md: 6 }} py={2} gap={3}>
          <IconButton
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            icon={isOpen ? <CloseIcon boxSize={3} /> : <HamburgerIcon boxSize={5} />}
            display={{ base: "inline-flex", md: "none" }}
            onClick={isOpen ? onClose : onOpen}
            variant="ghost"
          />

          {/* Logo + título */}
          <HStack spacing={3}>
            <Box
              w="9"
              h="9"
              borderRadius="xl"
              bg={brandDot}
              boxShadow="md"
              aria-hidden
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Logo />
            </Box>
            <Box lineHeight="short">
              <Text fontWeight="bold">MiTiendaPerso</Text>
              <Text fontSize="xs" color="gray.500">
                Tu tienda online personalizada
              </Text>
            </Box>
          </HStack>

          {/* Navegación escritorio */}
          <HStack spacing={1} ml={6} display={{ base: "none", md: "flex" }}>
            {PAGES.map((p) => {
              if (p.adminOnly && !isAdmin) return null;
              return (
                <NavItem key={p.path} to={p.path}>
                  {p.name}
                </NavItem>
              );
            })}

            {!user && (
              <>
                <NavItem to="/login">Login</NavItem>
                <NavItem to="/register">Registro</NavItem>
              </>
            )}
          </HStack>

          <Spacer />

          {/* Usuario + tema */}
          <HStack spacing={2}>
            <IconButton
              aria-label="Cambiar tema"
              onClick={toggleColorMode}
              icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              size="sm"
              variant="ghost"
            />

            {user && (
              <HStack
                as="button"
                type="button"
                px={2}
                py={1}
                borderRadius="lg"
                border="1px solid"
                borderColor={border}
                onClick={handleLogout}
                _hover={{
                  bg: useColorModeValue("gray.100", "gray.700"),
                }}
              >
                <Avatar size="sm" name={user.name || "Usuario"} />
                <Text display={{ base: "none", md: "inline" }} fontSize="sm">
                  Salir
                </Text>
              </HStack>
            )}
          </HStack>
        </Flex>
        {scrolled && <Divider opacity={0.25} />}
      </Box>

      {/* DRAWER MÓVIL */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent pt="env(safe-area-inset-top)">
          <DrawerHeader borderBottomWidth="1px">Navegación</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={1}>
              {PAGES.map((p) => {
                if (p.adminOnly && !isAdmin) return null;
                return (
                  <NavItem key={p.path} to={p.path} onClick={onClose}>
                    {p.name}
                  </NavItem>
                );
              })}

              {!user && (
                <>
                  <NavItem to="/login" onClick={onClose}>
                    Login
                  </NavItem>
                  <NavItem to="/register" onClick={onClose}>
                    Registro
                  </NavItem>
                </>
              )}

              <Button mt={3} size="sm" onClick={toggleColorMode} variant="ghost">
                {colorMode === "light" ? "Oscuro" : "Claro"}
              </Button>

              {user && (
                <Button mt={1} size="sm" onClick={handleLogout}>
                  Salir
                </Button>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* CONTENIDO */}
      <Box
        as="main"
        flex="1"
        px={{ base: 4, md: 6 }}
        py={6}
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </Box>

      {/* FOOTER */}
      <Box
        as="footer"
        bg={footerBg}
        color={footerColor}
        py={4}
        textAlign="center"
        borderTop="1px solid"
        borderColor={border}
      >
        © {new Date().getFullYear()} MiTiendaPerso
      </Box>
    </Flex>
  );
}

/*// src/App.jsx
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
import { Logo } from "./components/common/Logo/Logo.jsx";

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
*/

// src/App.jsx
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Button,
  Text,
  Spacer,
  Divider,
  Avatar,
  Badge,
  useColorMode,
  useColorModeValue,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon } from "@chakra-ui/icons";

import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import {Logo }from "./components/common/Logo/Logo";
import { useEffect, useState } from "react";

export function App() {
  // TODOS los hooks siempre en el mismo orden y fuera de condicionales
  const { user, logout } = useAuth();
  const { items } = useCart();
  const { colorMode, toggleColorMode } = useColorMode();
  const headerBg = useColorModeValue("rgba(255,255,255,0.9)", "rgba(17,17,17,0.85)");
  const border = useColorModeValue("gray.200", "gray.700");
  const footerBg = useColorModeValue("gray.50", "gray.900");
  const footerColor = useColorModeValue("gray.700", "gray.200");
  const brandDot = useColorModeValue("blue.500", "blue.300");
  const contentBg = useColorModeValue("gray.50", "gray.900");
  const contentColor = useColorModeValue("gray.800", "gray.100");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // efecto scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
  }, [location.pathname, mobileOpen]);

  const cartCount = items?.reduce((acc, item) => acc + (item.quantity || 0), 0) ?? 0;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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
          {/* Botón menú móvil */}
          <IconButton
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            icon={mobileOpen ? <CloseIcon boxSize={3} /> : <HamburgerIcon boxSize={5} />}
            display={{ base: "inline-flex", md: "none" }}
            onClick={() => setMobileOpen((prev) => !prev)}
            variant="ghost"
          />

          {/* Logo */}
          <HStack spacing={3}>
            <Box
              w="9"
              h="9"
              borderRadius="xl"
              bg={brandDot}
              boxShadow="md"
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

          {/* Navegación desktop */}
          <HStack spacing={3} ml={6} display={{ base: "none", md: "flex" }}>
            <Button as={Link} to="/" variant="ghost" size="sm">
              Inicio
            </Button>
            <Button as={Link} to="/productos" variant="ghost" size="sm">
              Productos
            </Button>
            <Button as={Link} to="/carrito" variant="ghost" size="sm">
              Carrito
              {cartCount > 0 && (
                <Badge ml={2} colorScheme="blue">
                  {cartCount}
                </Badge>
              )}
            </Button>
            {user && user.role === "admin" && (
              <Button as={Link} to="/admin" variant="ghost" size="sm">
                Admin
              </Button>
            )}
          </HStack>

          <Spacer />

          {/* Zona derecha: tema + usuario */}
          <HStack spacing={2}>
            <IconButton
              aria-label="Cambiar tema"
              onClick={toggleColorMode}
              icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              size="sm"
              variant="ghost"
            />

            {user ? (
              <HStack
                as="button"
                type="button"
                px={2}
                py={1}
                borderRadius="lg"
                border="1px solid"
                borderColor={border}
                onClick={handleLogout}
               
              >
                <Avatar size="sm" name={user.name || user.email} />
                <Box textAlign="left" display={{ base: "none", md: "block" }}>
                  <Text fontSize="xs">Hola,</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {user.name || user.email}
                  </Text>
                </Box>
                <Text display={{ base: "none", md: "inline" }} fontSize="xs" ml={2}>
                  Salir
                </Text>
              </HStack>
            ) : (
              <Button as={Link} to="/login" size="sm" variant="outline">
                Entrar
              </Button>
            )}
          </HStack>
        </Flex>
        {scrolled && <Divider opacity={0.25} />}
      </Box>

      {/* Menú móvil desplegable */}
      {mobileOpen && (
        <Box
          display={{ base: "block", md: "none" }}
          borderBottom="1px solid"
          borderColor={border}
          bg={headerBg}
        >
          <Flex direction="column" px={4} py={2} gap={1}>
            <Button as={Link} to="/" variant="ghost" justifyContent="flex-start" size="sm">
              Inicio
            </Button>
            <Button
              as={Link}
              to="/productos"
              variant="ghost"
              justifyContent="flex-start"
              size="sm"
            >
              Productos
            </Button>
            <Button
              as={Link}
              to="/carrito"
              variant="ghost"
              justifyContent="flex-start"
              size="sm"
            >
              Carrito
              {cartCount > 0 && (
                <Badge ml={2} colorScheme="blue">
                  {cartCount}
                </Badge>
              )}
            </Button>
            {user && user.role === "admin" && (
              <Button
                as={Link}
                to="/admin"
                variant="ghost"
                justifyContent="flex-start"
                size="sm"
              >
                Admin
              </Button>
            )}
          </Flex>
        </Box>
      )}

      {/* CONTENIDO */}
      <Box as="main" flex="1" px={{ base: 4, md: 6 }} py={6}>
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

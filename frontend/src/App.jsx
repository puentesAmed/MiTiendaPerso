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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon, ChevronDownIcon } from "@chakra-ui/icons";


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
              <Menu placement="bottom-end">
                <MenuButton
                  as={Button}
                  variant="outline"
                  size="sm"
                  px={2}
                  py={1}
                  borderRadius="lg"
                  leftIcon={<Avatar size="sm" name={user.name || user.email} />}
                  rightIcon={<ChevronDownIcon />}
                >
                  <Box textAlign="left">
                    <Text fontSize="xs" color="gray.500">
                      {user.name ? "Cuenta" : "Usuario"}
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {user.name || user.email}
                    </Text>
                  </Box>
                </MenuButton>

                <MenuList minW="220px">
                  <Box px={3} py={2} borderBottom="1px solid" borderColor={border}>
                    <Text fontSize="xs" color="gray.500">
                      Sesión iniciada como
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {user.email}
                    </Text>
                  </Box>

                  <MenuItem as={Link} to="/perfil">
                    Perfil
                  </MenuItem>

                  <MenuItem as={Link} to="/mis-pedidos">
                    Mis pedidos
                  </MenuItem>

                  <MenuItem as={Link} to="/ayuda">
                    Solicitar ayuda
                  </MenuItem>

                  <MenuDivider />

                  <MenuItem onClick={handleLogout} color="red.500">
                    Cerrar sesión
                  </MenuItem>
                </MenuList>
              </Menu>
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

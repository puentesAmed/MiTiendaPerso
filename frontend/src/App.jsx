/*
import { Outlet, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
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
  Link,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon, SunIcon, MoonIcon, ChevronDownIcon } from "@chakra-ui/icons";


import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import {Logo }from "./components/common/Logo/Logo";
import { CookieNotice } from "./components/common/CookieNotice";

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
    if (!mobileOpen) return;
    const closeMenu = setTimeout(() => setMobileOpen(false), 0);
    return () => clearTimeout(closeMenu);
  }, [location.pathname, mobileOpen]);

  const cartCount = items?.reduce((acc, item) => acc + (item.quantity || 0), 0) ?? 0;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Flex direction="column" minH="100vh" bg={contentBg} color={contentColor}>
           
      <Box
        as="header"
        position="sticky"
        top="0"
        zIndex="sticky"
        bg={useColorModeValue("rgba(255,255,255,0.85)", "rgba(23,25,35,0.6)")}
        backdropFilter="saturate(180%) blur(12px)"
        borderBottom="1px solid"
        borderColor={useColorModeValue("gray.200", "gray.700")}
        boxShadow={scrolled ? "md" : "none"}
        transition="all 0.3s ease"
      >
        <Flex align="center" px={{ base: 4, md: 6 }} py={3} gap={4}>
          
          <IconButton
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            icon={mobileOpen ? <CloseIcon boxSize={3} /> : <HamburgerIcon boxSize={5} />}
            display={{ base: "inline-flex", md: "none" }}
            onClick={() => setMobileOpen((prev) => !prev)}
            variant="ghost"
            _hover={{ bg: "rgba(99,102,241,0.1)" }}
          />

          
          <HStack spacing={3}>
            <Box
              w="10"
              h="10"
              borderRadius="xl"
              bg="#6366F1"
              boxShadow="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="0.2s"
              _hover={{ transform: "scale(1.05)" }}
            >
              <Logo />
            </Box>
            <Box lineHeight="short">
              <Text fontWeight="extrabold" fontSize="lg" color="#1f1f1f">
                MiTiendaPerso
              </Text>
              <Text fontSize="xs" color="gray.500">
                Crea · Personaliza · Sorprende
              </Text>
            </Box>
          </HStack>

         
          <HStack spacing={4} ml={6} display={{ base: "none", md: "flex" }}>
            <Button as={RouterLink} to="/" variant="ghost" size="sm"
              _hover={{ color: "#6366F1", transform: "translateY(-2px)" }}>
              Inicio
            </Button>

            <Button as={RouterLink} to="/productos" variant="ghost" size="sm"
              _hover={{ color: "#6366F1", transform: "translateY(-2px)" }}>
              Productos
            </Button>

            

            <Button as={RouterLink} to="/carrito" variant="ghost" size="sm"
              position="relative"
              _hover={{ color: "#6366F1", transform: "translateY(-2px)" }}
            >
              Carrito
              {cartCount > 0 && (
                <Badge
                  colorScheme="purple"
                  ml={2}
                  borderRadius="full"
                  px={2}
                  py={0.5}
                >
                  {cartCount}
                </Badge>
              )}
            </Button>

            {user && user.role === "admin" && (
              <Button as={RouterLink} to="/admin" variant="ghost" size="sm"
                _hover={{ color: "#6366F1", transform: "translateY(-2px)" }}>
                Admin
              </Button>
            )}
          </HStack>

          <Spacer />

          
          <HStack spacing={3}>

            
            <IconButton
              aria-label="Cambiar tema"
              onClick={toggleColorMode}
              icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              size="sm"
              variant="ghost"
              _hover={{ bg: "rgba(99,102,241,0.1)" }}
            />

            
            {user ? (
              <Menu placement="bottom-end">
                <MenuButton
                  as={Button}
                  variant="outline"
                  borderRadius="full"
                  px={3}
                  py={1}
                  leftIcon={<Avatar size="sm" name={user.name || user.email} />}
                  rightIcon={<ChevronDownIcon />}
                  _hover={{ bg: "rgba(99,102,241,0.1)" }}
                >
                  <Text fontWeight="medium" noOfLines={1}>
                    {user.name || user.email}
                  </Text>
                </MenuButton>

                <MenuList>
                  <MenuItem as={RouterLink} to="/perfil">Perfil</MenuItem>
                  <MenuItem as={RouterLink} to="/mis-pedidos">Mis pedidos</MenuItem>
                  <MenuItem as={RouterLink} to="/ayuda">Ayuda</MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={handleLogout} color="red.400">Cerrar sesión</MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button
                as={RouterLink}
                to="/login"
                size="sm"
                bg="#6366F1"
                color="white"
                borderRadius="full"
                px={4}
                _hover={{ bg: "#4F46E5" }}
              >
                Entrar
              </Button>
            )}
          </HStack>
        </Flex>

        {scrolled && <Divider opacity={0.15} />}
      </Box>


      
      {mobileOpen && (
        <Box
          display={{ base: "block", md: "none" }}
          borderBottom="1px solid"
          borderColor={border}
          bg={headerBg}
        >
          <Flex direction="column" px={4} py={2} gap={1}>
            <Button as={RouterLink} to="/" variant="ghost" justifyContent="flex-start" size="sm">
              Inicio
            </Button>
            <Button
              as={RouterLink}
              to="/productos"
              variant="ghost"
              justifyContent="flex-start"
              size="sm"
            >
              Productos
            </Button>
            <Button
              as={RouterLink}
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
                as={RouterLink}
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

      
      <Box as="main" flex="1" px={{ base: 4, md: 6 }} py={6}>
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
        © {new Date().getFullYear()} MiLuGui
        <Box mt={2} fontSize="sm">
          <Link as={RouterLink} to="/aviso-legal">
            Aviso Legal
          </Link>                  
        </Box>
        <Box mt={2} fontSize="sm">
          <Link as={RouterLink} to="/terminos-condiciones">
            Términos y Condiciones
          </Link>
        </Box>
        <Box mt={2} fontSize="sm">
          <Link as={RouterLink} to="/politica-privacidad">
            Política de Privacidad
          </Link>
        </Box>
        <Box mt={2} fontSize="sm">
          <Link as={RouterLink} to="/contacto-legal">
            Contacto legal
          </Link>
        </Box>


      </Box>
      
      <CookieNotice />
    </Flex>
  );
}
*/

import { Outlet, Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Link,
} from "@chakra-ui/react";
import {
  HamburgerIcon,
  CloseIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
} from "@chakra-ui/icons";

import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import { Logo } from "./components/common/Logo/Logo";
import { CookieNotice } from "./components/common/CookieNotice";

import { useEffect, useState } from "react";

export function App() {
  // hooks (orden intacto)
  const { user, logout } = useAuth();
  const { items } = useCart();
  const { colorMode, toggleColorMode } = useColorMode();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // efecto scroll (sin cambios)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    if (!mobileOpen) return;
    const closeMenu = setTimeout(() => setMobileOpen(false), 0);
    return () => clearTimeout(closeMenu);
  }, [location.pathname, mobileOpen]);

  const cartCount =
    items?.reduce((acc, item) => acc + (item.quantity || 0), 0) ?? 0;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Flex direction="column" minH="100vh" bg="bgPage" color="textPrimary">
      {/* HEADER */}
      <Box
        as="header"
        position="sticky"
        top="0"
        zIndex="sticky"
        bg="bgHeader"
        backdropFilter="saturate(180%) blur(12px)"
        borderBottom="1px solid"
        borderColor="borderSubtle"
        boxShadow={scrolled ? "sm" : "none"}
        transition="all 0.3s ease"
      >
        <Flex align="center" px={{ base: 4, md: 6 }} py={3} gap={4}>
          {/* Menú móvil */}
          <IconButton
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            icon={mobileOpen ? <CloseIcon boxSize={3} /> : <HamburgerIcon boxSize={5} />}
            display={{ base: "inline-flex", md: "none" }}
            onClick={() => setMobileOpen((prev) => !prev)}
            variant="ghost"
            _hover={{ bg: "blackAlpha.100" }}
          />

          {/* Logo */}
          <HStack spacing={3}>
            <Box
              w="10"
              h="10"
              borderRadius="xl"
              bg="brand"
              boxShadow="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="0.2s"
              _hover={{ transform: "scale(1.05)" }}
            >
              <Logo />
            </Box>

            <Box lineHeight="short">
              <Text fontWeight="extrabold" fontSize="lg">
                MiTiendaPerso
              </Text>
              <Text fontSize="xs" color="textMuted">
                Crea · Personaliza · Sorprende
              </Text>
            </Box>
          </HStack>

          {/* Navegación desktop */}
          <HStack spacing={4} ml={6} display={{ base: "none", md: "flex" }}>
            <Button
              as={RouterLink}
              to="/"
              variant="ghost"
              size="sm"
              _hover={{ color: "brand", transform: "translateY(-2px)" }}
            >
              Inicio
            </Button>

            <Button
              as={RouterLink}
              to="/productos"
              variant="ghost"
              size="sm"
              _hover={{ color: "brand", transform: "translateY(-2px)" }}
            >
              Productos
            </Button>

            <Button
              as={RouterLink}
              to="/carrito"
              variant="ghost"
              size="sm"
              position="relative"
              _hover={{ color: "brand", transform: "translateY(-2px)" }}
            >
              Carrito
              {cartCount > 0 && (
                <Badge
                  ml={2}
                  colorScheme="purple"
                  borderRadius="full"
                  px={2}
                  py={0.5}
                >
                  {cartCount}
                </Badge>
              )}
            </Button>

            {user && user.role === "admin" && (
              <Button
                as={RouterLink}
                to="/admin"
                variant="ghost"
                size="sm"
                _hover={{ color: "brand", transform: "translateY(-2px)" }}
              >
                Admin
              </Button>
            )}
          </HStack>

          <Spacer />

          {/* Zona derecha */}
          <HStack spacing={3}>
            {/* Tema */}
            <IconButton
              aria-label="Cambiar tema"
              onClick={toggleColorMode}
              icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              size="sm"
              variant="ghost"
              _hover={{ bg: "blackAlpha.100" }}
            />

            {/* Usuario */}
            {user ? (
              <Menu placement="bottom-end">
                <MenuButton
                  as={Button}
                  variant="outline"
                  borderRadius="full"
                  px={3}
                  py={1}
                  leftIcon={<Avatar size="sm" name={user.name || user.email} />}
                  rightIcon={<ChevronDownIcon />}
                >
                  <Text fontWeight="medium" noOfLines={1}>
                    {user.name || user.email}
                  </Text>
                </MenuButton>

                <MenuList>
                  <MenuItem as={RouterLink} to="/perfil">Perfil</MenuItem>
                  <MenuItem as={RouterLink} to="/mis-pedidos">Mis pedidos</MenuItem>
                  <MenuItem as={RouterLink} to="/ayuda">Ayuda</MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={handleLogout} color="red.400">
                    Cerrar sesión
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button
                as={RouterLink}
                to="/login"
                size="sm"
                bg="brand"
                color="white"
                borderRadius="full"
                px={4}
                _hover={{ opacity: 0.9 }}
              >
                Entrar
              </Button>
            )}
          </HStack>
        </Flex>

        {scrolled && <Divider opacity={0.15} />}
      </Box>

      {/* MENÚ MÓVIL */}
      {mobileOpen && (
        <Box
          display={{ base: "block", md: "none" }}
          borderBottom="1px solid"
          borderColor="borderSubtle"
          bg="bgHeader"
        >
          <Flex direction="column" px={4} py={2} gap={1}>
            <Button as={RouterLink} to="/" variant="ghost" justifyContent="flex-start" size="sm">
              Inicio
            </Button>
            <Button as={RouterLink} to="/productos" variant="ghost" justifyContent="flex-start" size="sm">
              Productos
            </Button>
            <Button as={RouterLink} to="/carrito" variant="ghost" justifyContent="flex-start" size="sm">
              Carrito
              {cartCount > 0 && (
                <Badge ml={2} colorScheme="purple">
                  {cartCount}
                </Badge>
              )}
            </Button>
            {user && user.role === "admin" && (
              <Button as={RouterLink} to="/admin" variant="ghost" justifyContent="flex-start" size="sm">
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
        bg="bgSurface"
        color="textMuted"
        py={4}
        textAlign="center"
        borderTop="1px solid"
        borderColor="borderSubtle"
      >
        © {new Date().getFullYear()} MiLuGui
        <Box mt={2} fontSize="sm">
          <Link as={RouterLink} to="/aviso-legal">Aviso Legal</Link>
        </Box>
        <Box mt={2} fontSize="sm">
          <Link as={RouterLink} to="/terminos-condiciones">Términos y Condiciones</Link>
        </Box>
        <Box mt={2} fontSize="sm">
          <Link as={RouterLink} to="/politica-privacidad">Política de Privacidad</Link>
        </Box>
        <Box mt={2} fontSize="sm">
          <Link as={RouterLink} to="/contacto-legal">Contacto legal</Link>
        </Box>
      </Box>

      {/* Cookies */}
      <CookieNotice />
    </Flex>
  );
}

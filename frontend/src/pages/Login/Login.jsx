/*import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { useNavigate, useLocation } from "react-router-dom";
import { Input, Button, Box, Heading, VStack, Text } from "@chakra-ui/react";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(4, "Mínimo 4 caracteres"),
});

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values) {
    try {
      await login(values);
      const to = loc.state?.from?.pathname || "/";
      nav(to, { replace: true });
    } catch (e) {
      setError("root", { message: e.message ?? "Error al iniciar sesión" });
    }
  }

  return (
    <section className="login-view">
      <div className="login-card">
        <h1>Iniciar sesión</h1>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <small className="error">{errors.email.message}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Contraseña</label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <small className="error">{errors.password.message}</small>
            )}
          </div>

          {errors.root && (
            <small className="error">{errors.root.message}</small>
          )}

          <div className="form-actions">
           <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={isSubmitting}>
            Entrar
          </Button>

          </div>
        </form>
      </div>
    </section>
  );
}
*/

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  useColorModeValue,
  VStack,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useAuth } from "../../hooks/useAuth.js";
import { Link as RouterLink } from "react-router-dom";
import { Link, Text, HStack } from "@chakra-ui/react";




const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(4, "Mínimo 4 caracteres"),
});

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [showPwd, setShowPwd] = React.useState(false);
  
  const cardBg = useColorModeValue("white", "neutral.800");
  const border = useColorModeValue("neutral.200", "neutral.700");
  const btnBg = useColorModeValue("brand.500", "accent.500");
  const btnHover = useColorModeValue("brand.600", "accent.600");
  const btnColor = useColorModeValue("white", "black");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });


  async function onSubmit(values) {
    try {
      await login(values);
      const to = loc.state?.from?.pathname || "/";
      nav(to, { replace: true });
    } catch (e) {
      setError("root", { message: e.message ?? "Error al iniciar sesión" });
    }
  }

  return (
    <Box
      maxW="420px"
      mx="auto"
      mt={12}
      p={6}
      bg={cardBg}
      border="1px solid"
      borderColor={border}
      rounded="lg"
      boxShadow={useColorModeValue("sm", "none")}
    >
      <Heading as="h2" size="lg" mb={6} textAlign="center">
        Iniciar sesión
      </Heading>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <VStack spacing={4} align="stretch">
          <FormControl isInvalid={!!errors.email}>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="tucorreo@dominio.com"
              autoComplete="email"
              autoFocus
              {...register("email")}
            />
            <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.password}>
            <FormLabel>Contraseña</FormLabel>
            <InputGroup>
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              <InputRightElement width="3rem">
                <IconButton
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  size="sm"
                  variant="ghost"
                  // importante: que no envíe el formulario ni robe el foco
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPwd((s) => !s)}
                  icon={showPwd ? <ViewOffIcon /> : <ViewIcon />}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
          </FormControl>

          <Button
            type="submit"
            bg={btnBg}
            color={border}
            _hover={{ bg: btnHover }}
            isLoading={isSubmitting}
            loadingText="Accediendo"
            width="full"
          >
            Entrar
          </Button>

          <HStack justify="center" mt={4} spacing={1}>
            <Text fontSize="sm" color="gray.400">
              ¿No tienes cuenta?
            </Text>
            <Link
              as={RouterLink}
              to="/register"
              fontSize="sm"
              color="blue.300"
              fontWeight="medium"
            >
              Regístrate aquí
            </Link>
          </HStack>

        </VStack>
      </form>
    </Box>
  );
}

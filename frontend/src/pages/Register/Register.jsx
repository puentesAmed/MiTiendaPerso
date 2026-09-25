// src/pages/Register/Register.jsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Box,
  Button,
  Heading,
  Stack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Text,
  Alert,
  AlertIcon,
  useThemeValue,
} from "@/components/ui/legacy-ui";

const schema = z
  .object({
    name: z.string().min(2, "Mínimo 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(4, "Mínimo 4 caracteres"),
    password2: z.string().min(4, "Mínimo 4 caracteres"),
  })
  .refine((data) => data.password === data.password2, {
    message: "Las contraseñas no coinciden",
    path: ["password2"],
  });

export function Register() {
  const { registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromGuest = location.state?.fromGuest === true;
  const guestEmail = location.state?.email || "";

  const cardBg = useThemeValue("white", "gray.800");
  const mutedText = useThemeValue("gray.600", "gray.400");
  const guestEmailBg = useThemeValue("gray.100", "gray.700");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: fromGuest ? guestEmail : "",
      password: "",
      password2: "",
    },
  });

  async function onSubmit(values) {
    try {
      if (fromGuest) {
        const guestId = localStorage.getItem("guest_id");

        if (!guestId) {
          setError("root", {
            message: "La sesión de invitado ha caducado. Regístrate de nuevo.",
          });
          return;
        }

        await registerUser({
          name: values.name,
          email: values.email,
          password: values.password,
          guestId,
          mode: "from-guest",
        });
      } else {
        await registerUser({
          name: values.name,
          email: values.email,
          password: values.password,
        });
      }

      navigate("/login", {
        replace: true,
        state: fromGuest ? { email: values.email } : undefined,
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ?? e.message ?? "Error al registrar";
      setError("root", { message: msg });
    }
  }

  return (
    <Box maxW="420px" mx="auto" mt={12} px={4}>
      <Box
        bg={cardBg}
        p={6}
        borderRadius="lg"
        boxShadow="lg"
        borderWidth="1px"
      >
        <Heading size="lg" mb={4} textAlign="center">
          Crear cuenta
        </Heading>

        {fromGuest && (
          <Alert status="info" mb={4} borderRadius="md">
            <AlertIcon />
            Estás creando una cuenta para conservar tus pedidos como invitado.
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.name}>
              <FormLabel>Nombre</FormLabel>
              <Input {...register("name")} />
              <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                {...register("email")}
                isReadOnly={fromGuest}
                bg={fromGuest ? guestEmailBg : undefined}
                cursor={fromGuest ? "not-allowed" : "text"}
              />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Contraseña</FormLabel>
              <Input type="password" {...register("password")} />
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password2}>
              <FormLabel>Repite contraseña</FormLabel>
              <Input type="password" {...register("password2")} />
              <FormErrorMessage>{errors.password2?.message}</FormErrorMessage>
            </FormControl>

            {errors.root && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {errors.root.message}
              </Alert>
            )}

            <Button
              type="submit"
              colorScheme="blue"
              size="lg"
              isLoading={isSubmitting}
            >
              Registrarme
            </Button>

            <Text fontSize="sm" color={mutedText} textAlign="center">
              Al crear una cuenta aceptas nuestros términos y condiciones.
            </Text>
          </Stack>
        </form>
      </Box>
    </Box>
  );
}

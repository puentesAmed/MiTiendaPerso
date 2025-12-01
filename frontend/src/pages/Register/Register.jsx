import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/useAuth.js";
import { useNavigate } from "react-router-dom";
import { Input, Button, Box, Heading, VStack, Text } from "@chakra-ui/react";
import "./Register.css";

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
  const { register: registerUser } = useAuth();
  const nav = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", password2: "" },
  });

  async function onSubmit(values) {
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      nav("/login", { replace: true });
    } catch (e) {
      setError("root", { message: e.message ?? "Error al registrar" });
    }
  }

  return (
    <section className="login-view">
      <div className="login-card">
        <h1>Crear cuenta</h1>
        <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <small className="error">{errors.name.message}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <small className="error">{errors.email.message}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Contraseña</label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <small className="error">{errors.password.message}</small>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password2">Repite contraseña</label>
            <Input id="password2" type="password" {...register("password2")} />
            {errors.password2 && (
              <small className="error">{errors.password2.message}</small>
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
            Registrarme
          </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

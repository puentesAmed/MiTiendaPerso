import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerRequest } from "../../services/auth.service";
import { Input } from "@chakra-ui/react";
import { Button } from "@chakra-ui/react";
import "./Register.css";

export function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Todos los campos son obligatorios");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);
      await registerRequest({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      // Opción A: redirigir a login
      nav("/login", { replace: true });

      // Opción B: auto-login -> llamar a login() del AuthContext aquí
    } catch (err) {
      setError(err?.message || "Error al registrar usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="register-view">
      <div className="card register-card">
        <h1>Crear cuenta</h1>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Contraseña</label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Repetir contraseña</label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <Button type="submit" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

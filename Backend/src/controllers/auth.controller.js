import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import env from "../config/env.js";

export async function register(req, res) {
  try {
    const { name, email, password, role = "user" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email y password son obligatorios" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Ya existe un usuario con ese email" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const u = await User.create({
      name,
      email,
      passwordHash,
      role: "user", // forzar usuario normal en el registro público
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      userId: u._id,
    });
  } catch (err) {
    console.error("Error en register:", err);
    return res.status(500).json({ message: "Error al registrar usuario" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y password son obligatorios" });
    }

    const u = await User.findOne({ email });
    if (!u) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { sub: u._id, email: u.email, role: u.role, name: u.name },
      env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      user: {
        id: u._id.toString(),
        email: u.email,
        role: u.role,
        name: u.name,
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ message: "Error al iniciar sesión" });
  }
}

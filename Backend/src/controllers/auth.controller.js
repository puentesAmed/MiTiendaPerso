import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { Order } from '../models/Order.js';

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function register(req, res) {
  try {
    const { name, email, password, guestId, mode } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedName || !normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email y password son obligatorios' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Formato de email inválido' });
    }

    if (typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({ message: 'La contraseña es obligatoria' });
    }

    if (mode === 'from-guest' && !guestId) {
      return res
        .status(400)
        .json({ message: 'Sesión de invitado inválida o caducada' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const u = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: 'user', // registro público siempre como usuario
    });

    if (mode === "from-guest" && guestId) {
      await Order.updateMany(
        { 
          guestEmail: u.email,
          userId: { $exists: false }, 

        },
        {
          $set: {
            userId: u._id,
            guestId: null,
          },
        }
      );
      console.log('Pedidos de invitado vinculados a una cuenta');
    }

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      userId: u._id,
    });
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(500).json({ message: 'Error al registrar usuario' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email y password son obligatorios' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Formato de email inválido' });
    }

    if (typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({ message: 'La contraseña es obligatoria' });
    }

    const u = await User.findOne({ email: normalizedEmail });
    if (!u) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { sub: u._id, email: u.email, role: u.role, name: u.name },
      env.JWT_SECRET,
      { expiresIn: '12h' },
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
    console.error('Error en login:', err);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
}

export async function checkEmail(req, res) {
  try {
    const normalizedEmail = normalizeEmail(req.query?.email);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ exists: false });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('_id');
    return res.json({ exists: !!user });
  } catch (err) {
    console.error("checkEmail error:", err);
    return res.status(500).json({ exists: false });
  }
}

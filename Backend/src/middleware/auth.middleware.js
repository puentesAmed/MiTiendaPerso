import jwt from "jsonwebtoken";
import env from "../config/env.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");

  if (!token) {
    return res.status(401).json({ message: "No autenticado" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.userId = payload.sub;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

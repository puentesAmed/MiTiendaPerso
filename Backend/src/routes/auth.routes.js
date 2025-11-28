import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", register);  // clientes se dan de alta
authRouter.post("/login", login);

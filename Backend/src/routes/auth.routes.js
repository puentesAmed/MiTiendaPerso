import { Router } from 'express';
import { login, register, checkEmail } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.get('/check-email', checkEmail);


import express from 'express';
import { register, googleAuthURL, googleCallback } from '../controllers/auth.controller.js';
import { registerValidationRules } from '../validators/auth.validator.js';
import validate from '../middlewares/validate.middleware.js';

const authRoutes = express.Router();

// Traditional register route
authRoutes.post(
  '/register',
  registerValidationRules(),
  validate,
  register
);

// Google OAuth routes
authRoutes.get('/google', googleAuthURL);
authRoutes.get('/google/callback', googleCallback);

export default authRoutes;

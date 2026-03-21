import { Router } from "express";
import { register ,login} from "../controllers/auth.controller.js";
import { registerValidator ,loginValidator} from "../validators/auth.validator.js";
import { verifyEmail } from "../controllers/auth.controller.js";

const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 * @body { username, email, password }
 */
authRouter.post("/register", registerValidator, register);

/**
 * @route POST /api/auth/login
 * @desc Login a user and return JWT
 * @access Public
 * @body { email, password }
 */
authRouter.post("/login", loginValidator, login);

authRouter.get("/verify-email",verifyEmail);


export default authRouter;
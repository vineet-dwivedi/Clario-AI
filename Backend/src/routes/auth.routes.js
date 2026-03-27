import { Router } from "express";
import {
    getme,
    login,
    logout,
    register,
    verifyEmail
} from "../controllers/auth.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
import { loginValidator, registerValidator } from "../validators/auth.validator.js";

const authRouter = Router();

authRouter.post("/register", registerValidator, register);
authRouter.post("/login", loginValidator, login);
authRouter.get("/verify-email", verifyEmail);
authRouter.get("/get-me", authUser, getme);
authRouter.post("/logout", authUser, logout);

export default authRouter;

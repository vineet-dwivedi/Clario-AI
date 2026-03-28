import { Router } from "express";
import {
    getme,
    login,
    logout,
    register,
    updateProfile,
    verifyEmail
} from "../controllers/auth.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
import { profileUpload } from "../middleware/upload.middleware.js";
import { loginValidator, registerValidator } from "../validators/auth.validator.js";

const authRouter = Router();

authRouter.post("/register", registerValidator, register);
authRouter.post("/login", loginValidator, login);
authRouter.get("/verify-email", verifyEmail);
authRouter.get("/get-me", authUser, getme);
authRouter.put("/profile", authUser, profileUpload.single("avatar"), updateProfile);
authRouter.post("/logout", authUser, logout);

export default authRouter;

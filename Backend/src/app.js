import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { createOriginValidator } from "./config/cors.js";
import authRouter from "./routes/auth.routes.js";
import chatRouter from "./routes/chat.routes.js";

const app = express();
const uploadsDir = fileURLToPath(new URL("../uploads", import.meta.url));

app.use(cors({
    origin: createOriginValidator("CORS"),
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
});

app.use("/api/auth", authRouter);
app.use("/api/chats", chatRouter);

app.use((error, req, res, next) => {
    if (!error) {
        return next();
    }

    if (error.name === "MulterError") {
        return res.status(400).json({
            success: false,
            message: error.message || "File upload failed."
        });
    }

    return res.status(400).json({
        success: false,
        message: error.message || "Request failed."
    });
});

export default app;

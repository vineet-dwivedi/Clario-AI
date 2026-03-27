import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";
import { sendEmail } from "../services/mail.service.js";

const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

function createToken(payload, expiresIn) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function sendError(res, status, message, err = null) {
    return res.status(status).json({
        success: false,
        message,
        ...(err ? { err } : {})
    });
}

function formatUser(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email
    };
}

function getVerificationUrl(token) {
    return `${SERVER_URL}/api/auth/verify-email?token=${token}`;
}

async function sendWelcomeEmail(user) {
    await sendEmail({
        to: user.email,
        subject: "Welcome to Clario-AI!",
        html: `
            <p>Hi ${user.username},</p>
            <p>Thank you for registering at <strong>Clario</strong>.</p>
            <p>Please verify your email address:</p>
            <a href="${getVerificationUrl(createToken({ email: user.email }, "1d"))}">
                Verify Email
            </a>
        `
    });
}

export async function register(req, res) {
    try {
        const { username, email, password } = req.body;
        const existingUser = await userModel.findOne({
            $or: [ { email }, { username } ]
        });

        if (existingUser) {
            return sendError(res, 400, "User with this email or username already exists");
        }

        const user = await userModel.create({ username, email, password });

        try {
            await sendWelcomeEmail(user);
        } catch (error) {
            console.error("Welcome email could not be sent:", error?.message || error);
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Register error:", error);
        return sendError(res, 500, "Internal server error");
    }
}

export async function verifyEmail(req, res) {
    try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        const user = await userModel.findOne({ email: decoded.email });

        if (!user) {
            return sendError(res, 400, "Invalid token", "User not found");
        }

        user.verified = true;
        await user.save();

        return res.send(`
            <h1>Email Verified Successfully</h1>
            <p>Your email has been verified. You can now log in.</p>
            <a href="${CLIENT_URL}/login">Go to Login</a>
        `);
    } catch (error) {
        return sendError(res, 400, "Invalid or expired token", error.message);
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return sendError(res, 400, "Invalid email or password", "User not found");
        }

        const passwordMatches = await user.comparePassword(password);

        if (!passwordMatches) {
            return sendError(res, 400, "Invalid email or password", "Incorrect password");
        }

        if (!user.verified) {
            return sendError(res, 400, "Please verify your email before logging in", "Email not verified");
        }

        const token = createToken(
            {
                id: user._id,
                username: user.username
            },
            "7d"
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: formatUser(user)
        });
    } catch (error) {
        console.error("Login error:", error);
        return sendError(res, 500, "Internal server error");
    }
}

export async function getme(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password");

        if (!user) {
            return sendError(res, 404, "User not found", "User not found");
        }

        return res.status(200).json({
            success: true,
            message: "User details fetched successfully",
            user
        });
    } catch (error) {
        console.error("Get me error:", error);
        return sendError(res, 500, "Internal server error");
    }
}

export function logout(req, res) {
    res.clearCookie("token");

    return res.status(200).json({
        success: true,
        message: "Logout successful"
    });
}

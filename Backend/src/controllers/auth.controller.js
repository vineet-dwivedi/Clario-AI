import userModel from "../models/user.model.js";
import { isMailConfigured, sendEmail } from "../services/mail.services.js";
import { getGoogleAuthUrl, getGoogleUserInfo } from "../services/google.services.js";
import jwt from "jsonwebtoken";

export async function register(req, res) {
    try {
        const username = req.body.username.trim();
        const email = req.body.email.trim().toLowerCase();
        const { password } = req.body;

        const existingUser = await userModel.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this email or username already exists"
            });
        }

        const user = await userModel.create({
            username,
            email,
            password
        });

        if (isMailConfigured()) {
            try {
                await sendEmail({
                    to: email,
                    subject: "Welcome",
                    text: `Hi ${username}, your account has been created successfully.`
                });
            } catch (emailError) {
                console.error("Email sending error:", emailError.message);
            }
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                verified: user.verified,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "User with this email or username already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Error during registration"
        });
    }
}

export function googleAuthURL(req, res) {
    try {
        const url = getGoogleAuthUrl();
        return res.status(200).json({
            success: true,
            authURL: url
        });
    } catch (error) {
        console.error("Error generating Google auth URL:", error.message);
        return res.status(500).json({
            success: false,
            message: "Error generating authentication URL"
        });
    }
}

export async function googleCallback(req, res) {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Missing authorization code"
            });
        }

        const googleUser = await getGoogleUserInfo(code);

        let user = await userModel.findOne({ email: googleUser.email });

        if (!user) {
            user = await userModel.create({
                username: googleUser.name || googleUser.email.split("@")[0],
                email: googleUser.email,
                googleId: googleUser.id,
                verified: true,
                password: null
            });
        } else if (!user.googleId) {
            user.googleId = googleUser.id;
            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        return res.status(200).json({
            success: true,
            message: "Google authentication successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                verified: user.verified
            }
        });
    } catch (error) {
        console.error("Google callback error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Error during Google authentication"
        });
    }
}

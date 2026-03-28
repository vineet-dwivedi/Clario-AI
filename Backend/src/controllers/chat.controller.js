import mongoose from "mongoose";
import chatModel from "../models/chat.model.js";
import messageModel from "../models/message.model.js";
import {
    AiServiceError,
    generateChatReply,
    getAvailableModels,
    streamChatReply
} from "../services/ai.service.js";
import { generateImage, getImageModel } from "../services/image.service.js";
import { getVoiceModel, transcribeAudio } from "../services/voice.service.js";

const DEFAULT_CHAT_TITLE = "New Chat";

function getErrorStatus(error) {
    return error instanceof AiServiceError ? error.statusCode : 500;
}

function sendError(res, error, fallbackMessage) {
    return res.status(getErrorStatus(error)).json({
        success: false,
        message: error.message || fallbackMessage,
        data: null
    });
}

function getUserId(req) {
    const userId = req.user?.id;

    if (!userId) {
        throw new AiServiceError("Unauthorized", 401);
    }

    return userId;
}

function getMessageText(message) {
    const text = String(message || "").trim();

    if (!text) {
        throw new AiServiceError("Message is required.", 400);
    }

    return text;
}

function formatChat(chat) {
    return {
        id: String(chat._id),
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
    };
}

function formatMessage(message) {
    return {
        id: String(message._id),
        role: message.role,
        content: message.content,
        kind: message.kind || "text",
        images: Array.isArray(message.images) ? message.images : [],
        provider: message.provider || null,
        model: message.model || null,
        createdAt: message.createdAt
    };
}

function normalizeImages(images = []) {
    if (!Array.isArray(images)) {
        return [];
    }

    return images
        .filter((image) => image?.mimeType && (image?.dataUrl || image?.data))
        .map((image) => ({
            mimeType: image.mimeType,
            dataUrl:
                image.dataUrl ||
                `data:${image.mimeType};base64,${String(image.data).replace(/^data:[^;]+;base64,/i, "")}`
        }));
}

function writeSseEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function findChat(userId, chatId) {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new AiServiceError("Invalid chat id.", 400);
    }

    const chat = await chatModel.findOne({ _id: chatId, user: userId });

    if (!chat) {
        throw new AiServiceError("Chat not found.", 404);
    }

    return chat;
}

async function getOrCreateChat(userId, chatId) {
    if (chatId) {
        return findChat(userId, chatId);
    }

    return chatModel.create({ user: userId });
}

async function updateChatTitle(chat, title) {
    if (!title?.trim() || chat.title !== DEFAULT_CHAT_TITLE) {
        return;
    }

    chat.title = title.trim();
    await chat.save();
}

async function updateChatTime(chatId) {
    await chatModel.updateOne(
        { _id: chatId },
        { $set: { updatedAt: new Date() } }
    );
}

async function saveMessage(chatId, role, content, options = {}) {
    return messageModel.create({
        chat: chatId,
        role,
        content,
        kind: options.kind || "text",
        images: normalizeImages(options.images),
        provider: options.provider || null,
        model: options.model || null
    });
}

async function getChatHistory(chatId) {
    const messages = await messageModel
        .find({
            chat: chatId,
            $or: [
                { kind: { $exists: false } },
                { kind: "text" }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("role content")
        .lean();

    return messages.reverse();
}

export async function getChats(req, res) {
    try {
        const chats = await chatModel
            .find({ user: getUserId(req) })
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Chats fetched successfully",
            data: chats.map(formatChat)
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch chats.");
    }
}

export async function getChatMessages(req, res) {
    try {
        const userId = getUserId(req);
        const chat = await findChat(userId, req.params.chatId);
        const messages = await messageModel.find({ chat: chat._id }).sort({ createdAt: 1 }).lean();

        return res.status(200).json({
            success: true,
            message: "Chat messages fetched successfully",
            data: {
                chat: formatChat(chat),
                messages: messages.map(formatMessage)
            }
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch chat messages.");
    }
}

export async function deleteChat(req, res) {
    try {
        const userId = getUserId(req);
        const chat = await findChat(userId, req.params.chatId);

        await messageModel.deleteMany({ chat: chat._id });
        await chat.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Chat deleted successfully",
            data: { chatId: String(chat._id) }
        });
    } catch (error) {
        return sendError(res, error, "Failed to delete chat.");
    }
}

export async function getModels(req, res) {
    try {
        return res.status(200).json({
            success: true,
            message: "Available AI models fetched successfully",
            data: [
                ...getAvailableModels().map((model) => ({
                    ...model,
                    capability: "chat"
                })),
                {
                    ...getImageModel(),
                    capability: "image",
                    isDefault: true
                },
                {
                    ...getVoiceModel(),
                    capability: "voice",
                    isDefault: true
                }
            ]
        });
    } catch (error) {
        return sendError(res, error, "Failed to fetch available AI models.");
    }
}

export async function sendMessage(req, res) {
    try {
        const userId = getUserId(req);
        const text = getMessageText(req.body.message);
        const chat = await getOrCreateChat(userId, req.body.chatId);
        const history = await getChatHistory(chat._id);
        const userMessage = await saveMessage(chat._id, "user", text);
        const aiReply = await generateChatReply({
            message: text,
            history,
            generateTitle: chat.title === DEFAULT_CHAT_TITLE,
            model: req.body.model
        });

        await updateChatTitle(chat, aiReply.title);

        const aiMessage = await saveMessage(chat._id, "ai", aiReply.text, {
            provider: aiReply.provider,
            model: aiReply.model
        });

        await updateChatTime(chat._id);

        return res.status(200).json({
            success: true,
            message: "AI response generated successfully",
            data: {
                chat: formatChat(chat),
                model: aiReply.model,
                userMessage: formatMessage(userMessage),
                aiMessage: formatMessage(aiMessage)
            }
        });
    } catch (error) {
        console.error("AI chat error:", error);
        return sendError(res, error, "Failed to generate AI response.");
    }
}

export async function sendImageMessage(req, res) {
    try {
        const userId = getUserId(req);
        const text = getMessageText(req.body.message);
        const chat = await getOrCreateChat(userId, req.body.chatId);
        const userMessage = await saveMessage(chat._id, "user", text);
        const aiReply = await generateImage({ message: text });

        await updateChatTitle(chat, text);

        const aiMessage = await saveMessage(chat._id, "ai", aiReply.text, {
            kind: "image",
            images: aiReply.images,
            provider: aiReply.provider,
            model: aiReply.model
        });

        await updateChatTime(chat._id);

        return res.status(200).json({
            success: true,
            message: "Image generated successfully",
            data: {
                chat: formatChat(chat),
                model: aiReply.model,
                provider: aiReply.provider,
                userMessage: formatMessage(userMessage),
                aiMessage: formatMessage(aiMessage)
            }
        });
    } catch (error) {
        console.error("Image generation error:", error);
        return sendError(res, error, "Failed to generate image.");
    }
}

export async function transcribeVoiceMessage(req, res) {
    try {
        getUserId(req);

        const audioBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
        const mimeType = req.get("content-type") || "application/octet-stream";
        const result = await transcribeAudio({ audioBuffer, mimeType });

        return res.status(200).json({
            success: true,
            message: "Voice transcribed successfully",
            data: {
                text: result.text,
                provider: result.provider,
                model: result.model
            }
        });
    } catch (error) {
        console.error("Voice transcription error:", error);
        return sendError(res, error, "Failed to transcribe voice.");
    }
}

export async function sendStreamMessage(req, res) {
    let handleClose;

    try {
        const userId = getUserId(req);
        const text = getMessageText(req.body.message);
        const chat = await getOrCreateChat(userId, req.body.chatId);
        const history = await getChatHistory(chat._id);
        const userMessage = await saveMessage(chat._id, "user", text);
        const abortController = new AbortController();

        handleClose = () => abortController.abort();
        req.on("aborted", handleClose);
        res.on("close", handleClose);

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        for await (const event of streamChatReply({
            message: text,
            history,
            generateTitle: chat.title === DEFAULT_CHAT_TITLE,
            model: req.body.model,
            signal: abortController.signal
        })) {
            if (event.type === "meta") {
                await updateChatTitle(chat, event.data.title);

                writeSseEvent(res, "meta", {
                    ...event.data,
                    chat: {
                        ...formatChat(chat),
                        title: event.data.title || (chat.title === DEFAULT_CHAT_TITLE ? "" : chat.title)
                    },
                    userMessage: formatMessage(userMessage)
                });
                continue;
            }

            if (event.type === "token") {
                writeSseEvent(res, "token", event.data);
                continue;
            }

            if (event.type === "done") {
                await updateChatTitle(chat, event.data.title);

                const aiMessage = await saveMessage(chat._id, "ai", event.data.text, {
                    provider: event.data.provider,
                    model: event.data.model
                });

                await updateChatTime(chat._id);

                writeSseEvent(res, "done", {
                    ...event.data,
                    chat: formatChat(chat),
                    userMessage: formatMessage(userMessage),
                    aiMessage: formatMessage(aiMessage)
                });
            }
        }

        if (!res.writableEnded) {
            res.end();
        }
    } catch (error) {
        console.error("AI stream error:", error);

        if (res.headersSent) {
            if (!res.writableEnded && !res.destroyed) {
                writeSseEvent(res, "error", {
                    message: error.message || "Failed to stream AI response."
                });
                res.end();
            }

            return;
        }

        return sendError(res, error, "Failed to generate AI response.");
    } finally {
        if (handleClose) {
            req.off("aborted", handleClose);
            res.off("close", handleClose);
        }
    }
}

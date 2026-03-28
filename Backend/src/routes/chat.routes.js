import express, { Router } from "express";
import {
    deleteChat,
    getChatMessages,
    getChats,
    getModels,
    sendImageMessage,
    sendMessage,
    sendStreamMessage,
    transcribeVoiceMessage
} from "../controllers/chat.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

const chatRouter = Router();

chatRouter.use(authUser);

chatRouter.get("/", getChats);
chatRouter.get("/models", getModels);
chatRouter.get("/:chatId/messages", getChatMessages);
chatRouter.delete("/:chatId", deleteChat);
chatRouter.post(
    "/voice/transcribe",
    express.raw({
        type: [ "audio/*", "application/octet-stream" ],
        limit: "12mb"
    }),
    transcribeVoiceMessage
);
chatRouter.post("/image", sendImageMessage);
chatRouter.post("/message", sendMessage);
chatRouter.post("/message/stream", sendStreamMessage);

export default chatRouter;

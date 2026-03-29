import express, { Router } from "express";
import {
    deleteChat,
    getChatMessages,
    getChats,
    getModels,
    sendImageMessage,
    sendMessage,
    sendStreamMessage,
    updateSavedChat,
    transcribeVoiceMessage
} from "../controllers/chat.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
import { chatUpload } from "../middleware/upload.middleware.js";

const chatRouter = Router();

chatRouter.use(authUser);

chatRouter.get("/", getChats);
chatRouter.get("/models", getModels);
chatRouter.get("/:chatId/messages", getChatMessages);
chatRouter.delete("/:chatId", deleteChat);
chatRouter.patch("/:chatId/save", updateSavedChat);
chatRouter.post(
    "/voice/transcribe",
    express.raw({
        type: [ "audio/*", "application/octet-stream" ],
        limit: "12mb"
    }),
    transcribeVoiceMessage
);
chatRouter.post("/image", sendImageMessage);
chatRouter.post("/message", chatUpload.array("files", 6), sendMessage);
chatRouter.post("/message/stream", chatUpload.array("files", 6), sendStreamMessage);

export default chatRouter;

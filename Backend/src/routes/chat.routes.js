import { Router } from "express";
import {
    deleteChat,
    getChatMessages,
    getChats,
    getModels,
    sendImageMessage,
    sendMessage,
    sendStreamMessage
} from "../controllers/chat.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

const chatRouter = Router();

chatRouter.use(authUser);

chatRouter.get("/", getChats);
chatRouter.get("/models", getModels);
chatRouter.get("/:chatId/messages", getChatMessages);
chatRouter.delete("/:chatId", deleteChat);
chatRouter.post("/image", sendImageMessage);
chatRouter.post("/message", sendMessage);
chatRouter.post("/message/stream", sendStreamMessage);

export default chatRouter;

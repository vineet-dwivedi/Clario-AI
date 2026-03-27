import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const PROVIDER = "openai";
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const SYSTEM_PROMPT = "You are a helpful AI assistant.";

export class AiServiceError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = "AiServiceError";
        this.statusCode = statusCode;
    }
}

function getChatModel(model) {
    if (!process.env.OPENAI_API_KEY) {
        throw new AiServiceError("OPENAI_API_KEY is missing.", 500);
    }

    return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: model || MODEL
    });
}

function getTitle(message) {
    return message.replace(/\s+/g, " ").trim().slice(0, 60) || "New Chat";
}

function getText(content) {
    if (typeof content === "string") {
        return content;
    }

    if (Array.isArray(content)) {
        return content.map((part) => part?.text || "").join("");
    }

    return String(content || "");
}

function cleanText(content) {
    return getText(content)
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/<\/?think>/gi, "")
        .trim();
}

function buildMessages(message, history = []) {
    const messages = [ new SystemMessage(SYSTEM_PROMPT) ];

    for (const item of history) {
        if (!item?.content?.trim()) {
            continue;
        }

        messages.push(
            item.role === "ai"
                ? new AIMessage(item.content.trim())
                : new HumanMessage(item.content.trim())
        );
    }

    messages.push(new HumanMessage(message));
    return messages;
}

function requireMessage(message) {
    const text = String(message || "").trim();

    if (!text) {
        throw new AiServiceError("Message is required.", 400);
    }

    return text;
}

function createReply(model, text, title) {
    return {
        provider: PROVIDER,
        model,
        title,
        text,
        fallbackUsed: false,
        fallbackFrom: null
    };
}

function formatError(error) {
    if (error instanceof AiServiceError) {
        return error;
    }

    if (error?.name === "AbortError") {
        return new AiServiceError("AI request was cancelled.", 504);
    }

    return new AiServiceError(error?.message || "Failed to generate AI response.", 502);
}

export function getAvailableModels() {
    return [
        {
            alias: MODEL,
            model: MODEL,
            label: MODEL,
            provider: PROVIDER,
            apiKeyEnvVar: "OPENAI_API_KEY",
            isDefault: true
        }
    ];
}

export async function generateChatReply({
    message,
    history = [],
    generateTitle = true,
    model
}) {
    const userMessage = requireMessage(message);
    const modelName = model || MODEL;

    try {
        const chatModel = getChatModel(modelName);
        const response = await chatModel.invoke(buildMessages(userMessage, history));
        const text = cleanText(response.content);

        if (!text) {
            throw new AiServiceError("AI returned an empty response.", 502);
        }

        return createReply(modelName, text, generateTitle ? getTitle(userMessage) : null);
    } catch (error) {
        throw formatError(error);
    }
}

export async function* streamChatReply({
    message,
    history = [],
    generateTitle = true,
    model,
    signal
}) {
    const userMessage = requireMessage(message);
    const modelName = model || MODEL;
    const title = generateTitle ? getTitle(userMessage) : null;

    yield {
        type: "meta",
        data: {
            provider: PROVIDER,
            model: modelName,
            title,
            fallbackUsed: false,
            fallbackFrom: null
        }
    };

    try {
        const chatModel = getChatModel(modelName);
        const stream = await chatModel.stream(buildMessages(userMessage, history), { signal });
        let fullText = "";

        for await (const chunk of stream) {
            const text = getText(chunk?.content)
                .replace(/<think>[\s\S]*?<\/think>/gi, "")
                .replace(/<\/?think>/gi, "");

            if (!text) {
                continue;
            }

            fullText += text;
            yield { type: "token", data: { text } };
        }

        if (!fullText.trim()) {
            throw new AiServiceError("AI returned an empty response.", 502);
        }

        yield {
            type: "done",
            data: {
                provider: PROVIDER,
                model: modelName,
                title,
                text: fullText,
                fallbackUsed: false,
                fallbackFrom: null
            }
        };
    } catch (error) {
        throw formatError(error);
    }
}

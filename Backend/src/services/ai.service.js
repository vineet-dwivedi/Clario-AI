import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

const TEMPERATURE = getNumber(process.env.CHAT_TEMPERATURE, 0.7);
const TOP_P = getNumber(process.env.CHAT_TOP_P, 0.9);
const MAX_TOKENS = getNumber(process.env.CHAT_MAX_TOKENS, 1024);

const CHAT_MODELS = [
    {
        alias: "gemini",
        label: "Gemini Free",
        provider: "google",
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        apiKeyEnvVar: "GEMINI_API_KEY",
        isDefault: true
    },
    {
        alias: "cloudflare",
        label: "Cloudflare Qwen",
        provider: "cloudflare",
        model: process.env.CLOUDFLARE_MODEL || "@cf/qwen/qwen3-30b-a3b-fp8",
        apiKeyEnvVar: "CLOUDFLARE_API_TOKEN",
        isDefault: false
    }
];

export class AiServiceError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = "AiServiceError";
        this.statusCode = statusCode;
    }
}

function getNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getCloudflareBaseUrl() {
    const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();

    if (!accountId) {
        throw new AiServiceError("CLOUDFLARE_ACCOUNT_ID is missing.", 500);
    }

    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
}

function getDefaultModelConfig() {
    return CHAT_MODELS.find((model) => model.isDefault) || CHAT_MODELS[0];
}

function getModelConfig(requestedModel) {
    if (!requestedModel) {
        return getDefaultModelConfig();
    }

    return CHAT_MODELS.find((model) =>
        model.alias === requestedModel || model.model === requestedModel
    );
}

function requireModelConfig(requestedModel) {
    const modelConfig = getModelConfig(requestedModel);

    if (!modelConfig) {
        throw new AiServiceError("Selected model is not available.", 400);
    }

    return modelConfig;
}

function createGoogleModel(modelConfig) {
    if (!process.env.GEMINI_API_KEY) {
        throw new AiServiceError("GEMINI_API_KEY is missing.", 500);
    }

    return new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: modelConfig.model,
        temperature: TEMPERATURE,
        topP: TOP_P,
        maxOutputTokens: MAX_TOKENS
    });
}

function createCloudflareModel(modelConfig) {
    if (!process.env.CLOUDFLARE_API_TOKEN) {
        throw new AiServiceError("CLOUDFLARE_API_TOKEN is missing.", 500);
    }

    return new ChatOpenAI({
        apiKey: process.env.CLOUDFLARE_API_TOKEN,
        model: modelConfig.model,
        temperature: TEMPERATURE,
        topP: TOP_P,
        maxTokens: MAX_TOKENS,
        useResponsesApi: false,
        configuration: {
            baseURL: getCloudflareBaseUrl()
        }
    });
}

function getChatModel(modelConfig) {
    if (modelConfig.provider === "google") {
        return createGoogleModel(modelConfig);
    }

    if (modelConfig.provider === "cloudflare") {
        return createCloudflareModel(modelConfig);
    }

    throw new AiServiceError("Unsupported model provider.", 500);
}

function requireMessage(message) {
    const text = String(message || "").trim();

    if (!text) {
        throw new AiServiceError("Message is required.", 400);
    }

    return text;
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
    const messages = [];

    for (const item of history) {
        const text = String(item?.content || "").trim();

        if (!text) {
            continue;
        }

        messages.push(
            item.role === "ai"
                ? new AIMessage(text)
                : new HumanMessage(text)
        );
    }

    messages.push(new HumanMessage(message));
    return messages;
}

function splitText(text, size = 24) {
    const chunks = [];

    for (let index = 0; index < text.length; index += size) {
        chunks.push(text.slice(index, index + size));
    }

    return chunks;
}

function createReply(modelConfig, text, title) {
    return {
        provider: modelConfig.provider,
        model: modelConfig.model,
        title,
        text,
        fallbackUsed: false,
        fallbackFrom: null
    };
}

function throwIfAborted(signal) {
    if (signal?.aborted) {
        throw new AiServiceError("AI request was cancelled.", 504);
    }
}

async function getResponseText({ message, history = [], model, signal }) {
    const modelConfig = requireModelConfig(model);
    const response = await getChatModel(modelConfig).invoke(
        buildMessages(message, history),
        { signal }
    );

    return {
        modelConfig,
        text: cleanText(response.content)
    };
}

function formatError(error, modelConfig = null) {
    if (error instanceof AiServiceError) {
        return error;
    }

    if (error?.name === "AbortError") {
        return new AiServiceError("AI request was cancelled.", 504);
    }

    const message = String(error?.message || "");

    if (modelConfig?.provider === "cloudflare") {
        if (
            /401|403|authentication|authorization|api token|unauthorized|forbidden/i.test(message)
        ) {
            return new AiServiceError(
                "Cloudflare API token is not working. Check CLOUDFLARE_API_TOKEN.",
                502
            );
        }

        if (/account/i.test(message) && /not found|invalid|unknown/i.test(message)) {
            return new AiServiceError(
                "Cloudflare account ID is not working. Check CLOUDFLARE_ACCOUNT_ID.",
                502
            );
        }
    }

    if (modelConfig?.provider === "google" && /api key/i.test(message)) {
        return new AiServiceError("Gemini API key is not working. Check GEMINI_API_KEY.", 502);
    }

    return new AiServiceError(message || "Failed to generate AI response.", 502);
}

export function getAvailableModels() {
    return CHAT_MODELS.map((model) => ({
        alias: model.alias,
        model: model.model,
        label: model.label,
        provider: model.provider,
        apiKeyEnvVar: model.apiKeyEnvVar,
        isDefault: model.isDefault
    }));
}

export async function generateChatReply({
    message,
    history = [],
    generateTitle = true,
    model
}) {
    const userMessage = requireMessage(message);
    const modelConfig = requireModelConfig(model);

    try {
        const result = await getResponseText({
            message: userMessage,
            history,
            model: modelConfig.alias
        });

        if (!result.text) {
            throw new AiServiceError("AI returned an empty response.", 502);
        }

        return createReply(result.modelConfig, result.text, generateTitle ? getTitle(userMessage) : null);
    } catch (error) {
        throw formatError(error, modelConfig);
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
    const modelConfig = requireModelConfig(model);
    const title = generateTitle ? getTitle(userMessage) : null;

    yield {
        type: "meta",
        data: {
            provider: modelConfig.provider,
            model: modelConfig.model,
            title,
            fallbackUsed: false,
            fallbackFrom: null
        }
    };

    try {
        throwIfAborted(signal);

        const result = await getResponseText({
            message: userMessage,
            history,
            model: modelConfig.alias,
            signal
        });

        if (!result.text) {
            throw new AiServiceError("AI returned an empty response.", 502);
        }

        for (const chunk of splitText(result.text)) {
            throwIfAborted(signal);
            yield { type: "token", data: { text: chunk } };
        }

        yield {
            type: "done",
            data: {
                provider: result.modelConfig.provider,
                model: result.modelConfig.model,
                title,
                text: result.text,
                fallbackUsed: false,
                fallbackFrom: null
            }
        };
    } catch (error) {
        throw formatError(error, modelConfig);
    }
}

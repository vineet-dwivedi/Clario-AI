import { AiServiceError } from "./ai.service.js";

const PROVIDER = "pollinations";
const MODEL = "free-image";

function requirePrompt(message) {
    const prompt = String(message || "").trim();

    if (!prompt) {
        throw new AiServiceError("Prompt is required.", 400);
    }

    return prompt;
}

function getImageUrl(prompt) {
    const url = new URL(
        `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`
    );

    if (process.env.POLLINATIONS_API_KEY) {
        url.searchParams.set("key", process.env.POLLINATIONS_API_KEY);
    }

    return url.toString();
}

export async function generateImage({
    message
}) {
    const prompt = requirePrompt(message);
    const response = await fetch(getImageUrl(prompt));

    if (!response.ok) {
        throw new AiServiceError("Failed to generate image.", 502);
    }

    const mimeType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer()).toString("base64");

    return {
        provider: PROVIDER,
        model: MODEL,
        text: "Image generated successfully.",
        images: [
            {
                mimeType,
                dataUrl: `data:${mimeType};base64,${buffer}`
            }
        ]
    };
}

export function getImageModel() {
    return {
        provider: PROVIDER,
        model: MODEL,
        label: "Free Image",
        apiKeyEnvVar: "POLLINATIONS_API_KEY"
    };
}

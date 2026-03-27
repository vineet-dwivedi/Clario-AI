import { AiServiceError } from "./ai.service.js";

const PROVIDER = "pollinations";
const MODEL = process.env.POLLINATIONS_MODEL || "flux";

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

    url.searchParams.set("model", MODEL);

    return url.toString();
}

async function requestImage(prompt, useApiKey = true) {
    const headers = {};

    if (useApiKey && process.env.POLLINATIONS_API_KEY) {
        headers.Authorization = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
    }

    return fetch(getImageUrl(prompt), { headers });
}

export async function generateImage({
    message
}) {
    const prompt = requirePrompt(message);
    let response = await requestImage(prompt, true);

    if (
        !response.ok &&
        process.env.POLLINATIONS_API_KEY &&
        [ 400, 401, 403 ].includes(response.status)
    ) {
        response = await requestImage(prompt, false);
    }

    if (!response.ok) {
        let errorText = "";

        try {
            errorText = (await response.text()).trim();
        } catch {
            errorText = "";
        }

        throw new AiServiceError(
            errorText || `Image provider failed with status ${response.status}.`,
            502
        );
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
        label: "Pollinations Image",
        apiKeyEnvVar: "POLLINATIONS_API_KEY"
    };
}

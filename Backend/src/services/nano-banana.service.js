import { GoogleGenAI } from "@google/genai";
import { AiServiceError } from "./ai.service.js";

const PROVIDER = "google";
const MODEL_ID =
    process.env.NANO_BANANA_MODEL || "gemini-3.1-flash-image-preview";
const REQUEST_TIMEOUT_MS = 120000;
const MAX_INPUT_IMAGES = 5;
const DEFAULT_ASPECT_RATIO = "1:1";
const SUPPORTED_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp"
]);
const SUPPORTED_ASPECT_RATIOS = new Set([
    "1:1",
    "4:3",
    "3:4",
    "16:9",
    "9:16"
]);

const getApiKey = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new AiServiceError(
            "GEMINI_API_KEY is missing. Add GEMINI_API_KEY or GOOGLE_API_KEY to backend/.env.",
            500
        );
    }

    return apiKey;
};

const requirePrompt = (message) => {
    const trimmed = message?.trim();

    if (!trimmed) {
        throw new AiServiceError("Prompt is required.", 400);
    }

    return trimmed;
};

const withTimeout = (promise, createError, timeoutMs) => {
    let timeoutId;

    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(createError()), timeoutMs);
    });

    return Promise.race([ promise, timeout ]).finally(() => clearTimeout(timeoutId));
};

const normalizeMimeType = (mimeType) =>
    mimeType === "image/jpg" ? "image/jpeg" : mimeType;

const stripDataUrlPrefix = (value = "") =>
    String(value)
        .replace(/^data:[^;]+;base64,/i, "")
        .trim();

const normalizeAspectRatio = (aspectRatio) => {
    if (!aspectRatio?.trim()) {
        return DEFAULT_ASPECT_RATIO;
    }

    const normalizedAspectRatio = aspectRatio.trim();

    if (!SUPPORTED_ASPECT_RATIOS.has(normalizedAspectRatio)) {
        throw new AiServiceError(
            `Unsupported aspect ratio "${aspectRatio}". Choose one of: ${Array.from(SUPPORTED_ASPECT_RATIOS).join(", ")}.`,
            400
        );
    }

    return normalizedAspectRatio;
};

const normalizeImages = (images = []) => {
    if (!Array.isArray(images)) {
        throw new AiServiceError("Images must be an array.", 400);
    }

    if (images.length > MAX_INPUT_IMAGES) {
        throw new AiServiceError(
            `You can attach up to ${MAX_INPUT_IMAGES} reference images.`,
            400
        );
    }

    return images.map((image, index) => {
        const mimeType = normalizeMimeType(image?.mimeType?.trim());
        const data = stripDataUrlPrefix(image?.data || image?.dataUrl);

        if (!mimeType || !SUPPORTED_MIME_TYPES.has(mimeType)) {
            throw new AiServiceError(
                `Image ${index + 1} must be PNG, JPEG, or WebP.`,
                400
            );
        }

        if (!data) {
            throw new AiServiceError(`Image ${index + 1} is missing data.`, 400);
        }

        return { mimeType, data };
    });
};

const parseImageParts = (response) => {
    const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
    const contentParts = Array.isArray(candidates[0]?.content?.parts)
        ? candidates[0].content.parts
        : [];
    const text = contentParts
        .map((part) => part?.text?.trim() || "")
        .filter(Boolean)
        .join("\n\n")
        .trim();
    const images = contentParts
        .filter((part) => part?.inlineData?.data)
        .map((part) => {
            const mimeType = normalizeMimeType(part.inlineData.mimeType || "image/png");
            return {
                mimeType,
                dataUrl: `data:${mimeType};base64,${part.inlineData.data}`
            };
        });

    if (!images.length) {
        throw new AiServiceError(
            `Model "${MODEL_ID}" returned no image output.`,
            502
        );
    }

    return {
        text: text || "Generated with Nano Banana.",
        images
    };
};

export async function generateNanoBananaImage({
    message,
    images = [],
    aspectRatio
}) {
    const prompt = requirePrompt(message);
    const normalizedImages = normalizeImages(images);
    const normalizedAspectRatio = normalizeAspectRatio(aspectRatio);
    const client = new GoogleGenAI({ apiKey: getApiKey() });
    const contents = [
        { text: prompt },
        ...normalizedImages.map((image) => ({
            inlineData: {
                mimeType: image.mimeType,
                data: image.data
            }
        }))
    ];

    try {
        const response = await withTimeout(
            client.models.generateContent({
                model: MODEL_ID,
                contents,
                config: {
                    responseModalities: [ "TEXT", "IMAGE" ],
                    imageConfig: {
                        aspectRatio: normalizedAspectRatio
                    }
                }
            }),
            () =>
                new AiServiceError(
                    `Model "${MODEL_ID}" did not finish within ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
                    504
                ),
            REQUEST_TIMEOUT_MS
        );
        const parsedReply = parseImageParts(response);

        return {
            provider: PROVIDER,
            model: MODEL_ID,
            aspectRatio: normalizedAspectRatio,
            text: parsedReply.text,
            images: parsedReply.images
        };
    } catch (error) {
        if (error instanceof AiServiceError) {
            throw error;
        }

        if (error?.name === "AbortError") {
            throw new AiServiceError("Nano Banana request was aborted before completion.", 504);
        }

        throw new AiServiceError(
            error?.message || "Failed to generate image with Nano Banana.",
            502
        );
    }
}

export function getNanoBananaModel() {
    return {
        provider: PROVIDER,
        model: MODEL_ID,
        label: "Nano Banana",
        apiKeyEnvVar: "GEMINI_API_KEY"
    };
}

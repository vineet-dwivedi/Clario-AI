import { AiServiceError } from "./ai.service.js";

const VOICE_MODEL = process.env.CLOUDFLARE_TRANSCRIBE_MODEL || "@cf/openai/whisper";

function getCloudflareVoiceUrl() {
    const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();

    if (!accountId) {
        throw new AiServiceError("CLOUDFLARE_ACCOUNT_ID is missing.", 500);
    }

    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${VOICE_MODEL}`;
}

function getCloudflareHeaders(mimeType) {
    const apiToken = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();

    if (!apiToken) {
        throw new AiServiceError("CLOUDFLARE_API_TOKEN is missing.", 500);
    }

    return {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": mimeType || "application/octet-stream"
    };
}

function parseCloudflareMessage(payload, fallbackStatus) {
    const firstError = Array.isArray(payload?.errors) ? payload.errors[0] : null;
    return firstError?.message || payload?.message || `Voice transcription failed with status ${fallbackStatus}.`;
}

export async function transcribeAudio({ audioBuffer, mimeType }) {
    if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
        throw new AiServiceError("Audio is required.", 400);
    }

    const response = await fetch(getCloudflareVoiceUrl(), {
        method: "POST",
        headers: getCloudflareHeaders(mimeType),
        body: audioBuffer
    });

    let payload = null;

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok || payload?.success === false) {
        throw new AiServiceError(
            parseCloudflareMessage(payload, response.status),
            502
        );
    }

    const text = String(payload?.result?.text || "").trim();

    if (!text) {
        throw new AiServiceError("Voice transcription was empty. Please try again.", 502);
    }

    return {
        provider: "cloudflare",
        model: VOICE_MODEL,
        text
    };
}

export function getVoiceModel() {
    return {
        provider: "cloudflare",
        model: VOICE_MODEL,
        label: "Cloudflare Whisper",
        apiKeyEnvVar: "CLOUDFLARE_API_TOKEN"
    };
}

import * as pdfParseModule from "pdf-parse";
import { AiServiceError } from "./ai.service.js";

const pdfParse = pdfParseModule.default || pdfParseModule;

const MAX_DOCUMENT_TEXT_LENGTH = 18000;

function getFileName(file) {
    return String(file?.originalname || "attachment").trim() || "attachment";
}

function isImageFile(file) {
    return String(file?.mimetype || "").toLowerCase().startsWith("image/");
}

function isPdfFile(file) {
    return String(file?.mimetype || "").toLowerCase() === "application/pdf";
}

function toDataUrl(file) {
    const mimeType = String(file?.mimetype || "application/octet-stream");
    const base64 = Buffer.from(file.buffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
}

function cleanDocumentText(text) {
    return String(text || "")
        .replace(/\u0000/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function sliceDocumentText(text) {
    return text.slice(0, MAX_DOCUMENT_TEXT_LENGTH);
}

async function getPdfText(file) {
    const result = await pdfParse(file.buffer);
    const text = cleanDocumentText(result?.text);

    if (!text) {
        throw new AiServiceError(`"${getFileName(file)}" does not contain readable text.`, 400);
    }

    return text;
}

export async function prepareChatAttachments(files = []) {
    const images = [];
    const attachments = [];
    const documentSections = [];

    for (const file of files) {
        if (!file?.buffer?.length) {
            continue;
        }

        const name = getFileName(file);
        const mimeType = String(file.mimetype || "application/octet-stream");

        if (isImageFile(file)) {
            images.push({
                dataUrl: toDataUrl(file),
                mimeType,
                name
            });
            continue;
        }

        if (isPdfFile(file)) {
            const documentText = await getPdfText(file);

            attachments.push({
                name,
                mimeType
            });
            documentSections.push(`PDF: ${name}\n${sliceDocumentText(documentText)}`);
            continue;
        }

        throw new AiServiceError(`"${name}" is not supported. Use PDF files or images only.`, 400);
    }

    return {
        images,
        attachments,
        context: documentSections.join("\n\n")
    };
}

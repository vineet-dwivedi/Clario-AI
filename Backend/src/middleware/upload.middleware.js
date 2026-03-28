import multer from "multer";

const memoryStorage = multer.memoryStorage();

function createImageFileFilter(req, file, callback) {
    if (String(file.mimetype || "").startsWith("image/")) {
        return callback(null, true);
    }

    return callback(new Error("Only image files are allowed."));
}

function createChatFileFilter(req, file, callback) {
    const mimeType = String(file.mimetype || "").toLowerCase();

    if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
        return callback(null, true);
    }

    return callback(new Error("Only image files and PDF files are allowed."));
}

export const profileUpload = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 4 * 1024 * 1024
    },
    fileFilter: createImageFileFilter
});

export const chatUpload = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 12 * 1024 * 1024,
        files: 6
    },
    fileFilter: createChatFileFilter
});

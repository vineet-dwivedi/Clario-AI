const LOCAL_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
];

function normalizeOrigin(value) {
    return String(value || "").trim().replace(/\/+$/, "");
}

function parseOrigins(value) {
    return String(value || "")
        .split(",")
        .map(normalizeOrigin)
        .filter(Boolean);
}

export function getAllowedOrigins() {
    return [
        ...new Set([
            ...parseOrigins(process.env.FRONTEND_URL),
            ...parseOrigins(process.env.CLIENT_URL),
            ...parseOrigins(process.env.ALLOWED_ORIGINS),
            ...LOCAL_ORIGINS.map(normalizeOrigin)
        ])
    ];
}

export function isAllowedOrigin(origin) {
    if (!origin) {
        return true;
    }

    return getAllowedOrigins().includes(normalizeOrigin(origin));
}

export function createOriginValidator(label = "CORS") {
    return function validateOrigin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`${label} blocked for origin: ${origin}`));
    };
}

import { OAuth2Client } from "google-auth-library";

const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export function getGoogleAuthUrl() {
    const scopes = [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email"
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent"
    });

    return url;
}

export async function getGoogleUserInfo(code) {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const { data } = await oauth2Client.request({
            url: "https://www.googleapis.com/oauth2/v2/userinfo"
        });

        return {
            id: data.id,
            email: data.email,
            name: data.name,
            picture: data.picture
        };
    } catch (error) {
        console.error("Error getting Google user info:", error.message);
        throw error;
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLabcorpAccessToken = getLabcorpAccessToken;
exports.invalidateLabcorpToken = invalidateLabcorpToken;
const axios_1 = __importDefault(require("axios"));
let cachedToken = null;
let tokenExpiresAt = null; // epoch ms
// Refresh 5 minutes before actual expiry
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
async function getLabcorpAccessToken() {
    const now = Date.now();
    if (cachedToken &&
        tokenExpiresAt !== null &&
        now < tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS) {
        return cachedToken;
    }
    const oktaBaseUrl = process.env.OKTA_URL_PREFIX;
    const clientId = process.env.OKTA_CLIENT_ID;
    const clientSecret = process.env.OKTA_CLIENT_SECRET;
    if (!oktaBaseUrl || !clientId || !clientSecret) {
        throw new Error("Okta credentials are not fully configured. Please set OKTA_URL_PREFIX, OKTA_CLIENT_ID, and OKTA_CLIENT_SECRET.");
    }
    const tokenUrl = `${oktaBaseUrl.replace(/\/+$/, "")}/oauth2/default/v1/token`;
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("scope", "labcorp_scheduling");
    const response = await axios_1.default.post(tokenUrl, params.toString(), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000,
    });
    const data = response.data;
    cachedToken = data.access_token;
    tokenExpiresAt = now + data.expires_in * 1000;
    return cachedToken;
}
function invalidateLabcorpToken() {
    cachedToken = null;
    tokenExpiresAt = null;
}
//# sourceMappingURL=labcorpOktaTokenManager.js.map
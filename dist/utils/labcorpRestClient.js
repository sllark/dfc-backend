"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.labcorpRequest = labcorpRequest;
const axios_1 = __importDefault(require("axios"));
const labcorpOktaTokenManager_1 = require("./labcorpOktaTokenManager");
const labcorpBaseUrl = (process.env.LABCORP_SCHED_URL || "").replace(/\/+$/, "");
if (!labcorpBaseUrl) {
    // We rely on index.ts env validation to fail fast if this is missing
    console.warn("[Labcorp] LABCORP_SCHED_URL is not set. Labcorp REST calls will fail.");
}
async function labcorpRequest(method, path, config = {}) {
    if (!labcorpBaseUrl) {
        throw new Error("LABCORP_SCHED_URL is not configured.");
    }
    const url = `${labcorpBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const token = await (0, labcorpOktaTokenManager_1.getLabcorpAccessToken)();
    const headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
    };
    try {
        const response = await axios_1.default.request({
            ...config,
            method,
            url,
            headers,
        });
        return response;
    }
    catch (error) {
        const status = error?.response?.status;
        const endpoint = config.labcorpEndpoint || url;
        console.error(`[Labcorp] Error calling ${endpoint} - status: ${status || "unknown"}`, error?.response?.data || error.message);
        // If Labcorp says 401, invalidate cached token so next call forces refresh
        if (status === 401) {
            (0, labcorpOktaTokenManager_1.invalidateLabcorpToken)();
        }
        throw error;
    }
}
//# sourceMappingURL=labcorpRestClient.js.map
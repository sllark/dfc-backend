"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscription = createSubscription;
exports.deleteSubscription = deleteSubscription;
const labcorpRestClient_1 = require("../../utils/labcorpRestClient");
const labcorpEncryption_1 = require("../../utils/labcorpEncryption");
async function createSubscription(requestBody) {
    const encrypted = (0, labcorpEncryption_1.encryptLabcorpPayload)(requestBody);
    const res = await (0, labcorpRestClient_1.labcorpRequest)("POST", "/subscription", {
        labcorpEndpoint: "/subscription",
        data: encrypted,
    });
    const decrypted = (0, labcorpEncryption_1.decryptLabcorpPayload)(res.data);
    return decrypted;
}
async function deleteSubscription(id) {
    const path = `/subscription/${encodeURIComponent(id)}`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("DELETE", path, {
        labcorpEndpoint: "/subscription/{id}",
    });
    return res.data;
}
//# sourceMappingURL=subscriptionsService.js.map
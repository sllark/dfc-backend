"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppointmentTimes = getAppointmentTimes;
exports.bookAppointment = bookAppointment;
exports.getAppointmentByConfirmationNumber = getAppointmentByConfirmationNumber;
exports.updateAppointment = updateAppointment;
exports.cancelAppointment = cancelAppointment;
exports.getAppointmentTracking = getAppointmentTracking;
const labcorpRestClient_1 = require("../../utils/labcorpRestClient");
const labcorpEncryption_1 = require("../../utils/labcorpEncryption");
async function getAppointmentTimes(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
        }
    });
    const path = `/appointments/times?${query.toString()}`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("GET", path, {
        labcorpEndpoint: "/appointments/times",
    });
    return res.data;
}
async function bookAppointment(requestBody) {
    const encrypted = (0, labcorpEncryption_1.encryptLabcorpPayload)(requestBody);
    const res = await (0, labcorpRestClient_1.labcorpRequest)("POST", "/appointments", {
        labcorpEndpoint: "/appointments",
        data: encrypted,
    });
    const decrypted = (0, labcorpEncryption_1.decryptLabcorpPayload)(res.data);
    return decrypted;
}
async function getAppointmentByConfirmationNumber(confirmationNumber) {
    const path = `/appointments/${encodeURIComponent(confirmationNumber)}`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("GET", path, {
        labcorpEndpoint: "/appointments/{confirmationNumber}",
    });
    const decrypted = (0, labcorpEncryption_1.decryptLabcorpPayload)(res.data);
    return decrypted;
}
async function updateAppointment(confirmationNumber, requestBody) {
    const encrypted = (0, labcorpEncryption_1.encryptLabcorpPayload)(requestBody);
    const path = `/appointments/${encodeURIComponent(confirmationNumber)}`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("PUT", path, {
        labcorpEndpoint: "/appointments/{confirmationNumber}",
        data: encrypted,
    });
    const decrypted = (0, labcorpEncryption_1.decryptLabcorpPayload)(res.data);
    return decrypted;
}
async function cancelAppointment(confirmationNumber, requestBody) {
    const encrypted = (0, labcorpEncryption_1.encryptLabcorpPayload)(requestBody);
    const path = `/appointments/${encodeURIComponent(confirmationNumber)}/cancel`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("PUT", path, {
        labcorpEndpoint: "/appointments/{confirmationNumber}/cancel",
        data: encrypted,
    });
    return res.data;
}
async function getAppointmentTracking(id) {
    const path = `/appointments/tracking/${encodeURIComponent(id)}`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("GET", path, {
        labcorpEndpoint: "/appointments/tracking/{id}",
    });
    return res.data;
}
//# sourceMappingURL=appointmentsService.js.map
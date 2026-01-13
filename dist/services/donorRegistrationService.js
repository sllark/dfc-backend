"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.donorRegistrationService = void 0;
const prisma_1 = require("../generated/prisma");
const sendemail_1 = require("../utils/sendemail");
const encryption_1 = require("../utils/encryption");
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = __importDefault(require("xml2js"));
const prisma = new prisma_1.PrismaClient();
// Load environment variables
const LABCORP_URL = process.env.LABCORP_SOAP_URL;
const LABCORP_USER = process.env.LABCORP_USER_ID;
const LABCORP_PASS = process.env.LABCORP_PASSWORD;
if (!LABCORP_URL || !LABCORP_USER || !LABCORP_PASS) {
    throw new Error("Labcorp credentials are missing in environment variables");
}
// ================= Audit Log Helper =================
async function createAuditLog(userId, ip, action, model, recordId, details) {
    await prisma.auditLog.create({
        data: {
            userId,
            action,
            model,
            recordId,
            details: details ? JSON.stringify(details) : null,
        },
    });
}
exports.donorRegistrationService = {
    // ================= CREATE =================
    async create(data, ip) {
        if (!data.userId)
            throw new Error("userId is required");
        if (!data.createdBy)
            throw new Error("createdBy is required");
        if (!data.panelId)
            throw new Error("panelId is required");
        if (!data.registrationExpirationDate)
            throw new Error("registrationExpirationDate is required");
        const encryptedData = {
            userId: data.userId,
            donorNameFirst: (0, encryption_1.encrypt)(data.donorNameFirst),
            donorNameLast: (0, encryption_1.encrypt)(data.donorNameLast),
            donorSex: (0, encryption_1.encrypt)(data.donorSex ?? ""),
            donorDateOfBirth: data.donorDateOfBirth,
            donorEmail: (0, encryption_1.encrypt)(data.donorEmail),
            donorStateOfResidence: (0, encryption_1.encrypt)(data.donorStateOfResidence),
            donorSSN: data.donorSSN ? (0, encryption_1.encrypt)(data.donorSSN) : undefined,
            testingAuthority: data.donorSSN ? (0, encryption_1.encrypt)(data.donorSSN) : undefined,
            reasonForTest: data.reasonForTest ? (0, encryption_1.encrypt)(data.reasonForTest) : undefined,
            serviceId: data.serviceId ? (0, encryption_1.encryptDeterministic)(data.serviceId) : undefined,
            accountNo: data.accountNo ? (0, encryption_1.encryptDeterministic)(data.accountNo) : undefined,
            panelId: data.panelId,
            registrationExpirationDate: data.registrationExpirationDate,
            labcorpRegistrationNumber: data.labcorpRegistrationNumber || "",
            status: data.status || "PENDING",
            createdBy: data.createdBy,
            updatedBy: data.updatedBy || data.createdBy,
            createdByIP: ip,
            updatedByIP: ip,
            isDelete: false,
            splitSpecimenRequested: true,
            isActive: true,
        };
        const created = await prisma.donorRegistration.create({ data: encryptedData });
        await createAuditLog(data.createdBy, ip, "CREATE", "DonorRegistration", created.id, created);
        return created;
    },
    // ================= GET ALL =================
    async getAll({ page, perPage, search, status, currentUserId, role }) {
        const skip = (page - 1) * perPage;
        const andConditions = [];
        if (search) {
            andConditions.push({
                OR: [
                    { donorNameFirst: { contains: (0, encryption_1.encryptDeterministic)(search), mode: "insensitive" } },
                    { donorNameLast: { contains: (0, encryption_1.encryptDeterministic)(search), mode: "insensitive" } },
                    { donorSSN: { contains: (0, encryption_1.encryptDeterministic)(search) } },
                    { panelId: { contains: search } },
                    { labcorpRegistrationNumber: { contains: search } },
                    { accountNo: search ? (0, encryption_1.encryptDeterministic)(search) : undefined },
                    { serviceId: search ? (0, encryption_1.encryptDeterministic)(search) : undefined },
                ].filter(Boolean),
            });
        }
        if (status)
            andConditions.push({ status: status.toUpperCase() });
        if (role !== "ADMIN" && currentUserId)
            andConditions.push({ userId: currentUserId });
        const where = {
            isDelete: false,
            ...(andConditions.length > 0 ? { AND: andConditions } : {}),
        };
        const [donors, total] = await Promise.all([
            prisma.donorRegistration.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: perPage,
            }),
            prisma.donorRegistration.count({ where }),
        ]);
        const donorIds = donors.map(d => d.id);
        const payments = await prisma.payment.findMany({
            where: { donorRegistrationId: { in: donorIds }, status: "COMPLETED", isDelete: false },
            select: { donorRegistrationId: true },
        });
        const paymentMap = new Map(payments.map(p => [p.donorRegistrationId, true]));
        const decryptedDonors = donors.map(d => ({
            ...d,
            paymentStatus: paymentMap.has(d.id) ? "Paid" : "Unpaid",
            donorNameFirst: (0, encryption_1.decrypt)(d.donorNameFirst),
            donorNameLast: (0, encryption_1.decrypt)(d.donorNameLast),
            donorEmail: (0, encryption_1.decrypt)(d.donorEmail),
            donorStateOfResidence: (0, encryption_1.decrypt)(d.donorStateOfResidence),
            donorSSN: d.donorSSN ? (0, encryption_1.decrypt)(d.donorSSN) : null,
            reasonForTest: d.reasonForTest ? (0, encryption_1.decrypt)(d.reasonForTest) : null,
            serviceId: d.serviceId ? (0, encryption_1.decryptDeterministic)(d.serviceId) : null,
            accountNo: d.accountNo ? (0, encryption_1.decryptDeterministic)(d.accountNo) : null,
        }));
        return { data: decryptedDonors, total };
    },
    // ================= GET BY ID =================
    async getById(id, currentUserId, role) {
        const donor = await prisma.donorRegistration.findUnique({ where: { id } });
        if (!donor)
            return null;
        if (role !== "ADMIN" && donor.userId !== currentUserId)
            throw new Error("Unauthorized to access this registration");
        return {
            ...donor,
            donorNameFirst: (0, encryption_1.decrypt)(donor.donorNameFirst),
            donorNameLast: (0, encryption_1.decrypt)(donor.donorNameLast),
            donorEmail: (0, encryption_1.decrypt)(donor.donorEmail),
            donorStateOfResidence: (0, encryption_1.decrypt)(donor.donorStateOfResidence),
            donorSSN: donor.donorSSN ? (0, encryption_1.decrypt)(donor.donorSSN) : null,
            reasonForTest: donor.reasonForTest ? (0, encryption_1.decrypt)(donor.reasonForTest) : null,
            serviceId: donor.serviceId ? (0, encryption_1.decryptDeterministic)(donor.serviceId) : null,
            accountNo: donor.accountNo ? (0, encryption_1.decryptDeterministic)(donor.accountNo) : null,
        };
    },
    // ================= UPDATE =================
    async update(id, data, ip, updatedBy, role) {
        const existing = await prisma.donorRegistration.findUnique({ where: { id } });
        if (!existing)
            throw new Error("Registration not found");
        if (role !== "ADMIN" && existing.userId !== updatedBy)
            throw new Error("Unauthorized to update this registration");
        const encryptedData = {
            // required fields
            donorNameFirst: data.donorNameFirst ? (0, encryption_1.encrypt)(data.donorNameFirst) : existing.donorNameFirst,
            donorNameLast: data.donorNameLast ? (0, encryption_1.encrypt)(data.donorNameLast) : existing.donorNameLast,
            donorEmail: data.donorEmail ? (0, encryption_1.encrypt)(data.donorEmail) : existing.donorEmail,
            donorStateOfResidence: data.donorStateOfResidence
                ? (0, encryption_1.encrypt)(data.donorStateOfResidence)
                : existing.donorStateOfResidence,
            // optional/nullable fields
            donorSSN: data.donorSSN ? (0, encryption_1.encrypt)(data.donorSSN) : existing.donorSSN,
            reasonForTest: data.reasonForTest ? (0, encryption_1.encrypt)(data.reasonForTest) : existing.reasonForTest,
            serviceId: data.serviceId ? (0, encryption_1.encryptDeterministic)(data.serviceId) : existing.serviceId,
            accountNo: data.accountNo ? (0, encryption_1.encryptDeterministic)(data.accountNo) : existing.accountNo,
            panelId: data.panelId ?? existing.panelId,
            registrationExpirationDate: data.registrationExpirationDate ?? existing.registrationExpirationDate,
            labcorpRegistrationNumber: data.labcorpRegistrationNumber ?? existing.labcorpRegistrationNumber,
            updatedBy,
            updatedByIP: ip,
        };
        const updated = await prisma.donorRegistration.update({
            where: { id },
            data: encryptedData,
        });
        await createAuditLog(updatedBy, ip, "UPDATE", "DonorRegistration", id, data);
        return updated;
    },
    // ================= SOFT DELETE =================
    async softDelete(id, updatedBy, ip, role) {
        const existing = await prisma.donorRegistration.findUnique({ where: { id } });
        if (!existing)
            throw new Error("Registration not found");
        if (role !== "ADMIN" && existing.userId !== updatedBy)
            throw new Error("Unauthorized");
        const deleted = await prisma.donorRegistration.update({
            where: { id },
            data: { isDelete: true, updatedBy, updatedByIP: ip },
        });
        await createAuditLog(updatedBy, ip, "DELETE", "DonorRegistration", id, { isDelete: true });
        return deleted;
    },
    // ================= CONFIRM =================
    async confirmDirect(data) {
        try {
            const registrationData = {
                donorDateOfBirth: data.donorDateOfBirth ? new Date(data.donorDateOfBirth).toISOString().split('T')[0] + 'T00:00:00' : "1990-01-01T00:00:00",
                donorNameFirst: data.donorNameFirst,
                donorNameLast: data.donorNameLast,
                donorSex: data.donorSex,
                donorSSN: data.donorSSN || "",
                donorStateOfResidence: data.donorStateOfResidence,
                panelId: data.panelId,
                splitSpecimenRequested: 'false',
                accountNumber: data.accountNumber,
                testingAuthority: data.testingAuthority || "",
                registrationExpirationDate: new Date(data.registrationExpirationDate).toISOString().split('T')[0] + 'T00:00:00',
                donorReasonForTest: data.donorReasonForTest || "",
            };
            // Remove undefined/null/empty values
            Object.keys(registrationData).forEach(key => {
                if (registrationData[key] === undefined || registrationData[key] === null || registrationData[key] === '') {
                    delete registrationData[key];
                }
            });
            // Send to LabCorp
            const soapXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope 
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
    xmlns:ws="http://ws.ots.labcorp.com" 
    xmlns:data="http://data.ws.ots.labcorp.com">
    <soapenv:Header/>
    <soapenv:Body>
        <ws:registerDonor>
            <ws:userId>${this.escapeXml(LABCORP_USER)}</ws:userId>
            <ws:password>${this.escapeXml(LABCORP_PASS)}</ws:password>
            <ws:registration>
${Object.entries(registrationData)
                .map(([key, value]) => `                <data:${key}>${this.escapeXml(value)}</data:${key}>`)
                .join('\n')}
            </ws:registration>
        </ws:registerDonor>
    </soapenv:Body>
</soapenv:Envelope>`;
            const response = await axios_1.default.post(LABCORP_URL, soapXml, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'registerDonors'
                },
                timeout: 30000,
            });
            // Parse response
            const parser = new xml2js_1.default.Parser({
                explicitArray: false,
                ignoreAttrs: true,
                tagNameProcessors: [xml2js_1.default.processors.stripPrefix]
            });
            const result = await parser.parseStringPromise(response.data);
            // Handle SOAP fault
            if (result.Envelope?.Body?.Fault) {
                const fault = result.Envelope.Body.Fault;
                let detailedError = fault.faultstring;
                if (result.Envelope.Body.Fault.detail?.WsException?.errors) {
                    const errors = result.Envelope.Body.Fault.detail.WsException.errors;
                    detailedError = `Error: ${errors.errorDescription} (Element: ${errors.errorElement})`;
                }
                throw new Error(`LabCorp SOAP Fault: ${fault.faultcode} - ${detailedError}`);
            }
            const labcorpRegNo = result.Envelope?.Body?.registerDonorResponse?.registerDonorReturn?.labcorpRegistrationNumber;
            if (!labcorpRegNo) {
                throw new Error("No registration number received from LabCorp");
            }
            return {
                success: true,
                labcorpRegistrationNumber: labcorpRegNo
            };
        }
        catch (error) {
            throw new Error(`LabCorp confirmation failed: ${error.message}`);
        }
    },
    // ================= HELPER METHOD =================
    escapeXml(unsafe) {
        if (unsafe === null || unsafe === undefined) {
            return '';
        }
        const safe = String(unsafe);
        return safe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    },
    // ================= REJECT =================
    async reject(id, rejectReason, updatedBy, ip, role) {
        if (role !== "ADMIN")
            throw new Error("Unauthorized: Only admins can reject donor registrations");
        const donor = await prisma.donorRegistration.findUnique({ where: { id } });
        if (!donor)
            throw new Error("Donor not found");
        const updated = await prisma.donorRegistration.update({
            where: { id },
            data: { status: "REJECTED", rejectReason, updatedBy, updatedByIP: ip },
        });
        await createAuditLog(updatedBy, ip, "UPDATE", "DonorRegistration", id, {
            status: "REJECTED",
            rejectReason,
        });
        if (donor.donorEmail) {
            await (0, sendemail_1.sendMail)((0, encryption_1.decrypt)(donor.donorEmail), "Donor Registration Rejected", `Dear ${(0, encryption_1.decrypt)(donor.donorNameFirst)} ${(0, encryption_1.decrypt)(donor.donorNameLast)},\n\nYour donor registration has been REJECTED.\nReason: ${rejectReason}\n\nPlease review and resubmit.`);
        }
        return updated;
    },
};
//# sourceMappingURL=donorRegistrationService.js.map
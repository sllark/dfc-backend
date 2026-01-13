import { PrismaClient, Prisma } from "../generated/prisma";
import { sendMail } from "../utils/sendemail";
import {
    encrypt,
    decrypt,
    encryptDeterministic,
    decryptDeterministic,
} from "../utils/encryption";
import axios from 'axios';
import xml2js from 'xml2js';

const prisma = new PrismaClient();

// Load environment variables
const LABCORP_URL = process.env.LABCORP_SOAP_URL;
const LABCORP_USER = process.env.LABCORP_USER_ID;
const LABCORP_PASS = process.env.LABCORP_PASSWORD;
if (!LABCORP_URL || !LABCORP_USER || !LABCORP_PASS) { throw new Error("Labcorp credentials are missing in environment variables"); }

// ================= Audit Log Helper =================
async function createAuditLog(
    userId: number | null | undefined,
    ip: string | null | undefined,
    action: string,
    model: string,
    recordId?: number | null,
    details?: any
) {
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

interface GetAllParams {
    page: number;
    perPage: number;
    search?: string;
    status?: string;
    currentUserId?: number;
    role?: "ADMIN" | "USER" | "SUPERVISOR" | "MODERATOR";
}

export const donorRegistrationService = {
    // ================= CREATE =================
    async create(data: Prisma.DonorRegistrationUncheckedCreateInput, ip: string) {
        if (!data.userId) throw new Error("userId is required");
        if (!data.createdBy) throw new Error("createdBy is required");
        if (!data.panelId) throw new Error("panelId is required");
        if (!data.registrationExpirationDate)
            throw new Error("registrationExpirationDate is required");

        const encryptedData: Prisma.DonorRegistrationUncheckedCreateInput = {
            userId: data.userId,
            donorNameFirst: encrypt(data.donorNameFirst),
            donorNameLast: encrypt(data.donorNameLast),
            donorSex: encrypt(data.donorSex ?? ""),
            donorDateOfBirth: data.donorDateOfBirth,
            donorEmail: encrypt(data.donorEmail),
            donorStateOfResidence: encrypt(data.donorStateOfResidence),
            donorSSN: data.donorSSN ? encrypt(data.donorSSN) : undefined,
            testingAuthority: data.donorSSN ? encrypt(data.donorSSN) : undefined,
            reasonForTest: data.reasonForTest ? encrypt(data.reasonForTest) : undefined,
            serviceId: data.serviceId ? encryptDeterministic(data.serviceId) : undefined,
            accountNo: data.accountNo ? encryptDeterministic(data.accountNo) : undefined,
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
    async getAll({ page, perPage, search, status, currentUserId, role }: GetAllParams) {
        const skip = (page - 1) * perPage;
        const andConditions: Prisma.DonorRegistrationWhereInput[] = [];

        if (search) {
            andConditions.push({
                OR: [
                    { donorNameFirst: { contains: encryptDeterministic(search), mode: "insensitive" } },
                    { donorNameLast: { contains: encryptDeterministic(search), mode: "insensitive" } },
                    { donorSSN: { contains: encryptDeterministic(search) } },
                    { panelId: { contains: search } },
                    { labcorpRegistrationNumber: { contains: search } },
                    { accountNo: search ? encryptDeterministic(search) : undefined },
                    { serviceId: search ? encryptDeterministic(search) : undefined },
                ].filter(Boolean) as any[],
            });
        }

        if (status) andConditions.push({ status: status.toUpperCase() });
        if (role !== "ADMIN" && currentUserId) andConditions.push({ userId: currentUserId });

        const where: Prisma.DonorRegistrationWhereInput = {
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
            donorNameFirst: decrypt(d.donorNameFirst),
            donorNameLast: decrypt(d.donorNameLast),
            donorEmail: decrypt(d.donorEmail),
            donorStateOfResidence: decrypt(d.donorStateOfResidence),
            donorSSN: d.donorSSN ? decrypt(d.donorSSN) : null,
            reasonForTest: d.reasonForTest ? decrypt(d.reasonForTest) : null,
            serviceId: d.serviceId ? decryptDeterministic(d.serviceId) : null,
            accountNo: d.accountNo ? decryptDeterministic(d.accountNo) : null,
        }));

        return { data: decryptedDonors, total };
    },

    // ================= GET BY ID =================
    async getById(id: number, currentUserId?: number, role?: string) {
        const donor = await prisma.donorRegistration.findUnique({ where: { id } });
        if (!donor) return null;
        if (role !== "ADMIN" && donor.userId !== currentUserId)
            throw new Error("Unauthorized to access this registration");

        return {
            ...donor,
            donorNameFirst: decrypt(donor.donorNameFirst),
            donorNameLast: decrypt(donor.donorNameLast),
            donorEmail: decrypt(donor.donorEmail),
            donorStateOfResidence: decrypt(donor.donorStateOfResidence),
            donorSSN: donor.donorSSN ? decrypt(donor.donorSSN) : null,
            reasonForTest: donor.reasonForTest ? decrypt(donor.reasonForTest) : null,
            serviceId: donor.serviceId ? decryptDeterministic(donor.serviceId) : null,
            accountNo: donor.accountNo ? decryptDeterministic(donor.accountNo) : null,
        };
    },

    // ================= UPDATE =================
    async update(
        id: number,
        data: Prisma.DonorRegistrationUncheckedUpdateInput,
        ip: string,
        updatedBy: number,
        role?: string
    ) {
        const existing = await prisma.donorRegistration.findUnique({ where: { id } });
        if (!existing) throw new Error("Registration not found");
        if (role !== "ADMIN" && existing.userId !== updatedBy)
            throw new Error("Unauthorized to update this registration");

        const encryptedData: Prisma.DonorRegistrationUncheckedUpdateInput = {
            // required fields
            donorNameFirst: data.donorNameFirst ? encrypt(data.donorNameFirst as string) : existing.donorNameFirst,
            donorNameLast: data.donorNameLast ? encrypt(data.donorNameLast as string) : existing.donorNameLast,
            donorEmail: data.donorEmail ? encrypt(data.donorEmail as string) : existing.donorEmail,
            donorStateOfResidence: data.donorStateOfResidence
                ? encrypt(data.donorStateOfResidence as string)
                : existing.donorStateOfResidence,

            // optional/nullable fields
            donorSSN: data.donorSSN ? encrypt(data.donorSSN as string) : existing.donorSSN,
            reasonForTest: data.reasonForTest ? encrypt(data.reasonForTest as string) : existing.reasonForTest,
            serviceId: data.serviceId ? encryptDeterministic(data.serviceId as string) : existing.serviceId,
            accountNo: data.accountNo ? encryptDeterministic(data.accountNo as string) : existing.accountNo,

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
    async softDelete(
        id: number,
        updatedBy: number,
        ip: string,
        role?: "ADMIN" | "USER" | "SUPERVISOR" | "MODERATOR"
    ) {
        const existing = await prisma.donorRegistration.findUnique({ where: { id } });
        if (!existing) throw new Error("Registration not found");
        if (role !== "ADMIN" && existing.userId !== updatedBy) throw new Error("Unauthorized");

        const deleted = await prisma.donorRegistration.update({
            where: { id },
            data: { isDelete: true, updatedBy, updatedByIP: ip },
        });

        await createAuditLog(updatedBy, ip, "DELETE", "DonorRegistration", id, { isDelete: true });
        return deleted;
    },

    // ================= CONFIRM =================
    async confirmDirect(data: {
        donorNameFirst: string;
        donorNameLast: string;
        donorSex: string;
        donorDateOfBirth: string;
        donorSSN: string;
        donorStateOfResidence: string;
        panelId: string;
        accountNumber: string;
        testingAuthority: string;
        registrationExpirationDate: string;
        donorReasonForTest: string;
    }) {
        try {
            const registrationData: Record<string, any> = {
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

            const response = await axios.post(LABCORP_URL, soapXml, {
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'registerDonors'
                },
                timeout: 30000,
            });

            // Parse response
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true,
                tagNameProcessors: [xml2js.processors.stripPrefix]
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

        } catch (error: any) {
            throw new Error(`LabCorp confirmation failed: ${error.message}`);
        }
    },

    // ================= HELPER METHOD =================
    escapeXml(unsafe: any): string {
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
    async reject(
        id: number,
        rejectReason: string,
        updatedBy: number,
        ip: string,
        role?: "ADMIN" | "USER"
    ) {
        if (role !== "ADMIN") throw new Error("Unauthorized: Only admins can reject donor registrations");

        const donor = await prisma.donorRegistration.findUnique({ where: { id } });
        if (!donor) throw new Error("Donor not found");

        const updated = await prisma.donorRegistration.update({
            where: { id },
            data: { status: "REJECTED", rejectReason, updatedBy, updatedByIP: ip },
        });

        await createAuditLog(updatedBy, ip, "UPDATE", "DonorRegistration", id, {
            status: "REJECTED",
            rejectReason,
        });

        if (donor.donorEmail) {
            await sendMail(
                decrypt(donor.donorEmail),
                "Donor Registration Rejected",
                `Dear ${decrypt(donor.donorNameFirst)} ${decrypt(donor.donorNameLast)},\n\nYour donor registration has been REJECTED.\nReason: ${rejectReason}\n\nPlease review and resubmit.`
            );
        }

        return updated;
    },
};

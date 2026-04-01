import { cloudinary, cloudinaryFolder, isCloudinaryConfigured } from "../utils/cloudinaryClient";

export type UploadedPdf = {
    publicId: string;
    version: number;
    format: string;
    resourceType: string;
    type: string;
    bytes: number;
};

export async function uploadVeriportPdf(args: {
    reportId: string;
    revision: string | null;
    pdfBuffer: Buffer;
}): Promise<UploadedPdf> {
    if (!isCloudinaryConfigured) {
        throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.");
    }

    const safeRev = args.revision ? args.revision.replace(/[^a-zA-Z0-9_-]/g, "") : "latest";
    const publicId = `${cloudinaryFolder}/veriport/reports/${args.reportId}/${safeRev}`;

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                type: "authenticated",
                public_id: publicId,
                overwrite: true,
                format: "pdf",
            },
            (err, result) => {
                if (err) return reject(err);
                if (!result) return reject(new Error("Cloudinary upload returned no result"));
                resolve({
                    publicId: result.public_id,
                    version: Number(result.version),
                    format: String(result.format || "pdf"),
                    resourceType: String(result.resource_type || "raw"),
                    type: String(result.type || "authenticated"),
                    bytes: Number(result.bytes || args.pdfBuffer.length),
                });
            }
        );

        stream.end(args.pdfBuffer);
    });
}

export function getSignedVeriportPdfUrl(args: {
    publicId: string;
    version?: number | null;
    expiresInSeconds?: number;
}) {
    if (!isCloudinaryConfigured) {
        throw new Error("Cloudinary is not configured.");
    }

    const expiresIn = args.expiresInSeconds ?? 300; // 5 minutes
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    const url = cloudinary.utils.url(args.publicId, {
        resource_type: "raw",
        type: "authenticated",
        secure: true,
        sign_url: true,
        expires_at: expiresAt,
        ...(args.version ? { version: args.version } : {}),
    });

    return { url, expiresAt };
}


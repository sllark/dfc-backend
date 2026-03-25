import { Request, Response } from "express";
import { Prisma, Service } from "../generated/prisma";
import { serviceService } from "../services/serviceService";
import { uploadFile } from "../middlewares/uploadMiddleware";

function parseOptionalStringInput(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") return String(value);

    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
}

// Parses admin-panel fee inputs into `number | null` where:
// - `undefined` => not provided
// - `null` / `""` / `0` / invalid => quote-only => null
function parseOptionalFeeInput(value: unknown): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed || trimmed.toLowerCase() === "null") return null;
        const n = Number(trimmed);
        if (!Number.isFinite(n) || n <= 0) return null;
        return n;
    }

    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

function normalizeFeeForUi(raw: number | null | undefined): number | null {
    if (raw === undefined || raw === null) return null;
    if (raw === 0) return null;
    return raw;
}

function mapServiceForUi(service: Service) {
    // UI expects pricing + subtitle rendering.
    // Pricing rule:
    // - quote-only => ALL pricing fields are null
    // - otherwise:
    //   - `serviceFee` is always the "order now" price (derived from the first available of serviceFee/discounted/original)
    //   - `discountedServiceFee` / `originalServiceFee` are included only when provided separately
    const serviceFeeRaw = normalizeFeeForUi(service.serviceFee);
    const discountedRaw = normalizeFeeForUi(service.discountedServiceFee);
    const originalRaw = normalizeFeeForUi(service.originalServiceFee);

    const isQuoteOnly = serviceFeeRaw === null && discountedRaw === null && originalRaw === null;

    const serviceFeeForUi = isQuoteOnly ? null : (serviceFeeRaw ?? discountedRaw ?? originalRaw ?? null);
    const discountedServiceFeeForUi = isQuoteOnly ? null : discountedRaw;
    const originalServiceFeeForUi = isQuoteOnly ? null : originalRaw;

    const description = service.description ?? service.slug;

    return {
        ...service,
        // Pricing used by the card UI
        serviceFee: serviceFeeForUi,
        discountedServiceFee: discountedServiceFeeForUi,
        originalServiceFee: originalServiceFeeForUi,
        // Subtitle used by the card UI (falls back to slug if absent on the UI side)
        description,
        serviceDescription: description,
    };
}

export const serviceController = {
    // ✅ Create new service
    async create(req: Request, res: Response) {
        try {
            const {
                name,
                slug,
                accountNo,
                panelID,
                createdBy,
                status,
                serviceFee,
                discountedServiceFee,
                originalServiceFee,
                actualServiceFee,
                description,
                serviceDescription,
            } = req.body;

            // Validate required fields
            if (!name || !slug || !createdBy) {
                return res.status(400).json({ 
                    success: false,
                    message: "Name, slug, and createdBy are required" 
                });
            }

            // Handle banner image: either from file upload or URL from body
            let bannerImage: string | null = null;
            if (req.file) {
                // File uploaded via form-data - upload to Cloudinary or local
                bannerImage = await uploadFile(req.file);
            } else if (req.body.bannerImage) {
                // Image URL provided in JSON body
                bannerImage = req.body.bannerImage;
            }

            const parsedDescription = parseOptionalStringInput(description ?? serviceDescription);
            const parsedServiceFee = parseOptionalFeeInput(serviceFee);
            const parsedDiscountedServiceFee = parseOptionalFeeInput(discountedServiceFee);
            const parsedOriginalServiceFee = parseOptionalFeeInput(originalServiceFee ?? actualServiceFee);

            // Keep legacy compatibility: `serviceFee` is what older flows use for "Order Now"/checkout.
            // If `serviceFee` is not provided but discounted/original are, derive `serviceFee` from them.
            const serviceFeeToStore =
                parsedServiceFee !== undefined
                    ? parsedServiceFee
                    : parsedDiscountedServiceFee !== undefined
                        ? parsedDiscountedServiceFee
                        : parsedOriginalServiceFee !== undefined
                            ? parsedOriginalServiceFee
                            : null;

            const data: Prisma.ServiceUncheckedCreateInput = {
                name,
                slug,
                accountNo: accountNo ? accountNo : null,
                panelID: panelID ? panelID : null, // ✅ added encryption
                serviceFee: serviceFeeToStore,
                discountedServiceFee: parsedDiscountedServiceFee === undefined ? null : parsedDiscountedServiceFee,
                originalServiceFee: parsedOriginalServiceFee === undefined ? null : parsedOriginalServiceFee,
                description: parsedDescription === undefined ? null : parsedDescription,
                status: status !== undefined ? status === "true" || status === true : true,
                bannerImage,
                createdBy: Number(createdBy),
            };

            const service = await serviceService.create(data);
            res.status(201).json({ success: true, data: mapServiceForUi(service) });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ✅ Get all services
    async getAll(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const perPage = 10;
            const search = typeof req.query.search === "string" ? req.query.search : null;
            const status = typeof req.query.status === "string" ? req.query.status : null;

            const minFee = req.query.minFee ? Number(req.query.minFee) : null;
            const maxFee = req.query.maxFee ? Number(req.query.maxFee) : null;
            const sortBy = (req.query.sortBy as "createdAt" | "serviceFee") || "createdAt";
            const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

            const { data, total } = await serviceService.getAll({
                page,
                perPage,
                search,
                status,
                minFee,
                maxFee,
                sortBy,
                sortOrder,
            });

            const mappedData = data.map(mapServiceForUi);

            res.json({
                success: true,
                data: mappedData,
                meta: {
                    total,
                    current_page: page,
                    last_page: Math.ceil(total / perPage),
                },
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ✅ Get service by ID
    async getById(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const service = await serviceService.getById(id);

            if (!service) return res.status(404).json({ success: false, message: "Service not found" });

            res.json({ success: true, data: mapServiceForUi(service) });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ✅ Update service
    async update(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "Invalid service ID" });
            }

            const {
                name,
                slug,
                accountNo,
                panelID,
                updatedBy,
                status,
                serviceFee,
                discountedServiceFee,
                originalServiceFee,
                actualServiceFee,
                description,
                serviceDescription,
            } = req.body;

            // Handle banner image: either from file upload or URL from body
            let bannerImageUpdate: { bannerImage: string } | {} = {};
            if (req.file) {
                // File uploaded via form-data - upload to Cloudinary or local
                const uploadedUrl = await uploadFile(req.file);
                bannerImageUpdate = { bannerImage: uploadedUrl };
            } else if (req.body.bannerImage !== undefined) {
                // Image URL provided in JSON body (can be null to remove image)
                bannerImageUpdate = { bannerImage: req.body.bannerImage || null };
            }

            const hasServiceFee = Object.prototype.hasOwnProperty.call(req.body, "serviceFee");
            const hasDiscountedServiceFee = Object.prototype.hasOwnProperty.call(req.body, "discountedServiceFee");
            const hasOriginalServiceFee =
                Object.prototype.hasOwnProperty.call(req.body, "originalServiceFee") ||
                Object.prototype.hasOwnProperty.call(req.body, "actualServiceFee");

            const parsedDescription = parseOptionalStringInput(description ?? serviceDescription);
            const hasDescription =
                Object.prototype.hasOwnProperty.call(req.body, "description") ||
                Object.prototype.hasOwnProperty.call(req.body, "serviceDescription");

            const parsedServiceFee = parseOptionalFeeInput(serviceFee);
            const parsedDiscountedServiceFee = parseOptionalFeeInput(discountedServiceFee);
            const parsedOriginalServiceFee = parseOptionalFeeInput(originalServiceFee ?? actualServiceFee);

            const shouldUpdatePricing = hasServiceFee || hasDiscountedServiceFee || hasOriginalServiceFee;

            const serviceFeeToUpdate =
                parsedServiceFee !== undefined
                    ? parsedServiceFee
                    : parsedDiscountedServiceFee !== undefined
                        ? parsedDiscountedServiceFee
                        : parsedOriginalServiceFee !== undefined
                            ? parsedOriginalServiceFee
                            : null;

            const pricingUpdate: Prisma.ServiceUncheckedUpdateInput = {
                ...(shouldUpdatePricing && { serviceFee: serviceFeeToUpdate }),
                ...(hasDiscountedServiceFee && { discountedServiceFee: parsedDiscountedServiceFee === undefined ? null : parsedDiscountedServiceFee }),
                ...(hasOriginalServiceFee && { originalServiceFee: parsedOriginalServiceFee === undefined ? null : parsedOriginalServiceFee }),
            };

            const data: Prisma.ServiceUncheckedUpdateInput = {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(accountNo !== undefined && { accountNo: accountNo }),
                ...(panelID !== undefined && { panelID: panelID }), // ✅ added encryption
                ...(status !== undefined && { status: status === "true" || status === true }),
                ...(updatedBy !== undefined && { updatedBy: Number(updatedBy) }),
                ...(hasDescription && { description: parsedDescription === undefined ? null : parsedDescription }),
                ...pricingUpdate,
                ...bannerImageUpdate,
            };

            const updated = await serviceService.update(id, data);
            res.json({ success: true, data: mapServiceForUi(updated) });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ✅ Soft delete
    async delete(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "Invalid service ID" });
            }

            const { updatedBy } = req.body;
            if (!updatedBy) {
                return res.status(400).json({ success: false, message: "updatedBy is required" });
            }

            const deleted = await serviceService.softDelete(id, Number(updatedBy));
            res.json({ success: true, data: mapServiceForUi(deleted) });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
};

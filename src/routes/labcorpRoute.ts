import { Router, Request, Response } from "express";
import { locateCollectionSites } from "../utils/labcorpSoap";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
    const zip = req.query.zip as string;

    if (!zip) return res.status(400).json({ error: "ZIP code is required" });

    try {
        const sites = await locateCollectionSites(zip);
        res.status(200).json({ sites });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

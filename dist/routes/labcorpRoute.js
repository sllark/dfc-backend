"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const labcorpSoap_1 = require("../utils/labcorpSoap");
const router = (0, express_1.Router)();
router.get("/", async (req, res) => {
    const zip = req.query.zip;
    if (!zip)
        return res.status(400).json({ error: "ZIP code is required" });
    try {
        const sites = await (0, labcorpSoap_1.locateCollectionSites)(zip);
        res.status(200).json({ sites });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=labcorpRoute.js.map
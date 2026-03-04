"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.labcorpController = void 0;
const labcorpSoap_1 = require("../utils/labcorpSoap");
exports.labcorpController = {
    /**
     * Locate collection sites by zip code
     * POST /api/labcorp/locate-sites
     */
    async locateSites(req, res) {
        try {
            const { zip, distance } = req.body;
            // Validate zip code
            if (!zip || typeof zip !== 'string' || zip.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Zip code is required and must be a non-empty string'
                });
            }
            // Validate zip code format (basic validation - 5 digits)
            const zipRegex = /^\d{5}(-\d{4})?$/;
            if (!zipRegex.test(zip.trim())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid zip code format. Please provide a valid 5-digit zip code (e.g., 77077)'
                });
            }
            // Validate distance if provided
            const searchDistance = distance ? Number(distance) : 10;
            if (isNaN(searchDistance) || searchDistance < 1 || searchDistance > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Distance must be a number between 1 and 100 miles'
                });
            }
            // Call LabCorp SOAP service
            const sites = await (0, labcorpSoap_1.locateCollectionSites)(zip.trim(), searchDistance);
            // Log if no sites found (for debugging)
            if (sites.length === 0) {
                console.warn(`No collection sites found for zip: ${zip.trim()}, distance: ${searchDistance}`);
            }
            res.json({
                success: true,
                data: sites,
                count: sites.length,
                zip: zip.trim(),
                distance: searchDistance
            });
        }
        catch (error) {
            console.error('Error locating collection sites:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to locate collection sites'
            });
        }
    },
    /**
     * Handle selected location for order placement
     * POST /api/labcorp/select-location
     */
    async selectLocation(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            const { collectionSiteId, collectionSiteName, address1, address2, city, state, zip, distance, phoneNumber, donorRegistrationId, // Optional: link to a donor registration
             } = req.body;
            // Validate required fields
            if (!collectionSiteId) {
                return res.status(400).json({
                    success: false,
                    message: 'collectionSiteId is required'
                });
            }
            // Prepare location data for order placement
            const locationData = {
                collectionSiteId,
                collectionSiteName: collectionSiteName || null,
                address1: address1 || null,
                address2: address2 || null,
                city: city || null,
                state: state || null,
                zip: zip || null,
                distance: distance || null,
                phoneNumber: phoneNumber || null,
            };
            // TODO: Here you would integrate with your order placement logic
            // For now, we'll just return the location data
            // You can extend this to:
            // 1. Save the selected location to a database
            // 2. Associate it with a donor registration
            // 3. Use it in the order placement SOAP call
            res.json({
                success: true,
                message: 'Location selected successfully',
                data: locationData,
                donorRegistrationId: donorRegistrationId || null,
                note: 'This location will be used for order placement'
            });
        }
        catch (error) {
            console.error('Error selecting location:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to select location'
            });
        }
    },
};
//# sourceMappingURL=labcorpController.js.map
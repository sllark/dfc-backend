"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.labcorpRestController = void 0;
const appointmentsService_1 = require("../services/labcorp/appointmentsService");
const locationsService_1 = require("../services/labcorp/locationsService");
const subscriptionsService_1 = require("../services/labcorp/subscriptionsService");
const labcorpRestClient_1 = require("../utils/labcorpRestClient");
exports.labcorpRestController = {
    // ===== Health =====
    async health(req, res) {
        try {
            const response = await (0, labcorpRestClient_1.labcorpRequest)("GET", "/health", {
                labcorpEndpoint: "/health",
            });
            res.json({
                success: true,
                data: response.data,
            });
        }
        catch (error) {
            console.error("Error calling Labcorp health endpoint:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to reach Labcorp health endpoint",
            });
        }
    },
    // ===== Locations =====
    async getLocations(req, res) {
        try {
            const data = await (0, locationsService_1.getAllLocations)();
            res.json({ success: true, data });
        }
        catch (error) {
            console.error("Error fetching Labcorp locations:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch locations",
            });
        }
    },
    async searchLocations(req, res) {
        try {
            const { radius, serviceId, address, weekday, timeframe } = req.query;
            const data = await (0, locationsService_1.searchLocations)({
                radius: radius ? String(radius) : undefined,
                serviceId: serviceId ? String(serviceId) : undefined,
                address: address ? String(address) : undefined,
                weekday: weekday ? String(weekday) : undefined,
                timeframe: timeframe ? String(timeframe) : undefined,
            });
            res.json({ success: true, data });
        }
        catch (error) {
            console.error("Error searching Labcorp locations:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to search locations",
            });
        }
    },
    async getLocationById(req, res) {
        try {
            const { id } = req.params;
            const { _elements } = req.query;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Location id is required",
                });
            }
            const data = await (0, locationsService_1.getLocationById)(String(id), _elements ? String(_elements) : undefined);
            res.json({ success: true, data });
        }
        catch (error) {
            console.error("Error fetching Labcorp location by id:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch location",
            });
        }
    },
    async getInactiveLocations(req, res) {
        try {
            const { startDate, endDate, noOfDays } = req.query;
            const data = await (0, locationsService_1.getInactiveLocations)({
                startDate: startDate ? String(startDate) : undefined,
                endDate: endDate ? String(endDate) : undefined,
                noOfDays: noOfDays ? String(noOfDays) : undefined,
            });
            res.json({ success: true, data });
        }
        catch (error) {
            console.error("Error fetching Labcorp inactive locations:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch inactive locations",
            });
        }
    },
    // ===== Appointments =====
    async getAppointmentTimes(req, res) {
        try {
            const { locationId, serviceId, startDate, numberOfDays, weekday, timeframe, } = req.query;
            if (!locationId || !serviceId || !startDate) {
                return res.status(400).json({
                    success: false,
                    message: "locationId, serviceId, and startDate are required",
                });
            }
            const data = await (0, appointmentsService_1.getAppointmentTimes)({
                locationId: String(locationId),
                serviceId: String(serviceId),
                startDate: String(startDate),
                numberOfDays: numberOfDays ? String(numberOfDays) : undefined,
                weekday: weekday ? String(weekday) : undefined,
                timeframe: timeframe ? String(timeframe) : undefined,
            });
            res.json({ success: true, data });
        }
        catch (error) {
            console.error("Error fetching Labcorp appointment times:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch appointment times",
            });
        }
    },
    async bookAppointment(req, res) {
        try {
            const body = req.body;
            // Labcorp requires patient email; basic presence check here
            const email = body?.patient?.email || body?.email;
            if (!email || typeof email !== "string" || email.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Patient email is required for Labcorp appointment booking",
                });
            }
            const appointment = await (0, appointmentsService_1.bookAppointment)(body);
            res.status(201).json({
                success: true,
                data: appointment,
            });
        }
        catch (error) {
            console.error("Error booking Labcorp appointment:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to book appointment",
            });
        }
    },
    async getAppointmentByConfirmationNumber(req, res) {
        try {
            const { confirmationNumber } = req.params;
            if (!confirmationNumber) {
                return res.status(400).json({
                    success: false,
                    message: "confirmationNumber is required",
                });
            }
            const appointment = await (0, appointmentsService_1.getAppointmentByConfirmationNumber)(confirmationNumber);
            res.json({
                success: true,
                data: appointment,
            });
        }
        catch (error) {
            console.error("Error fetching Labcorp appointment by confirmation number:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch appointment",
            });
        }
    },
    async updateAppointment(req, res) {
        try {
            const { confirmationNumber } = req.params;
            const body = req.body;
            if (!confirmationNumber) {
                return res.status(400).json({
                    success: false,
                    message: "confirmationNumber is required",
                });
            }
            const appointment = await (0, appointmentsService_1.updateAppointment)(confirmationNumber, body);
            res.json({
                success: true,
                data: appointment,
            });
        }
        catch (error) {
            console.error("Error updating Labcorp appointment:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to update appointment",
            });
        }
    },
    async cancelAppointment(req, res) {
        try {
            const { confirmationNumber } = req.params;
            const body = req.body;
            if (!confirmationNumber) {
                return res.status(400).json({
                    success: false,
                    message: "confirmationNumber is required",
                });
            }
            const result = await (0, appointmentsService_1.cancelAppointment)(confirmationNumber, body);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error("Error cancelling Labcorp appointment:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to cancel appointment",
            });
        }
    },
    async getAppointmentTracking(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Tracking id is required",
                });
            }
            const tracking = await (0, appointmentsService_1.getAppointmentTracking)(id);
            res.json({
                success: true,
                data: tracking,
            });
        }
        catch (error) {
            console.error("Error fetching Labcorp appointment tracking:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to fetch appointment tracking",
            });
        }
    },
    // ===== Subscriptions =====
    async createSubscription(req, res) {
        try {
            const body = req.body;
            const subscription = await (0, subscriptionsService_1.createSubscription)(body);
            res.status(201).json({
                success: true,
                data: subscription,
            });
        }
        catch (error) {
            console.error("Error creating Labcorp subscription:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to create subscription",
            });
        }
    },
    async deleteSubscription(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Subscription id is required",
                });
            }
            const result = await (0, subscriptionsService_1.deleteSubscription)(id);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error("Error deleting Labcorp subscription:", error);
            res.status(500).json({
                success: false,
                message: error.message || "Failed to delete subscription",
            });
        }
    },
};
//# sourceMappingURL=labcorpRestController.js.map
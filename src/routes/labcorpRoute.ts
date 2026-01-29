import { Router, Request, Response } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import { labcorpController } from "../controllers/labcorpController";

const router = Router();

// Locate collection sites by zip code (requires authentication)
router.post("/locate-sites", AuthMiddleware.authenticate, labcorpController.locateSites);

// Select location for order placement (requires authentication)
router.post("/select-location", AuthMiddleware.authenticate, labcorpController.selectLocation);

// Debug endpoint to check if credentials are loaded and test connectivity
router.get("/debug", async (req: Request, res: Response) => {
    const soapUrl   = process.env.LABCORP_SOAP_URL;
    const userId    = process.env.LABCORP_USER_ID;
    const password  = process.env.LABCORP_PASSWORD;

    // Test DNS resolution
    let dnsStatus = "unknown";
    let connectivityStatus = "unknown";
    
    if (soapUrl) {
        try {
            const url = new URL(soapUrl);
            const dns = require('dns').promises;
            
            try {
                await dns.lookup(url.hostname);
                dnsStatus = "resolved";
            } catch (dnsError: any) {
                dnsStatus = `failed: ${dnsError.code || dnsError.message}`;
            }
        } catch (urlError) {
            dnsStatus = "invalid_url";
        }
        
        // Test basic connectivity (with timeout)
        try {
            const axios = require('axios');
            await axios.get(soapUrl, { 
                timeout: 5000,
                validateStatus: () => true // Accept any status code
            });
            connectivityStatus = "reachable";
        } catch (connectError: any) {
            if (connectError.code === 'ENOTFOUND') {
                connectivityStatus = "dns_failed";
            } else if (connectError.code === 'ECONNREFUSED') {
                connectivityStatus = "connection_refused";
            } else if (connectError.code === 'ETIMEDOUT') {
                connectivityStatus = "timeout";
            } else {
                connectivityStatus = `error: ${connectError.code || connectError.message}`;
            }
        }
    }

    res.json({
        hasUrl: !!soapUrl,
        hasUserId: !!userId,
        hasPassword: !!password,
        url: soapUrl || "NOT SET",
        userIdLength: userId?.length || 0,
        passwordLength: password?.length || 0,
        dnsStatus: dnsStatus,
        connectivityStatus: connectivityStatus,
        note: "Credentials are loaded. Check DNS and connectivity status above.",
        troubleshooting: dnsStatus !== "resolved" || connectivityStatus !== "reachable" ? {
            issue: "DNS or connectivity problem detected",
            steps: [
                "1. Verify your internet connection",
                "2. Check if the URL is correct: " + soapUrl,
                "3. Try pinging the hostname from your server",
                "4. Check firewall/proxy settings",
                "5. Check if the Labcorp service is available on this endpoint",
                "6. Contact Labcorp support to verify service availability"
            ]
        } : undefined
    });
});

export default router;

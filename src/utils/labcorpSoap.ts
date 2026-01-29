import axios from 'axios';
import { parseStringPromise, processors } from 'xml2js';

// Helper function to strip namespaces from XML
const stripNamespaces = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(stripNamespaces);
    }
    if (obj && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            const newKey = key.includes(':') ? key.split(':').pop()! : key;
            newObj[newKey] = stripNamespaces(obj[key]);
        }
        return newObj;
    }
    return obj;
};

// Helper function to normalize values
const normalize = (value: any): string | null => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) {
        return value.length > 0 ? normalize(value[0]) : null;
    }
    if (typeof value === 'object') {
        // Handle phone number objects
        if (value.areaCode && value.exchange && value.station) {
            return `${value.areaCode}${value.exchange}${value.station}`;
        }
        return null;
    }
    return String(value).trim() || null;
};

// Helper function to require environment variable
const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

/**
 * Locate collection sites by zip code
 * @param zip - Zip code to search for
 * @param distance - Distance in miles (default: 10)
 * @returns Array of collection sites
 */
export async function locateCollectionSites(zip: string, distance: number = 10) {
    const soapUrl = requireEnv('LABCORP_SOAP_URL');
    const userId = requireEnv('LABCORP_USER_ID');
    const password = requireEnv('LABCORP_PASSWORD');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
    xmlns:web="http://webservice.labcorp.com">
    <soapenv:Header/>
    <soapenv:Body>
        <web:locateCollectionSites>
            <userId>${escapeXml(userId)}</userId>
            <password>${escapeXml(password)}</password>
            <zip>${escapeXml(zip)}</zip>
            <distance>${distance}</distance>
        </web:locateCollectionSites>
    </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const { data } = await axios.post(soapUrl, xml, {
            headers: {
                'Content-Type': 'text/xml; charset=UTF-8',
                'SOAPAction': '',
            },
            timeout: 30000,
        });

        // Debug: Log raw response (enable for debugging)
        console.log('🔍 Raw XML Response (first 500 chars):', data.substring(0, 500));

        const parsed = await parseStringPromise(data, { 
            explicitArray: true,
            ignoreAttrs: true,
            tagNameProcessors: [processors.stripPrefix]
        });

        // Debug: Log parsed structure (enable for debugging)
        console.log('🔍 Parsed Response Structure:', JSON.stringify(parsed, null, 2));

        // Check for SOAP fault
        // With explicitArray: true, xml2js wraps elements in arrays
        const envelope = parsed?.Envelope;
        if (!envelope || !Array.isArray(envelope)) {
            console.error('No Envelope found in response:', JSON.stringify(parsed, null, 2));
            return [];
        }

        const envelopeObj = envelope[0];
        const body = envelopeObj?.Body;
        if (!body || !Array.isArray(body)) {
            console.error('No Body found in Envelope:', JSON.stringify(envelopeObj, null, 2));
            return [];
        }

        const bodyObj = body[0];
        
        // Check for fault
        if (bodyObj.Fault) {
            const fault = Array.isArray(bodyObj.Fault) ? bodyObj.Fault[0] : bodyObj.Fault;
            const faultString = fault.faultstring || fault.faultString || 'Unknown SOAP fault';
            const faultCode = fault.faultcode || fault.faultCode || 'SOAPFault';
            throw new Error(`Labcorp SOAP fault: ${faultCode} - ${faultString}`);
        }

        // Extract collection sites from response
        // The response structure: Envelope -> Body -> locateCollectionSitesResponse -> locateCollectionSitesReturn[]
        // Try multiple paths to handle different response structures
        let response = bodyObj.locateCollectionSitesResponse;
        
        // If not found, try alternative paths
        if (!response) {
            // Try without namespace stripping
            response = bodyObj['p558:locateCollectionSitesResponse'] || 
                      bodyObj['locateCollectionSitesResponse'];
        }
        
        if (!response) {
            console.error('No locateCollectionSitesResponse found in Body. Available keys:', Object.keys(bodyObj));
            console.error('Full Body structure:', JSON.stringify(bodyObj, null, 2));
            return [];
        }

        // With explicitArray: true, response is an array
        const responseObj = Array.isArray(response) ? response[0] : response;
        let sitesArray = responseObj?.locateCollectionSitesReturn || 
                        responseObj?.['p558:locateCollectionSitesReturn'] ||
                        responseObj?.['locateCollectionSitesReturn'];
        
        if (!sitesArray) {
            console.error('No locateCollectionSitesReturn found. Available keys:', Object.keys(responseObj || {}));
            console.error('Full response structure:', JSON.stringify(responseObj, null, 2));
            return [];
        }

        // Handle both single site and array of sites
        if (!Array.isArray(sitesArray)) {
            sitesArray = [sitesArray];
        }
        
        const sites = sitesArray;

        return sites.map((site: any) => {
            if (!site) return null;

            // Handle phone number - it can be an object or array
            const phone = site.phoneNumber;
            let phoneNumber = null;
            let phoneDetails = null;

            if (phone) {
                const phoneObj = Array.isArray(phone) ? phone[0] : phone;
                if (phoneObj && phoneObj.areaCode && phoneObj.exchange && phoneObj.station) {
                    phoneNumber = `${phoneObj.areaCode}${phoneObj.exchange}${phoneObj.station}`;
                    phoneDetails = {
                        areaCode: phoneObj.areaCode || null,
                        exchange: phoneObj.exchange || null,
                        station: phoneObj.station || null,
                        extension: phoneObj.extension || null,
                        countryCode: phoneObj.countryCode || null,
                    };
                }
            }

            return {
                collectionSiteId: site.collectionSiteId || null,
                collectionSiteName: site.collectionSiteName || null,
                address1: site.address1 || null,
                address2: site.address2 || null,
                city: site.city || null,
                state: site.state || null,
                zip: site.zip ? String(site.zip).trim() : null,
                distance: site.distance ? String(site.distance) : null,
                phoneNumber: phoneNumber,
                phone: phoneDetails,
            };
        }).filter((site: any) => site !== null);
    } catch (error: any) {
        if (error.response) {
            throw new Error(`Labcorp API error: ${error.response.status} - ${error.message}`);
        }
        throw error;
    }
}

// Helper function to escape XML special characters
function escapeXml(unsafe: any): string {
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
}

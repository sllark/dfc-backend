"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locateCollectionSites = locateCollectionSites;
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const requireEnv = (key) => {
    const value = process.env[key];
    if (!value)
        throw new Error(`Missing required environment variable: ${key}`);
    return value;
};
// Normalize any value to a trimmed string, including xml2js "_"-wrapped objects
const normalize = (value) => {
    if (Array.isArray(value)) {
        const first = value[0];
        if (typeof first === "string")
            return first.trim();
        if (typeof first === "object" && "_" in first)
            return first._.trim?.() ?? "";
    }
    if (typeof value === "string")
        return value.trim();
    return "";
};
// Strip XML namespace prefixes from keys
const stripNamespaces = (obj) => {
    if (Array.isArray(obj))
        return obj.map(stripNamespaces);
    if (typeof obj === "object" && obj !== null) {
        const newObj = {};
        for (const key in obj) {
            const cleanKey = key.includes(":") ? key.split(":")[1] : key;
            if (typeof cleanKey === "string") {
                newObj[cleanKey] = stripNamespaces(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};
async function locateCollectionSites(zip) {
    const soapUrl = requireEnv("LABCORP_SOAP_URL");
    const userId = requireEnv("LABCORP_USER_ID");
    const password = requireEnv("LABCORP_PASSWORD");
    const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.labcorp.com">
      <soapenv:Header/>
      <soapenv:Body>
        <web:locateCollectionSites>
          <userId>${userId}</userId>
          <password>${password}</password>
          <zip>${zip}</zip>
          <distance>10</distance>
        </web:locateCollectionSites>
      </soapenv:Body>
    </soapenv:Envelope>
  `;
    try {
        const { data } = await axios_1.default.post(soapUrl, xml, {
            headers: {
                "Content-Type": "text/xml;charset=UTF-8",
                SOAPAction: "",
            },
        });
        const parsed = await (0, xml2js_1.parseStringPromise)(data, { explicitArray: true });
        const clean = stripNamespaces(parsed);
        // console.log("🧾 Parsed SOAP Response:\n", JSON.stringify(clean, null, 2));
        const fault = clean?.Envelope?.Body?.[0]?.Fault?.[0];
        if (fault) {
            const faultString = normalize(fault.faultstring) || "Unknown SOAP fault";
            const faultCode = normalize(fault.faultcode) || "SOAPFault";
            throw new Error(`Labcorp SOAP fault: ${faultCode} - ${faultString}`);
        }
        const sitesNode = clean?.Envelope?.Body?.[0]?.locateCollectionSitesResponse?.[0]?.locateCollectionSitesReturn;
        const sites = Array.isArray(sitesNode)
            ? sitesNode
            : Array.isArray(sitesNode?.[0]?.collectionSite)
                ? sitesNode[0].collectionSite
                : Array.isArray(sitesNode?.collectionSite)
                    ? sitesNode.collectionSite
                    : null;
        if (!sites || sites.length === 0)
            return [];
        return sites.map((site) => ({
            id: normalize(site.collectionSiteId),
            name: normalize(site.collectionSiteName),
            address1: normalize(site.address1),
            address2: normalize(site.address2),
            city: normalize(site.city),
            state: normalize(site.state),
            zip: normalize(site.zip),
            distance: parseFloat(normalize(site.distance) || "0"),
            phone: {
                countryCode: normalize(site.phoneNumber?.[0]?.countryCode),
                areaCode: normalize(site.phoneNumber?.[0]?.areaCode),
                exchange: normalize(site.phoneNumber?.[0]?.exchange),
                station: normalize(site.phoneNumber?.[0]?.station),
                extension: normalize(site.phoneNumber?.[0]?.extension),
            },
        }));
    }
    catch (error) {
        console.error("❌ SOAP request failed:", {
            message: error.message,
            code: error.code,
            response: error.response?.data,
        });
        throw new Error(error?.message || "Failed to fetch Labcorp sites");
    }
}
//# sourceMappingURL=labcorpSoap.js.map
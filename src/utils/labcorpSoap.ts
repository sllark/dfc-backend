import axios from "axios";
import { parseStringPromise } from "xml2js";

// Normalize any value to a trimmed string, including xml2js "_"-wrapped objects
const normalize = (value: any): string => {
    if (Array.isArray(value)) {
        const first = value[0];
        if (typeof first === "string") return first.trim();
        if (typeof first === "object" && "_" in first) return first._.trim?.() ?? "";
    }
    if (typeof value === "string") return value.trim();
    return "";
};

// Strip XML namespace prefixes from keys
const stripNamespaces = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(stripNamespaces);
    if (typeof obj === "object" && obj !== null) {
        const newObj: Record<string, any> = {};
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

export async function locateCollectionSites(zip: string): Promise<any[]> {
    const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.labcorp.com">
      <soapenv:Header/>
      <soapenv:Body>
        <web:locateCollectionSites>
          <userId>${process.env.LABCORP_USER_ID}</userId>
          <password>${process.env.LABCORP_PASSWORD}</password>
          <zip>${zip}</zip>
          <distance>10</distance>
        </web:locateCollectionSites>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

    try {
        const { data } = await axios.post(process.env.LABCORP_SOAP_URL!, xml, {
            headers: {
                "Content-Type": "text/xml;charset=UTF-8",
                SOAPAction: "",
            },
        });

        const parsed = await parseStringPromise(data, { explicitArray: true });
        const clean = stripNamespaces(parsed);

        // console.log("🧾 Parsed SOAP Response:\n", JSON.stringify(clean, null, 2));

        const sites = clean?.Envelope?.Body?.[0]?.locateCollectionSitesResponse?.[0]?.locateCollectionSitesReturn;
        if (!sites || !Array.isArray(sites)) {
            console.warn("⚠️ No sites found in SOAP response");
            return [];
        }

        return sites.map((site: any) => ({
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
    } catch (error: any) {
        console.error("❌ SOAP request failed:", {
            message: error.message,
            code: error.code,
            response: error.response?.data,
        });
        throw new Error("Failed to fetch Labcorp sites");
    }
}


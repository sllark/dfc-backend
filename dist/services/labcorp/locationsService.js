"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllLocations = getAllLocations;
exports.searchLocations = searchLocations;
exports.getLocationById = getLocationById;
exports.getInactiveLocations = getInactiveLocations;
const labcorpRestClient_1 = require("../../utils/labcorpRestClient");
async function getAllLocations() {
    const res = await (0, labcorpRestClient_1.labcorpRequest)("GET", "/locations", {
        labcorpEndpoint: "/locations",
    });
    return res.data;
}
async function searchLocations(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
        }
    });
    const path = `/locations/search?${query.toString()}`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("GET", path, {
        labcorpEndpoint: "/locations/search",
    });
    return res.data;
}
async function getLocationById(id, elements) {
    const query = elements ? `?_elements=${encodeURIComponent(elements)}` : "";
    const path = `/locations/${encodeURIComponent(id)}${query}`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("GET", path, {
        labcorpEndpoint: "/locations/{id}",
    });
    return res.data;
}
async function getInactiveLocations(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.append(key, String(value));
        }
    });
    const path = `/locations/inactive?${query.toString()}`;
    const res = await (0, labcorpRestClient_1.labcorpRequest)("GET", path, {
        labcorpEndpoint: "/locations/inactive",
    });
    return res.data;
}
//# sourceMappingURL=locationsService.js.map
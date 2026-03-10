import { labcorpRequest } from "../../utils/labcorpRestClient";

export async function getAllLocations() {
  const res = await labcorpRequest("GET", "/locations", {
    labcorpEndpoint: "/locations",
  });
  return res.data;
}

export interface LocationSearchParams {
  radius?: string;
  serviceId?: string;
  address?: string;
  weekday?: string;
  timeframe?: string;
}

export async function searchLocations(params: LocationSearchParams) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const path = `/locations/search?${query.toString()}`;

  const res = await labcorpRequest("GET", path, {
    labcorpEndpoint: "/locations/search",
  });

  return res.data;
}

export async function getLocationById(id: string, elements?: string) {
  const query = elements ? `?_elements=${encodeURIComponent(elements)}` : "";
  const path = `/locations/${encodeURIComponent(id)}${query}`;

  const res = await labcorpRequest("GET", path, {
    labcorpEndpoint: "/locations/{id}",
  });

  return res.data;
}

export interface InactiveLocationsParams {
  startDate?: string;
  endDate?: string;
  noOfDays?: string;
}

export async function getInactiveLocations(params: InactiveLocationsParams) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const path = `/locations/inactive?${query.toString()}`;

  const res = await labcorpRequest("GET", path, {
    labcorpEndpoint: "/locations/inactive",
  });

  return res.data;
}


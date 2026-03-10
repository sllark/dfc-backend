import { labcorpRequest } from "../../utils/labcorpRestClient";
import {
  encryptLabcorpPayload,
  decryptLabcorpPayload,
} from "../../utils/labcorpEncryption";

export interface AppointmentTimesParams {
  locationId: string;
  serviceId: string;
  startDate: string;
  numberOfDays?: string;
  weekday?: string;
  timeframe?: string;
}

export async function getAppointmentTimes(params: AppointmentTimesParams) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const path = `/appointments/times?${query.toString()}`;

  const res = await labcorpRequest("GET", path, {
    labcorpEndpoint: "/appointments/times",
  });

  return res.data;
}

export async function bookAppointment(requestBody: any) {
  const encrypted = encryptLabcorpPayload(requestBody);

  const res = await labcorpRequest("POST", "/appointments", {
    labcorpEndpoint: "/appointments",
    data: encrypted,
  });

  const decrypted = decryptLabcorpPayload(res.data);
  return decrypted;
}

export async function getAppointmentByConfirmationNumber(confirmationNumber: string) {
  const path = `/appointments/${encodeURIComponent(confirmationNumber)}`;

  const res = await labcorpRequest("GET", path, {
    labcorpEndpoint: "/appointments/{confirmationNumber}",
  });

  const decrypted = decryptLabcorpPayload(res.data);
  return decrypted;
}

export async function updateAppointment(
  confirmationNumber: string,
  requestBody: any
) {
  const encrypted = encryptLabcorpPayload(requestBody);

  const path = `/appointments/${encodeURIComponent(confirmationNumber)}`;

  const res = await labcorpRequest("PUT", path, {
    labcorpEndpoint: "/appointments/{confirmationNumber}",
    data: encrypted,
  });

  const decrypted = decryptLabcorpPayload(res.data);
  return decrypted;
}

export async function cancelAppointment(
  confirmationNumber: string,
  requestBody: any
) {
  const encrypted = encryptLabcorpPayload(requestBody);

  const path = `/appointments/${encodeURIComponent(
    confirmationNumber
  )}/cancel`;

  const res = await labcorpRequest("PUT", path, {
    labcorpEndpoint: "/appointments/{confirmationNumber}/cancel",
    data: encrypted,
  });

  return res.data;
}

export async function getAppointmentTracking(id: string) {
  const path = `/appointments/tracking/${encodeURIComponent(id)}`;

  const res = await labcorpRequest("GET", path, {
    labcorpEndpoint: "/appointments/tracking/{id}",
  });

  return res.data;
}


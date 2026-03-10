import { labcorpRequest } from "../../utils/labcorpRestClient";
import {
  encryptLabcorpPayload,
  decryptLabcorpPayload,
} from "../../utils/labcorpEncryption";

export async function createSubscription(requestBody: any) {
  const encrypted = encryptLabcorpPayload(requestBody);

  const res = await labcorpRequest("POST", "/subscription", {
    labcorpEndpoint: "/subscription",
    data: encrypted,
  });

  const decrypted = decryptLabcorpPayload(res.data);
  return decrypted;
}

export async function deleteSubscription(id: string) {
  const path = `/subscription/${encodeURIComponent(id)}`;

  const res = await labcorpRequest("DELETE", path, {
    labcorpEndpoint: "/subscription/{id}",
  });

  return res.data;
}


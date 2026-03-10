import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getLabcorpAccessToken, invalidateLabcorpToken } from "./labcorpOktaTokenManager";

const labcorpBaseUrl = (process.env.LABCORP_SCHED_URL || "").replace(/\/+$/, "");

if (!labcorpBaseUrl) {
  // We rely on index.ts env validation to fail fast if this is missing
  console.warn("[Labcorp] LABCORP_SCHED_URL is not set. Labcorp REST calls will fail.");
}

export interface LabcorpRequestConfig extends AxiosRequestConfig {
  // Allow tagging which Labcorp endpoint we are calling for logs
  labcorpEndpoint?: string;
}

export async function labcorpRequest<T = any>(
  method: AxiosRequestConfig["method"],
  path: string,
  config: LabcorpRequestConfig = {}
): Promise<AxiosResponse<T>> {
  if (!labcorpBaseUrl) {
    throw new Error("LABCORP_SCHED_URL is not configured.");
  }

  const url = `${labcorpBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const token = await getLabcorpAccessToken();

  const headers = {
    ...(config.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await axios.request<T>({
      ...config,
      method,
      url,
      headers,
    });

    return response;
  } catch (error: any) {
    const status = error?.response?.status;
    const endpoint = config.labcorpEndpoint || url;

    console.error(
      `[Labcorp] Error calling ${endpoint} - status: ${status || "unknown"}`,
      error?.response?.data || error.message
    );

    // If Labcorp says 401, invalidate cached token so next call forces refresh
    if (status === 401) {
      invalidateLabcorpToken();
    }

    throw error;
  }
}


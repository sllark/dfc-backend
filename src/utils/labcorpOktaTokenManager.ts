import axios from "axios";

interface OktaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null; // epoch ms

// Refresh 5 minutes before actual expiry
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export async function getLabcorpAccessToken(): Promise<string> {
  const now = Date.now();

  if (
    cachedToken &&
    tokenExpiresAt !== null &&
    now < tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS
  ) {
    return cachedToken;
  }

  const oktaBaseUrl = process.env.OKTA_URL_PREFIX;
  const clientId = process.env.OKTA_CLIENT_ID;
  const clientSecret = process.env.OKTA_CLIENT_SECRET;

  if (!oktaBaseUrl || !clientId || !clientSecret) {
    throw new Error(
      "Okta credentials are not fully configured. Please set OKTA_URL_PREFIX, OKTA_CLIENT_ID, and OKTA_CLIENT_SECRET."
    );
  }

  const tokenUrl = `${oktaBaseUrl.replace(/\/+$/, "")}/oauth2/default/v1/token`;

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("scope", "labcorp_scheduling");

  const response = await axios.post<OktaTokenResponse>(tokenUrl, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });

  const data = response.data;

  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;

  return cachedToken;
}

export function invalidateLabcorpToken() {
  cachedToken = null;
  tokenExpiresAt = null;
}


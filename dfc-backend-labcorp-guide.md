# DFC Backend — Labcorp Scheduling API Integration Guide

> **Scope:** The backend is the single point of integration with Labcorp. It handles authentication, encryption/decryption, token lifecycle management, and exposes clean REST endpoints to the frontend and admin panel.
> **Stack assumption:** Node.js / Express (or equivalent). Adapt to your stack.
> **Critical:** All Labcorp API calls, Okta tokens, and the encryption key live here — never exposed to clients.

---

## Table of Contents

1. [Backend's Role in the Architecture](#1-backends-role-in-the-architecture)
2. [Credentials You Need (from Labcorp Staging Email)](#2-credentials-you-need-from-labcorp-staging-email)
3. [Okta Authentication — Token Lifecycle Management](#3-okta-authentication--token-lifecycle-management)
4. [Payload Encryption & Decryption](#4-payload-encryption--decryption)
5. [API Proxy Layer — All Labcorp Endpoints](#5-api-proxy-layer--all-labcorp-endpoints)
6. [Subscription / Webhook Handling](#6-subscription--webhook-handling)
7. [FHIR vs REST — Which to Implement](#7-fhir-vs-rest--which-to-implement)
8. [Full Data Flow Example — Booking an Appointment](#8-full-data-flow-example--booking-an-appointment)
9. [Environment Variables](#9-environment-variables)
10. [Error Handling & Logging](#10-error-handling--logging)
11. [Recommended Folder Structure](#11-recommended-folder-structure)
12. [Staging vs Production Checklist](#12-staging-vs-production-checklist)

---

## 1. Backend's Role in the Architecture

```
DFC Frontend  ──────►  DFC Backend  ──────►  Labcorp API
DFC Admin     ──────►  DFC Backend           (staging / prod)
                           │
                     Okta Token Cache
                     AES-256-GCM Encrypt/Decrypt
                     Webhook Receiver (subscription callbacks)
```

The backend:
- Holds all secrets (Okta credentials, encryption key, Labcorp base URL)
- Manages the Okta token lifecycle — parses expiry, reuses token, refreshes before it expires
- Encrypts outbound payloads and decrypts inbound responses
- Proxies all Labcorp endpoints to frontend/admin as clean, unauthenticated internal routes
- Receives Labcorp's webhook callbacks for appointment status changes

---

## 2. Credentials You Need (from Labcorp Staging Email)

Labcorp will email these separately. Store them as environment variables **only**:

| Credential | Env Var Name | Description |
|------------|-------------|-------------|
| Okta Client ID | `OKTA_CLIENT_ID` | Used to request access tokens |
| Okta Client Secret | `OKTA_CLIENT_SECRET` | Paired with client ID |
| Okta Domain | `OKTA_URL_PREFIX` | e.g. `https://your-org.okta.com` |
| Payload Password | `LABCORP_PAYLOAD_PASSWORD` | Base64-encoded AES-256 key for encryption |
| Scheduling Base URL | `LABCORP_SCHED_URL` | e.g. `https://api-staging.labcorp.com` |

---

## 3. Okta Authentication — Token Lifecycle Management

### Getting a Token

```
POST {{OKTA_URL_PREFIX}}/oauth2/default/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={{OKTA_CLIENT_ID}}
&client_secret={{OKTA_CLIENT_SECRET}}
&scope=labcorp_scheduling
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 43200
}
```

### ⚠️ Critical Token Rules (from Labcorp email)

1. **Tokens have a lifetime (currently ~12 hours / 43200 seconds)**
2. **Parse the expiry from the token response** — do NOT hardcode 12 hours
3. **Reuse the same token** for its entire lifetime across all requests
4. **Implement a sliding/dynamic refresh** — when the token is near expiry (e.g. within 5 minutes), proactively fetch a new one
5. **Never hardcode the lifetime** — Labcorp may change it as their security policies evolve

### Recommended Token Manager Implementation

```javascript
// services/oktaTokenManager.js

let cachedToken = null;
let tokenExpiresAt = null;

async function getToken() {
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry

  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt - bufferMs) {
    return cachedToken; // reuse existing token
  }

  // Fetch a new token
  const response = await fetch(
    `${process.env.OKTA_URL_PREFIX}/oauth2/default/v1/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.OKTA_CLIENT_ID,
        client_secret: process.env.OKTA_CLIENT_SECRET,
        scope: 'labcorp_scheduling',
      }),
    }
  );

  const data = await response.json();

  // Parse lifetime dynamically from response — never hardcode
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000; // convert seconds to ms

  return cachedToken;
}

module.exports = { getToken };
```

**Use in every Labcorp API call:**
```javascript
const token = await getToken();
const res = await fetch(`${process.env.LABCORP_SCHED_URL}/appointments/times?...`, {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

## 4. Payload Encryption & Decryption

All appointment, cancel, and subscription payloads must be AES-256-GCM encrypted. Location/service/time queries do **not** need encryption.

### Endpoints that require encryption

| Operation | Endpoint | Direction |
|-----------|----------|-----------|
| Book appointment | POST /appointments | Encrypt request + Decrypt response |
| Modify appointment | PUT /appointments/{id} | Encrypt request + Decrypt response |
| Cancel appointment | PUT /appointments/{id}/cancel | Encrypt request |
| Subscribe | POST /subscription | Encrypt request + Decrypt response |
| FHIR book | POST /fhir/appointments | Encrypt request + Decrypt response |
| FHIR patients | POST/PUT/GET /fhir/patients | Encrypt request + Decrypt response |

### Encrypt Function (Node.js)

```javascript
// services/encryption.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // 12 bytes for GCM
const TAG_LENGTH = 16; // 16 bytes auth tag

function encryptPayload(plaintextObject) {
  const key = Buffer.from(process.env.LABCORP_PAYLOAD_PASSWORD, 'base64');
  const iv = crypto.randomBytes(IV_LENGTH);
  const plaintext = Buffer.from(JSON.stringify(plaintextObject), 'utf8');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16-byte auth tag

  // Final payload = iv (12 bytes) + ciphertext + tag (16 bytes), base64-encoded
  const payload = Buffer.concat([iv, ciphertext, tag]);
  return { value: payload.toString('base64') };
}

function decryptPayload(encryptedResponse) {
  const key = Buffer.from(process.env.LABCORP_PAYLOAD_PASSWORD, 'base64');
  const payload = Buffer.from(encryptedResponse.value, 'base64');

  const iv = payload.slice(0, IV_LENGTH);
  const tag = payload.slice(payload.length - TAG_LENGTH);
  const ciphertext = payload.slice(IV_LENGTH, payload.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(plaintext.toString('utf8'));
}

module.exports = { encryptPayload, decryptPayload };
```

---

## 5. API Proxy Layer — All Labcorp Endpoints

The backend exposes these routes internally. Each route gets the Okta token, calls Labcorp, and returns clean data.

### Status

```
GET  /api/health
  → GET {LABCORP_SCHED_URL}/health
  → No auth required
  → Returns: { version, message }
```

### Locations

```
GET  /api/locations
  → GET {LABCORP_SCHED_URL}/locations
  → Auth: Bearer token
  → Returns: Full location list (2000+ locations, large payload — cache this)

GET  /api/locations/search?radius=&serviceId=&address=&weekday=&timeframe=
  → GET {LABCORP_SCHED_URL}/locations/search
  → Auth: Bearer token
  → Pass all query params through

GET  /api/locations/:id?_elements=
  → GET {LABCORP_SCHED_URL}/locations/{id}
  → Auth: Bearer token

GET  /api/locations/inactive?startDate=&endDate=&noOfDays=
  → GET {LABCORP_SCHED_URL}/locations/inactive
  → Auth: Bearer token (used by admin sync jobs)
```

### Services

```
GET  /api/services?locationId=
  → GET {LABCORP_SCHED_URL}/services
  → Auth: Bearer token
```

### Appointments

```
GET  /api/appointments/times?locationId=&serviceId=&startDate=&numberOfDays=&weekday=&timeframe=
  → GET {LABCORP_SCHED_URL}/appointments/times
  → Auth: Bearer token
  → No encryption needed

POST /api/appointments
  → POST {LABCORP_SCHED_URL}/appointments
  → Auth: Bearer token
  → Encrypt request body before sending
  → Decrypt response before returning
  → Returns: { confirmationNumber, qrCode, confirmationUrl, ... }

GET  /api/appointments/:confirmationNumber
  → GET {LABCORP_SCHED_URL}/appointments/{confirmationNumber}
  → Auth: Bearer token
  → Decrypt response

PUT  /api/appointments/:confirmationNumber
  → PUT {LABCORP_SCHED_URL}/appointments/{confirmationNumber}
  → Auth: Bearer token
  → Encrypt request, decrypt response

PUT  /api/appointments/:confirmationNumber/cancel
  → PUT {LABCORP_SCHED_URL}/appointments/{confirmationNumber}/cancel
  → Auth: Bearer token
  → Encrypt request body { firstName, lastName, trackingId? }

GET  /api/appointments/tracking/:id
  → GET {LABCORP_SCHED_URL}/appointments/tracking/{id}
  → Auth: Bearer token
  → No encryption needed
  → Returns: { status: "Pending"|"Scheduled"|"Cancelled", confirmationNumber }
```

### Subscriptions (Webhooks)

```
POST /api/subscription
  → POST {LABCORP_SCHED_URL}/subscription
  → Auth: Bearer token
  → Encrypt request body (appointmentId + callback endpoint)
  → Decrypt response (returns subscriptionId)

DELETE /api/subscription/:id
  → DELETE {LABCORP_SCHED_URL}/subscription/{id}
  → Auth: Bearer token
```

---

## 6. Subscription / Webhook Handling

Labcorp sends a POST to your callback URL whenever an appointment status changes (checked in, modified, cancelled by clinic, etc.).

### Register a Subscription

When booking an appointment, optionally register a webhook:

```javascript
const subscriptionPayload = {
  id: appointmentConfirmationNumber,
  type: "appointment",
  channel: {
    type: "rest-hook",
    endpoint: "https://your-backend.com/webhooks/labcorp/appointment",
    header: [
      "Authorization: Bearer your-internal-webhook-secret"
    ]
  }
};
// Encrypt and POST to /subscription
```

### Receive Webhook Callbacks

```javascript
// routes/webhooks.js

router.post('/webhooks/labcorp/appointment', async (req, res) => {
  // Verify your internal auth header first
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Decrypt the incoming encrypted appointment object
  const decryptedAppointment = decryptPayload(req.body);

  // Update your database with the new appointment status
  await db.appointments.update({
    confirmationNumber: decryptedAppointment.confirmationNumber,
    status: decryptedAppointment.status,
    updatedAt: new Date(),
  });

  // Optionally: push real-time update to frontend via WebSocket or SSE

  return res.status(200).json({ received: true });
});
```

---

## 7. FHIR vs REST — Which to Implement

The API offers two parallel styles. For DFC, use the **REST (non-FHIR) API** unless your client has a specific FHIR requirement.

| Factor | REST | FHIR |
|--------|------|------|
| Complexity | Lower | Higher (FHIR resource structures) |
| Patient records | Embedded in appointment | Separate patient CRUD (`/fhir/patients`) |
| Labcorp Postman examples | Both provided | Both provided |
| Recommended for DFC | ✅ Yes | Only if required |

If you do need FHIR in the future, the same token and encryption approach applies — only the endpoint paths and payload schemas differ.

---

## 8. Full Data Flow Example — Booking an Appointment

```
1. Frontend sends POST /api/appointments with plain JSON patient + appointment data

2. Backend:
   a. Calls getToken() — returns cached token or fetches new one
   b. Calls encryptPayload(requestBody) → { value: "base64string..." }
   c. Sends POST to {LABCORP_SCHED_URL}/appointments
      with Authorization: Bearer {token}
      and body: { value: "base64string..." }

3. Labcorp returns 201 with encrypted response body { value: "..." }

4. Backend:
   a. Calls decryptPayload(response.body) → plain appointment object
   b. Extracts: confirmationNumber, qrCode, confirmationUrl
   c. Saves appointment record to your own database
   d. Returns plain JSON to frontend

5. Frontend displays confirmation screen with QR code
```

---

## 9. Environment Variables

```env
# Okta
OKTA_CLIENT_ID=your_okta_client_id
OKTA_CLIENT_SECRET=your_okta_client_secret
OKTA_URL_PREFIX=https://your-org.okta.com

# Labcorp
LABCORP_SCHED_URL=https://api-staging.labcorp.com   # swap for prod
LABCORP_PAYLOAD_PASSWORD=base64encodedkeyhere==

# Internal webhook auth
WEBHOOK_SECRET=your_random_internal_secret

# App
PORT=4000
NODE_ENV=staging
```

---

## 10. Error Handling & Logging

Map Labcorp HTTP errors to meaningful backend responses:

```javascript
function handleLabcorpError(status, labcorpBody, endpoint) {
  console.error(`[Labcorp] ${endpoint} returned ${status}`, labcorpBody);

  switch (status) {
    case 400:
      return { status: 400, message: 'Invalid request data', details: labcorpBody };
    case 401:
      // Token may have expired despite cache — force refresh
      invalidateToken();
      return { status: 401, message: 'Authentication failed — retrying' };
    case 404:
      return { status: 404, message: 'Record not found' };
    case 409:
      return { status: 409, message: 'Appointment time no longer available' };
    case 502:
      return { status: 502, message: 'Labcorp service temporarily unavailable' };
    default:
      return { status: 500, message: 'Unexpected error from Labcorp' };
  }
}
```

Always log: endpoint called, HTTP status received, timestamp, and whether encryption was involved.

---

## 11. Recommended Folder Structure

```
src/
├── services/
│   ├── labcorp/
│   │   ├── oktaTokenManager.js    # Token fetch, cache, refresh logic
│   │   ├── encryption.js          # encryptPayload, decryptPayload
│   │   ├── locations.js           # Labcorp location API calls
│   │   ├── appointments.js        # Labcorp appointment API calls
│   │   ├── services.js            # Labcorp services list
│   │   ├── subscriptions.js       # Webhook subscription management
│   │   └── labcorpClient.js       # Base HTTP client with auth header
│
├── routes/
│   ├── locations.js               # /api/locations/*
│   ├── appointments.js            # /api/appointments/*
│   ├── services.js                # /api/services
│   └── webhooks.js                # /webhooks/labcorp/appointment
│
├── db/
│   └── appointments.js            # Your own appointment records
│
└── config/
    └── env.js                     # Validate all required env vars on startup
```

---

## 12. Staging vs Production Checklist

Before going live, Labcorp requires staging validation. From their email:

- [ ] Token lifetime is **never hardcoded** — parsed dynamically from response
- [ ] Token is **reused** across multiple requests within its lifetime
- [ ] Token is **refreshed** proactively before expiry
- [ ] Token lifecycle has been tested **over multiple days** in staging
- [ ] All appointment payloads are properly encrypted and decryptable
- [ ] Patient **email field is always sent** (now required)
- [ ] Webhook callback endpoint is live and responding with `200`
- [ ] Subscriptions are cleaned up (DELETE) when appointments are cancelled
- [ ] Error responses from Labcorp are handled gracefully
- [ ] Support contact confirmed: schedulingAPIOnboard@labcorp.com
  - Partner name: Cynergy Wellness
  - Always include: environment (staging/prod), payload, error details, API type (FHIR/REST)

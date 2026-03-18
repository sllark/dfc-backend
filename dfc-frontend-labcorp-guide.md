# DFC Frontend — Labcorp Scheduling API Integration Guide

> **Scope:** Everything the patient-facing frontend needs to know.
> **Stack assumption:** React (Cursor project). Adapt hooks/calls to your framework as needed.
> **API Style to use:** REST (non-FHIR) endpoints — simpler, no FHIR overhead needed for UI flows.

---

## Table of Contents

1. [What the Frontend Is Responsible For](#1-what-the-frontend-is-responsible-for)
2. [What the Frontend Is NOT Responsible For](#2-what-the-frontend-is-not-responsible-for)
3. [Authentication — Okta Token](#3-authentication--okta-token)
4. [Encryption — Critical Requirement](#4-encryption--critical-requirement)
5. [Step-by-Step User Flow & API Calls](#5-step-by-step-user-flow--api-calls)
6. [All Relevant Endpoints](#6-all-relevant-endpoints)
7. [Required Form Fields](#7-required-form-fields)
8. [Error Handling by Endpoint](#8-error-handling-by-endpoint)
9. [Environment Variables for Cursor](#9-environment-variables-for-cursor)
10. [Recommended Folder Structure](#10-recommended-folder-structure)

---

## 1. What the Frontend Is Responsible For

The frontend handles the **complete patient appointment booking journey**:

- Searching for Labcorp locations near the patient
- Showing available appointment time slots
- Collecting patient details (name, DOB, address, **email — now required**, phone)
- Submitting the appointment booking
- Showing confirmation with QR code and confirmation URL
- Allowing patients to view, modify, or cancel their appointment
- Showing real-time appointment status updates (via subscription webhook — display only)

---

## 2. What the Frontend Is NOT Responsible For

- **Never call Labcorp APIs directly from the browser.** All API calls go through the DFC Backend.
- **Never handle Okta tokens or the encryption key** (`payloadPassword`) in frontend code — these live in the backend only.
- **Never store patient PII in localStorage or sessionStorage.**
- The frontend only talks to your own DFC Backend API, which then calls Labcorp.

```
Patient Browser  →  DFC Backend  →  Labcorp API
```

---

## 3. Authentication — Okta Token

The frontend does **not** manage Okta tokens. The DFC Backend handles Okta authentication and passes responses back. However, the frontend should:

- Handle `401 Unauthorized` responses from your backend gracefully (show re-login or session expired)
- Never store or display the token

---

## 4. Encryption — Critical Requirement

All appointment-related payloads (create, modify, cancel) are **AES-256-GCM encrypted**. This is handled 100% in the backend. From the frontend's perspective:

- You send plain JSON to your DFC Backend
- The backend encrypts it and forwards to Labcorp
- The backend decrypts the response and sends plain JSON back to you

You do **not** need to implement any encryption in the frontend.

---

## 5. Step-by-Step User Flow & API Calls

### Step 1 — Location Search

**User action:** Patient enters their address/zip and selects a service.

**Call your backend:** `GET /api/locations/search`

**Params to send from UI:**
```
address: "123 Main St Raleigh NC 27615"   (or lat/lng)
radius: 25                                 (miles, let user adjust)
serviceId: 5                               (from service dropdown — see services list)
weekday: "SATURDAY"                        (optional filter)
timeframe: "MORNING"                       (optional filter: MORNING / MIDDAY / EVENING)
```

**Display in UI:**
- Location name, address, phone number
- Distance from patient (`distanceFromStartingPoint` in miles)
- Hours of operation per service

---

### Step 2 — Select Service

**User action:** Patient picks what they're coming in for.

**Call your backend:** `GET /api/services` (optionally filtered by `locationId` after Step 1)

**Display in UI:** Dropdown or card list of service names.

**Service IDs reference (from Labcorp PSC doc):**

| ID | Service |
|----|---------|
| 5  | Labwork |
| 6  | Employment Drug Testing - Urine |
| 17 | Employee Wellness with Body Measurement |
| 21 | Covid-19 Unexposed/Symptom Free |
| 3  | Pediatric |
| 10 | Glucose Tolerance |

---

### Step 3 — Show Available Time Slots

**User action:** Patient picks a date range to see open slots.

**Call your backend:** `GET /api/appointments/times`

**Params:**
```
locationId: 951357         (from Step 1 selection)
serviceId: 5               (from Step 2 selection)
startDate: "2026-03-10"    (YYYY-MM-DD)
numberOfDays: 7            (1–90, default 7)
weekday: ["MONDAY","TUESDAY"]   (optional)
timeframe: ["MORNING","MIDDAY"] (optional)
```

**Response shape:**
```json
[
  { "datetime": "2026-03-10T08:00" },
  { "datetime": "2026-03-10T08:15" },
  { "datetime": "2026-03-10T09:00" }
]
```

**Display in UI:** Calendar or time-slot grid. Let patient tap/click a slot.

---

### Step 4 — Collect Patient Information

**Required fields (all must be validated before submit):**

```
firstName        string   required
lastName         string   required
gender           enum     required  — "M", "F", or "U"
dateOfBirth      string   required  — format: YYYY-MM-DD
email            string   required  — ⚠️ NOW REQUIRED (per Labcorp email)
phone            string   optional  — 10 digits, no dashes
address.line1    string   required
address.city     string   required
address.state    string   required
address.zip      string   required
```

> ⚠️ **Important:** Labcorp updated their requirements — **email is now mandatory**. The patient will receive a confirmation email when the appointment is booked, and a cancellation email if it's cancelled.

---

### Step 5 — Book the Appointment

**User action:** Patient reviews details and taps "Confirm Appointment."

**Call your backend:** `POST /api/appointments`

**Body to send (plain JSON — backend will encrypt):**
```json
{
  "locationId": 951357,
  "serviceId": 5,
  "appointmentTime": "2026-03-10T09:00",
  "patient": {
    "firstName": "Jane",
    "lastName": "Doe",
    "gender": "F",
    "dateOfBirth": "1990-05-15",
    "email": "jane.doe@email.com",
    "phone": "9195551234",
    "address": {
      "line1": "123 Main St",
      "city": "Raleigh",
      "state": "NC",
      "zip": "27615"
    }
  },
  "billingResponsibility": "PATIENT"
}
```

**On success (201):** Backend returns appointment object including:
- `confirmationNumber` — Save this, patient needs it
- `qrCode` — Base64 PNG image, display it for check-in
- `confirmationUrl` — Labcorp's own confirmation link

**Display in UI:** Confirmation screen with confirmation number, QR code, and appointment details.

---

### Step 6 — View Existing Appointment

**Call your backend:** `GET /api/appointments/{confirmationNumber}`

Display: appointment date/time, location, service, patient name, QR code.

---

### Step 7 — Modify Appointment

**User action:** Patient wants to change their time slot.

**Call your backend:** `PUT /api/appointments/{confirmationNumber}`

Send the full appointment object with updated `appointmentTime`. Same fields as booking.

**Error to handle:** `409 Conflict` — the new time is no longer available. Show a message and let them pick again.

---

### Step 8 — Cancel Appointment

**User action:** Patient taps "Cancel Appointment."

**Call your backend:** `PUT /api/appointments/{confirmationNumber}/cancel`

**Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**On success (204):** Show cancellation confirmation. Patient will receive cancellation email.

---

### Step 9 — Track Appointment Status (Optional)

If you used a `trackingId` when booking, you can poll status:

**Call your backend:** `GET /api/appointments/tracking/{trackingId}`

**Response statuses:** `Pending`, `Scheduled`, `Cancelled`

---

## 6. All Relevant Endpoints

These are the **backend routes your frontend calls** (your DFC Backend proxies these to Labcorp):

| Method | Your Backend Route | Purpose |
|--------|-------------------|---------|
| GET | `/api/locations/search` | Search locations near patient |
| GET | `/api/locations/{id}` | Get single location details |
| GET | `/api/services` | List available services |
| GET | `/api/appointments/times` | Get available time slots |
| POST | `/api/appointments` | Book appointment |
| GET | `/api/appointments/{confirmationNumber}` | View appointment |
| PUT | `/api/appointments/{confirmationNumber}` | Modify appointment |
| PUT | `/api/appointments/{confirmationNumber}/cancel` | Cancel appointment |
| GET | `/api/appointments/tracking/{id}` | Check tracking status |

---

## 7. Required Form Fields

### Location Search Form
```
[ Address / Zip Code input ]     required
[ Service dropdown ]              required
[ Radius selector: 5/10/25/50mi ] required, default 25
[ Day of week filter ]            optional, multi-select
[ Time of day filter ]            optional (Morning/Midday/Evening)
```

### Patient Info Form
```
[ First Name ]       required
[ Last Name ]        required
[ Email ]            required  ← NEW REQUIREMENT
[ Phone ]            optional (10 digits)
[ Date of Birth ]    required  date picker, format YYYY-MM-DD
[ Gender ]           required  M / F / U
[ Address Line 1 ]   required
[ City ]             required
[ State ]            required  dropdown
[ Zip Code ]         required
```

---

## 8. Error Handling by Endpoint

| HTTP Code | Meaning | UI Action |
|-----------|---------|-----------|
| 400 | Bad input (missing fields, invalid date) | Show field-level validation errors |
| 401 | Unauthorized | Show "Session expired, please login again" |
| 404 | Appointment/location not found | Show "Not found" message |
| 409 | Time slot no longer available | Show "This slot was just taken — please pick another time" |
| 502 | Labcorp internal error | Show "Service temporarily unavailable, try again shortly" |

---

## 9. Environment Variables for Cursor

Add to your `.env.local` (frontend):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000   # Your DFC backend URL
# Never put Labcorp URLs, Okta secrets, or encryption keys here
```

---

## 10. Recommended Folder Structure

```
src/
├── services/
│   └── labcorp/
│       ├── locations.ts       # location search & details calls
│       ├── appointments.ts    # book, view, modify, cancel
│       ├── services.ts        # get service list
│       └── types.ts           # TypeScript interfaces for all models
├── components/
│   ├── LocationSearch/
│   ├── TimeSlotPicker/
│   ├── PatientForm/
│   ├── AppointmentConfirmation/
│   └── AppointmentCard/
├── hooks/
│   ├── useLocationSearch.ts
│   ├── useAppointmentTimes.ts
│   └── useAppointment.ts
└── pages/ (or app/)
    ├── schedule/
    │   ├── index.tsx          # Step 1–3: search + time selection
    │   ├── patient.tsx        # Step 4: patient form
    │   └── confirm.tsx        # Step 5: review + submit
    └── appointments/
        └── [confirmationNumber].tsx   # View/modify/cancel
```

---

## Key Reminders

- ✅ Email is now **required** — do not make it optional in your form
- ✅ Always display the **QR code** from the confirmation response — patients use it to check in
- ✅ Show the **confirmation number** prominently and offer copy/share functionality
- ✅ Time slots are formatted `YYYY-MM-DDTHH:MM` (e.g. `2026-03-10T09:00`) — no timezone in the slot string itself, but location timezone is available in location data
- ✅ Appointments can only be booked within **90 days** from today
- ✅ Never call Labcorp APIs directly from the browser

# DFC Admin Panel — Labcorp Scheduling API Integration Guide

> **Scope:** Everything the internal admin panel needs to manage Labcorp locations, appointments, and system health.
> **Who uses this:** Operations staff, customer support agents, internal admins at Cynergy Wellness.
> **API Style:** Mix of REST endpoints (no FHIR needed for admin tasks).
> **Key difference from frontend:** Admin can access bulk data, inactive locations, and all appointments — not just one patient's view.

---

## Table of Contents

1. [What the Admin Panel Is Responsible For](#1-what-the-admin-panel-is-responsible-for)
2. [What the Admin Panel Is NOT Responsible For](#2-what-the-admin-panel-is-not-responsible-for)
3. [Admin vs Frontend — Key Differences](#3-admin-vs-frontend--key-differences)
4. [Feature Modules & Matching API Endpoints](#4-feature-modules--matching-api-endpoints)
5. [Location Management Module](#5-location-management-module)
6. [Appointment Management Module](#6-appointment-management-module)
7. [Services Reference Module](#7-services-reference-module)
8. [Subscription Management Module](#8-subscription-management-module)
9. [System Health Module](#9-system-health-module)
10. [Data Sync / Background Jobs](#10-data-sync--background-jobs)
11. [Admin API Routes (Backend)](#11-admin-api-routes-backend)
12. [Environment Variables](#12-environment-variables)
13. [Recommended Folder Structure](#13-recommended-folder-structure)
14. [Admin UI Pages Reference](#14-admin-ui-pages-reference)

---

## 1. What the Admin Panel Is Responsible For

The admin panel gives Cynergy Wellness staff operational visibility and control:

- **Browse all Labcorp locations** — filter, search, view details and hours
- **Monitor inactive/deactivated locations** — know which locations have closed recently
- **Look up any appointment** by confirmation number — for support queries
- **Cancel appointments** on behalf of patients (support use case)
- **View and manage webhook subscriptions** — see which appointments are being tracked
- **Service reference table** — view all 24 Labcorp service types
- **System health dashboard** — confirm Labcorp API connectivity
- **Sync/refresh location data** — trigger manual data refreshes

---

## 2. What the Admin Panel Is NOT Responsible For

- Admin does **not** handle Okta tokens or encryption directly — this is the backend's job
- Admin does **not** store or expose `payloadPassword` or `clientSecret`
- Admin should **not** allow bulk appointment creation (that's a frontend + patient flow)
- Admin does **not** directly call Labcorp — always goes through DFC Backend

```
Admin Panel  →  DFC Backend (admin routes)  →  Labcorp API
```

---

## 3. Admin vs Frontend — Key Differences

| Concern | Frontend (Patient) | Admin Panel |
|---------|-------------------|-------------|
| Scope | One patient's appointments | All appointments across all patients |
| Locations | Search by area | Full location list + inactive list |
| Booking | Patient books themselves | Admin can cancel on behalf |
| Data volume | Single records | Bulk/paginated lists |
| Auth | Patient session | Admin role-based auth |
| Refresh | Real-time user actions | Scheduled background sync jobs |

---

## 4. Feature Modules & Matching API Endpoints

| Admin Module | Labcorp Endpoints Used |
|-------------|----------------------|
| Location Browser | `GET /locations`, `GET /locations/{id}`, `GET /locations/search` |
| Inactive Location Monitor | `GET /locations/inactive` |
| Appointment Lookup | `GET /appointments/{confirmationNumber}` |
| Appointment Cancel | `PUT /appointments/{confirmationNumber}/cancel` |
| Appointment Status Tracker | `GET /appointments/tracking/{id}` |
| Services Reference | `GET /services` |
| Subscription Manager | `POST /subscription`, `DELETE /subscription/{id}` |
| System Health | `GET /health` |
| FHIR Location Sync | `GET /fhir/locations`, `GET /fhir/locations/inactive` |

---

## 5. Location Management Module

### 5a. Full Location List (Bulk)

**When to use:** Initial load, nightly sync job, or when admin wants to download/refresh all locations.

**Backend call:**
```
GET /api/admin/locations
→ GET {LABCORP_SCHED_URL}/locations
```

**Important:** This returns **2,000+ locations** as a large JSON array (gzip-compressed from Labcorp). The backend should:
- Cache this response (Redis or in-memory) and refresh on a schedule (e.g. nightly)
- Not call this on every admin page load
- Return paginated data to the admin panel

**Display in Admin UI:**
```
Table columns:
  ID | Name | Address | City | State | Zip | Phone | Services | Hours
```

**Admin actions per row:**
- "View Details" → full location info including all service hours
- "Filter by service" → filter table by serviceId
- "Filter by state" → filter by state

---

### 5b. Location Search

**When to use:** Admin wants to find a specific location by address or area.

**Backend call:**
```
GET /api/admin/locations/search?address=&radius=&serviceId=
→ GET {LABCORP_SCHED_URL}/locations/search
```

**Required params:** `address` (or lat/lng), `radius`, `serviceId`

**Optional filters:** `weekday`, `timeframe`

**Display:** Same table as above, sorted by distance (`distanceFromStartingPoint`).

---

### 5c. Single Location Details

**When to use:** Admin clicks on a location to see full details.

**Backend call:**
```
GET /api/admin/locations/:id
→ GET {LABCORP_SCHED_URL}/locations/{id}
```

**Optional:** Use `?_elements=id,name,address,services` to fetch only specific fields.

**Display in admin detail panel:**
```
Name:           Labcorp - Raleigh
ID:             13733
Address:        6601 Six Forks Rd, Raleigh, NC 27615
Phone:          (919) 555-0100
Timezone:       America/New_York (UTC -04:00)
Opens At:       08:00 AM
Closes At:      05:00 PM
Lunch:          12:00 PM – 01:00 PM

Services Offered:
  - Labwork (ID: 5)        Mon–Fri  08:00–17:00
  - Drug Testing (ID: 6)   Mon–Sat  08:00–14:00
```

---

### 5d. Inactive Locations Monitor

**When to use:** Daily admin check — "which Labcorp locations closed in the last week?"

**Backend call:**
```
GET /api/admin/locations/inactive?noOfDays=7
→ GET {LABCORP_SCHED_URL}/locations/inactive
```

**Params:**
```
noOfDays: 1–90 (default 7)         — how many days back to look
startDate: YYYY-MM-DD (optional)   — date range start (max 90 days ago)
endDate:   YYYY-MM-DD (optional)   — date range end
```

**Display in Admin UI:**
```
⚠️ Inactive Location Alert Banner
Table: ID | Name | Address | Deactivated Date
```

**Why this matters for admin:** If patients have upcoming appointments at an inactive location, support staff need to know so they can proactively reach out.

---

## 6. Appointment Management Module

### 6a. Appointment Lookup by Confirmation Number

**When to use:** Support agent gets a call from a patient — "I need help with my appointment."

**Backend call:**
```
GET /api/admin/appointments/:confirmationNumber
→ GET {LABCORP_SCHED_URL}/appointments/{confirmationNumber}
→ Backend decrypts response before returning to admin
```

**Display:**
```
Confirmation #:    LBG-12345678
Patient:           Jane Doe (DOB: 1990-05-15)
Location:          Labcorp Raleigh - 6601 Six Forks Rd
Service:           Labwork (ID: 5)
Appointment Time:  March 15, 2026 at 9:00 AM
Email:             jane.doe@email.com
Phone:             9195551234
Billing:           PATIENT
QR Code:           [image]
Status:            Scheduled
```

---

### 6b. Cancel Appointment on Behalf of Patient

**When to use:** Patient calls support and cannot cancel through the app, or there's a system issue.

**Backend call:**
```
PUT /api/admin/appointments/:confirmationNumber/cancel
→ PUT {LABCORP_SCHED_URL}/appointments/{confirmationNumber}/cancel
→ Encrypt request body before sending
```

**Request body to backend:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**On success (204):** Show "Appointment cancelled successfully. Patient will receive a cancellation email if their email was on file."

**Important:** Cancellation is **permanent** — confirm with admin before executing. Add a confirmation dialog.

---

### 6c. Appointment Tracking Status

**When to use:** Check the current status of an appointment that used a `trackingId`.

**Backend call:**
```
GET /api/admin/appointments/tracking/:trackingId
→ GET {LABCORP_SCHED_URL}/appointments/tracking/{id}
```

**Response statuses:**
```
Pending    — Booking was started but not confirmed
Scheduled  — Appointment is active
Cancelled  — Appointment was cancelled
```

---

## 7. Services Reference Module

### Full Services List

**When to use:** Admin reference page — "what serviceIds are available?"

**Backend call:**
```
GET /api/admin/services
→ GET {LABCORP_SCHED_URL}/services
```

**Optional:** Filter by location — `?locationId=13733`

**Full services reference (from Labcorp PSC doc):**

| Service ID | Service Name |
|------------|-------------|
| 1 | Breath Alcohol |
| 2 | Saliva Alcohol |
| 3 | Pediatric |
| 4 | Hair Analysis |
| 5 | Labwork |
| 6 | Employment Drug Testing - Urine |
| 7 | Paternity |
| 8 | Fingerprinting |
| 9 | H. Pylori Breath Test |
| 10 | Glucose Tolerance |
| 11 | Lactose Tolerance |
| 12 | Other |
| 13 | Specimen Drop Off |
| 14 | Standing Order |
| 15 | Semen Analysis |
| 16 | AlloMap® (Heart Transplant Patient Management) |
| 17 | Employee Wellness with Body Measurement |
| 18 | Genetic Results Consult |
| 19 | Covance Clinical Trial |
| 20 | Horizon |
| 21 | Covid-19 Unexposed/Symptom Free |
| 22 | Employment Drug Testing - Oral Fluid |
| 23 | Rapid Drug Test - Urine |
| 24 | Rapid Drug Test - Oral Fluid |

---

## 8. Subscription Management Module

Subscriptions let your backend receive real-time webhook callbacks when an appointment changes.

### View Active Subscriptions

Your backend should maintain a database of active subscriptions (subscriptionId, appointmentConfirmationNumber, created date). Display these in admin.

### Create Subscription (Admin-triggered)

**Backend call:**
```
POST /api/admin/subscription
→ POST {LABCORP_SCHED_URL}/subscription
→ Encrypt payload
```

**Payload structure:**
```json
{
  "id": "{confirmationNumber}",
  "type": "appointment",
  "channel": {
    "type": "rest-hook",
    "endpoint": "https://your-backend.com/webhooks/labcorp/appointment",
    "header": [
      "Authorization: Bearer {WEBHOOK_SECRET}"
    ]
  }
}
```

**Response:** Encrypted subscription ID — backend decrypts and stores it.

### Delete Subscription

**When to use:** Appointment is completed/cancelled, no longer need updates.

**Backend call:**
```
DELETE /api/admin/subscription/:subscriptionId
→ DELETE {LABCORP_SCHED_URL}/subscription/{id}
```

---

## 9. System Health Module

### Health Check Dashboard

**Backend call:**
```
GET /api/admin/health
→ GET {LABCORP_SCHED_URL}/health
```

**Response:**
```json
{
  "version": "1.0.0 c8b48c1",
  "message": "healthy"
}
```

**Display in Admin UI:**
```
┌─────────────────────────────────────────┐
│  Labcorp API Status                     │
│  ● ONLINE   v1.0.0 c8b48c1             │
│  Last checked: 2 minutes ago            │
└─────────────────────────────────────────┘
```

**Recommended:** Poll this every 5 minutes in the background. Alert admin if it returns anything other than 200.

---

## 10. Data Sync / Background Jobs

The admin panel benefits from these scheduled jobs (run in the backend):

### Job 1: Location Cache Refresh (Nightly)
```
Schedule: Daily at 2:00 AM
Action: GET /locations → store in DB/cache
Reason: 2000+ locations — too large to fetch on demand
```

### Job 2: Inactive Location Scan (Daily)
```
Schedule: Daily at 6:00 AM
Action: GET /locations/inactive?noOfDays=1
Reason: Flag any newly deactivated locations from the previous day
Action if found: Create admin alert, check if any appointments exist at those locations
```

### Job 3: Token Health Check (Every 11 Hours)
```
Schedule: Every 11 hours
Action: Force-refresh Okta token proactively
Reason: Ensure token is always fresh regardless of usage patterns
```

### Job 4: Appointment Status Sync (Hourly, if using tracking IDs)
```
Schedule: Every hour
Action: GET /appointments/tracking/{id} for all active appointments
Reason: Keep your internal appointment status in sync with Labcorp
```

---

## 11. Admin API Routes (Backend)

The backend exposes these as **admin-only** routes (require admin role/session):

```
GET    /api/admin/health
GET    /api/admin/locations              (paginated from cache)
GET    /api/admin/locations/search
GET    /api/admin/locations/inactive
GET    /api/admin/locations/:id
GET    /api/admin/services
GET    /api/admin/appointments/:confirmationNumber
PUT    /api/admin/appointments/:confirmationNumber/cancel
GET    /api/admin/appointments/tracking/:trackingId
GET    /api/admin/subscriptions          (from your own DB)
POST   /api/admin/subscriptions
DELETE /api/admin/subscriptions/:id
```

---

## 12. Environment Variables

The admin panel shares the same backend as the frontend. No additional env vars needed beyond what's in the backend guide. Ensure these are set:

```env
LABCORP_SCHED_URL=https://api-staging.labcorp.com
LABCORP_PAYLOAD_PASSWORD=base64encodedkeyhere==
OKTA_CLIENT_ID=...
OKTA_CLIENT_SECRET=...
OKTA_URL_PREFIX=...
WEBHOOK_SECRET=...
ADMIN_SESSION_SECRET=your_admin_session_secret
```

---

## 13. Recommended Folder Structure

```
admin/                          (separate Cursor project or monorepo package)
├── src/
│   ├── pages/
│   │   ├── dashboard/
│   │   │   └── index.tsx       # Health check + summary stats
│   │   ├── locations/
│   │   │   ├── index.tsx       # Location list/search
│   │   │   ├── inactive.tsx    # Inactive locations monitor
│   │   │   └── [id].tsx        # Location detail view
│   │   ├── appointments/
│   │   │   ├── lookup.tsx      # Search by confirmation number
│   │   │   └── [id].tsx        # Appointment detail + cancel
│   │   ├── services/
│   │   │   └── index.tsx       # Services reference table
│   │   └── subscriptions/
│   │       └── index.tsx       # Subscription management
│   ├── components/
│   │   ├── LocationTable/
│   │   ├── AppointmentDetail/
│   │   ├── HealthStatusBadge/
│   │   └── SubscriptionList/
│   ├── services/
│   │   └── adminApi.ts         # All calls to DFC Backend admin routes
│   └── hooks/
│       ├── useLocations.ts
│       ├── useAppointment.ts
│       └── useHealth.ts
```

---

## 14. Admin UI Pages Reference

### Page: Dashboard (`/admin`)
- Labcorp API health status badge
- Count of inactive locations in last 7 days (with alert if > 0)
- Quick search bar: "Look up appointment by confirmation number"
- Active subscription count

### Page: Locations (`/admin/locations`)
- Search bar (address + radius + service filter)
- Full data table with pagination
- Export to CSV button
- "View Inactive" tab (calls `/locations/inactive`)

### Page: Appointment Lookup (`/admin/appointments/lookup`)
- Single input: confirmation number
- On submit: fetch and display full appointment details
- "Cancel Appointment" button with confirmation dialog
- Show patient email and phone for support reference

### Page: Services Reference (`/admin/services`)
- Static-ish table of all 24 services (refresh weekly from API)
- Useful for support staff to know what serviceId means what

### Page: Subscriptions (`/admin/subscriptions`)
- Table of active webhook subscriptions from your DB
- Columns: Subscription ID | Appointment ID | Created | Actions
- "Delete" button per row

### Page: System Health (`/admin/health`)
- Live health check result from Labcorp
- API version info
- Token status (is cached token valid? expires in X minutes?)
- Last successful API call timestamp

---

## Key Reminders

- ✅ The full location list (`/locations`) is huge — **cache it**, don't fetch on every page load
- ✅ Always check inactive locations daily — patients with upcoming appointments at closed locations need proactive support outreach
- ✅ Cancellations are **irreversible** — always show a confirmation dialog before admin cancels
- ✅ Admin routes should be protected by role-based auth — not accessible to patients
- ✅ Log all admin-triggered cancellations with the admin user's ID, timestamp, and reason
- ✅ When an inactive location is detected that has upcoming appointments, **alert admin immediately**
- ✅ Contact for support issues: schedulingAPIOnboard@labcorp.com (include partner: Cynergy Wellness)

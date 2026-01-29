# Complete API Endpoints Reference Guide

## Overview

This guide provides detailed information about all API endpoints for donor registration, Labcorp integration, and payments. Includes required/optional fields, authorization, headers, and testing URLs.

---

## 🔗 Base URLs

**Development:**
```
http://localhost:3000/api
```

**Production:**
```
https://your-api-domain.com/api
```

**Labcorp SOAP URL (Backend Only):**
```
https://services.labcorpsolutions.com/webservice/services/LabcorpOTS
```

---

## 1. Donor Registration Endpoints

### 1.1 Create Donor Registration

**Endpoint:**
```
POST /api/donors/donor-registration
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `donorNameFirst` | string | ✅ **Required** | Donor's first name |
| `donorNameLast` | string | ✅ **Required** | Donor's last name |
| `donorEmail` | string | Optional | Donor's email address |
| `donorSSN` | string | Optional | Donor's Social Security Number (encrypted) |
| `donorStateOfResidence` | string | Optional | State of residence (e.g., "FL", "CA") |
| `donorSex` | string | Optional | Gender ("M", "F", "Other") |
| `donorDateOfBirth` | string | Optional | Date of birth (ISO format) |
| `donorId` | string | Optional | Donor ID (e.g., driver's license number) |
| `reasonForTest` | string | Optional | Reason for test |
| `serviceId` | number | Optional | Service ID |
| `accountNo` | string | Optional | Account number |
| `panelId` | string | Optional | Panel ID |
| `registrationExpirationDate` | string | Optional | Registration expiration date (ISO format) |
| `status` | string | Optional | Registration status (default: "PENDING") |
| `labcorpRegistrationNumber` | string | Optional | Labcorp registration number (set after Labcorp registration) |

**Example Request:**
```json
{
  "donorNameFirst": "John",
  "donorNameLast": "Doe",
  "donorEmail": "john.doe@example.com",
  "donorSSN": "123456789",
  "donorStateOfResidence": "FL",
  "donorSex": "M",
  "donorDateOfBirth": "1990-01-01",
  "donorId": "DL123456",
  "reasonForTest": "PE",
  "panelId": "788206",
  "accountNo": "09027655",
  "registrationExpirationDate": "2030-12-31"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 37,
    "userId": 1,
    "donorNameFirst": "John",
    "donorNameLast": "Doe",
    "status": "PENDING",
    "createdAt": "2026-01-28T12:00:00.000Z",
    ...
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Donor first name and last name are required"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

### 1.2 Get All Donor Registrations

**Endpoint:**
```
GET /api/donors/donor-registrations
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | Optional | Page number (default: 1) |
| `perPage` | number | Optional | Items per page (default: 10) |
| `search` | string | Optional | Search term (searches name, SSN, panelId) |
| `status` | string | Optional | Filter by status (e.g., "PENDING", "CONFIRMED", "REJECTED") |

**Example Request:**
```
GET /api/donors/donor-registrations?page=1&perPage=10&status=PENDING&search=John
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 37,
      "userId": 1,
      "donorNameFirst": "John",
      "donorNameLast": "Doe",
      "status": "PENDING",
      ...
    }
  ],
  "meta": {
    "total": 50,
    "current_page": 1,
    "last_page": 5
  }
}
```

---

### 1.3 Get Donor Registration by ID

**Endpoint:**
```
GET /api/donors/donor-registration/:id
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | ✅ **Required** | Donor registration ID |

**Example Request:**
```
GET /api/donors/donor-registration/37
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 37,
    "userId": 1,
    "donorNameFirst": "John",
    "donorNameLast": "Doe",
    "status": "PENDING",
    "labcorpRegistrationNumber": null,
    ...
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Not found"
}
```

---

### 1.4 Update Donor Registration

**Endpoint:**
```
PUT /api/donors/donor-registration/:id
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | ✅ **Required** | Donor registration ID |

**Request Body:** All fields are **optional** (only include fields you want to update)

| Field | Type | Description |
|-------|------|-------------|
| `donorNameFirst` | string | Donor's first name |
| `donorNameLast` | string | Donor's last name |
| `donorEmail` | string | Donor's email |
| `donorSSN` | string | Donor's SSN |
| `donorStateOfResidence` | string | State of residence |
| `donorSex` | string | Gender |
| `donorDateOfBirth` | string | Date of birth |
| `status` | string | Registration status |
| `labcorpRegistrationNumber` | string | ⭐ **Important**: Labcorp registration number |
| `panelId` | string | Panel ID |
| `accountNo` | string | Account number |
| ... | ... | Any other registration fields |

**Example Request:**
```json
{
  "labcorpRegistrationNumber": "584745951",
  "status": "CONFIRMED"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 37,
    "labcorpRegistrationNumber": "584745951",
    "status": "CONFIRMED",
    ...
  }
}
```

---

### 1.5 Register with Labcorp (Confirm Direct)

**Endpoint:**
```
POST /api/donors/donor-registration/confirm-direct
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `donorNameFirst` | string | ✅ **Required** | Donor's first name |
| `donorNameLast` | string | ✅ **Required** | Donor's last name |
| `donorSex` | string | ✅ **Required** | Gender ("M", "F", "Other") |
| `donorDateOfBirth` | string | ✅ **Required** | Date of birth (ISO format: "1990-01-01" or "1990-01-01T00:00:00") |
| `panelId` | string | ✅ **Required** | Panel ID (e.g., "788206") |
| `accountNumber` | string | ✅ **Required** | Account number (e.g., "09027655") |
| `donorSSN` | string | Optional | Donor's Social Security Number |
| `donorStateOfResidence` | string | Optional | State of residence (e.g., "FL") |
| `testingAuthority` | string | Optional | Testing authority (default: "HHS") |
| `registrationExpirationDate` | string | Optional | Registration expiration date (ISO format) |
| `donorReasonForTest` | string | Optional | Reason for test (default: "PE") |
| `donorNameMiddleInitial` | string | Optional | Middle initial |
| `donorId` | string | Optional | Donor ID |
| `splitSpecimenRequested` | boolean | Optional | Split specimen requested (default: false) |

**Example Request:**
```json
{
  "donorNameFirst": "John",
  "donorNameLast": "Doe",
  "donorSex": "M",
  "donorDateOfBirth": "1990-01-01",
  "donorSSN": "123456789",
  "donorStateOfResidence": "FL",
  "panelId": "788206",
  "accountNumber": "09027655",
  "testingAuthority": "HHS",
  "registrationExpirationDate": "2030-12-31",
  "donorReasonForTest": "PE",
  "donorNameMiddleInitial": "M",
  "donorId": "DL123456",
  "splitSpecimenRequested": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "labcorpRegistrationNumber": "584745951"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Missing required fields"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "LabCorp confirmation failed: [error details]"
}
```

**Note:** This endpoint sends a SOAP request to Labcorp and returns the Labcorp Registration Number. You must then update the donor registration record with this number using the Update endpoint (1.4).

---

### 1.6 Reject Donor Registration

**Endpoint:**
```
POST /api/donors/donor-registration/:id/reject
```

**Authorization:** ✅ **Required** - JWT Token (Admin only)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | ✅ **Required** | Donor registration ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rejectReason` | string | ✅ **Required** | Reason for rejection |

**Example Request:**
```json
{
  "rejectReason": "Incomplete documentation"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 37,
    "status": "REJECTED",
    ...
  }
}
```

---

## 3. Payment Endpoints

### 3.1 Create Payment

**Endpoint:**
```
POST /api/payments
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `donorRegistrationId` | number | ✅ **Required** | Donor registration ID |
| `amount` | number | ✅ **Required** | Payment amount (e.g., 75.00) |
| `currency` | string | ✅ **Required** | Currency code (e.g., "USD") |
| `paymentMethod` | string | ✅ **Required** | Payment method (e.g., "CARD", "CASH") |
| `transactionId` | string | ✅ **Required** | Transaction ID (e.g., Stripe payment intent ID: "pi_3SuByWRswbdOE8Y30vQ9rUmL") |
| `status` | string | Optional | Payment status (default: "COMPLETED") |

**Example Request:**
```json
{
  "donorRegistrationId": 37,
  "amount": 75.00,
  "currency": "USD",
  "paymentMethod": "CARD",
  "transactionId": "pi_3SuByWRswbdOE8Y30vQ9rUmL",
  "status": "COMPLETED"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "donorRegistrationId": 37,
    "amount": 75.00,
    "currency": "USD",
    "paymentMethod": "CARD",
    "transactionId": "pi_3SuByWRswbdOE8Y30vQ9rUmL",
    "status": "COMPLETED",
    "createdAt": "2026-01-28T12:00:00.000Z",
    ...
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "donorRegistrationId, amount, currency, paymentMethod, and transactionId are required"
}
```

---

### 3.2 Get All Payments

**Endpoint:**
```
GET /api/payments
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | Optional | Page number (default: 1) |
| `perPage` | number | Optional | Items per page (default: 10) |
| `status` | string | Optional | Filter by status (e.g., "COMPLETED", "PENDING") |

**Example Request:**
```
GET /api/payments?page=1&perPage=10&status=COMPLETED
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "donorRegistrationId": 37,
      "amount": 75.00,
      "currency": "USD",
      "status": "COMPLETED",
      ...
    }
  ],
  "meta": {
    "total": 20,
    "current_page": 1,
    "last_page": 2
  }
}
```

---

### 3.3 Get All Payments (No Pagination)

**Endpoint:**
```
GET /api/payments/all
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | Optional | Filter by status |

**Example Request:**
```
GET /api/payments/all?status=COMPLETED
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "donorRegistrationId": 37,
      "amount": 75.00,
      ...
    }
  ],
  "meta": {
    "total": 20
  }
}
```

---

### 3.4 Get Payment by ID

**Endpoint:**
```
GET /api/payments/:id
```

**Authorization:** ✅ **Required** - JWT Token

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | ✅ **Required** | Payment ID |

**Example Request:**
```
GET /api/payments/25
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "donorRegistrationId": 37,
    "amount": 75.00,
    ...
  }
}
```

---

## 📋 Complete Testing Guide

### Postman Collection Setup

#### 1. Environment Variables

Create a Postman environment with:
```
base_url: http://localhost:3000/api
jwt_token: YOUR_JWT_TOKEN_HERE
```

#### 2. Authorization Setup

For endpoints requiring authentication:
1. Go to **Authorization** tab
2. Select **Type: Bearer Token**
3. Enter token: `{{jwt_token}}`

Or add header manually:
```
Authorization: Bearer {{jwt_token}}
```

---

### Testing Examples

#### Test 1: Create Donor Registration

**Request:**
```
POST http://localhost:3000/api/donors/donor-registration
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "donorNameFirst": "John",
  "donorNameLast": "Doe",
  "donorEmail": "john.doe@example.com",
  "donorStateOfResidence": "FL",
  "panelId": "788206"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 37,
    ...
  }
}
```

---

#### Test 3: Register with Labcorp

**Request:**
```
POST http://localhost:3000/api/donors/donor-registration/confirm-direct
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "donorNameFirst": "John",
  "donorNameLast": "Doe",
  "donorSex": "M",
  "donorDateOfBirth": "1990-01-01",
  "panelId": "788206",
  "accountNumber": "09027655",
  "donorSSN": "123456789",
  "donorStateOfResidence": "FL",
  "testingAuthority": "HHS",
  "registrationExpirationDate": "2030-12-31",
  "donorReasonForTest": "PE"
}
```

**Expected Response:**
```json
{
  "success": true,
  "labcorpRegistrationNumber": "584745951"
}
```

---

#### Test 4: Update Registration with Labcorp Number

**Request:**
```
PUT http://localhost:3000/api/donors/donor-registration/37
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "labcorpRegistrationNumber": "584745951",
  "status": "CONFIRMED"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 37,
    "labcorpRegistrationNumber": "584745951",
    "status": "CONFIRMED",
    ...
  }
}
```

---

#### Test 5: Create Payment

**Request:**
```
POST http://localhost:3000/api/payments
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "donorRegistrationId": 37,
  "amount": 75.00,
  "currency": "USD",
  "paymentMethod": "CARD",
  "transactionId": "pi_3SuByWRswbdOE8Y30vQ9rUmL"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    ...
  }
}
```

---

## 🔐 Authentication

### Getting a JWT Token

**Login Endpoint:**
```
POST /api/auth/login
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    ...
  }
}
```

**Use the `token` from the response in the `Authorization` header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 Summary Table

| Endpoint | Method | Auth | Required Fields | Optional Fields |
|----------|--------|------|----------------|-----------------|
| Create Registration | POST | ✅ | `donorNameFirst`, `donorNameLast` | All others |
| Get All Registrations | GET | ✅ | None | `page`, `perPage`, `search`, `status` |
| Get Registration by ID | GET | ✅ | `id` (URL) | None |
| Update Registration | PUT | ✅ | `id` (URL) | All fields optional |
| Register with Labcorp | POST | ✅ | `donorNameFirst`, `donorNameLast`, `donorSex`, `donorDateOfBirth`, `panelId`, `accountNumber` | `donorSSN`, `donorStateOfResidence`, `testingAuthority`, `registrationExpirationDate`, `donorReasonForTest`, etc. |
| Reject Registration | POST | ✅ | `id` (URL), `rejectReason` | None |
| Create Payment | POST | ✅ | `donorRegistrationId`, `amount`, `currency`, `paymentMethod`, `transactionId` | `status` |
| Get All Payments | GET | ✅ | None | `page`, `perPage`, `status` |

---

## ⚠️ Important Notes

1. **Base URL**: Always use `http://localhost:3000/api` (NOT 4000)
2. **Authorization**: Most endpoints require JWT token in `Authorization: Bearer TOKEN` header
3. **Labcorp Registration**: After calling `/confirm-direct`, you MUST update the registration with the returned `labcorpRegistrationNumber`
4. **Payment Transaction ID**: Use Stripe payment intent ID (starts with `pi_`)
5. **Date Formats**: Use ISO format (e.g., "1990-01-01" or "1990-01-01T00:00:00")
6. **Error Handling**: Always check `success` field in responses

---

This guide provides complete information for testing all endpoints!

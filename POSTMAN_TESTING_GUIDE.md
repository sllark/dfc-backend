# Postman Testing Guide for LabCorp Endpoints

## Prerequisites

1. **Base URL**: `http://localhost:3000/api` (or your production URL)
2. **Authentication**: Both endpoints require JWT token authentication

---

## Step 1: Get Authentication Token

### Login Request

**Method:** `POST`  
**URL:** `http://localhost:3000/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Expected Response:**
```json
{
  "success": true,
  "id": 1,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "USER",
  "username": "your-username",
  "email": "your-email@example.com"
}
```

**📝 Copy the `token` value from the response - you'll need it for the next steps!**

---

## Step 2: Test Locate Collection Sites Endpoint

### Request Setup

**Method:** `POST`  
**URL:** `http://localhost:3000/api/labcorp/locate-sites`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Replace `YOUR_TOKEN_HERE` with the token from Step 1**

**Body (raw JSON):**
```json
{
  "zip": "77077",
  "distance": 10
}
```

### Request Body Options

**Required:**
- `zip` (string): 5-digit zip code (e.g., "77077")

**Optional:**
- `distance` (number): Search radius in miles (1-100, default: 10)

### Example Request Bodies

**Minimal (zip only):**
```json
{
  "zip": "77077"
}
```

**With custom distance:**
```json
{
  "zip": "77077",
  "distance": 25
}
```

### Expected Success Response (200):
```json
{
  "success": true,
  "data": [
    {
      "collectionSiteId": "S27138",
      "collectionSiteName": "LABCORP",
      "address1": "19002 PARK ROW",
      "address2": "SUITE 106",
      "city": "HOUSTON",
      "state": "TX",
      "zip": "77084",
      "distance": "5.205416741240954",
      "phoneNumber": "2819573639",
      "phone": {
        "areaCode": "281",
        "exchange": "957",
        "station": "3639",
        "extension": null,
        "countryCode": "001"
      }
    },
    {
      "collectionSiteId": "S07335",
      "collectionSiteName": "LABCORP",
      "address1": "855 FROSTWOOD",
      "address2": null,
      "city": "HOUSTON",
      "state": "TX",
      "zip": "77024",
      "distance": "6.1712282963703835",
      "phoneNumber": "7134610537",
      "phone": {
        "areaCode": "713",
        "exchange": "461",
        "station": "0537",
        "extension": null,
        "countryCode": "001"
      }
    }
  ],
  "count": 2,
  "zip": "77077",
  "distance": 10
}
```

### Error Responses

**400 - Invalid Zip Code:**
```json
{
  "success": false,
  "message": "Invalid zip code format. Please provide a valid 5-digit zip code (e.g., 77077)"
}
```

**400 - Invalid Distance:**
```json
{
  "success": false,
  "message": "Distance must be a number between 1 and 100 miles"
}
```

**401 - Unauthorized:**
```json
{
  "message": "Access denied. No token provided."
}
```
or
```json
{
  "message": "Invalid token."
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Labcorp SOAP fault: [error details]"
}
```

---

## Step 3: Test Select Location Endpoint

### Request Setup

**Method:** `POST`  
**URL:** `http://localhost:3000/api/labcorp/select-location`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**Replace `YOUR_TOKEN_HERE` with the token from Step 1**

**Body (raw JSON):**
```json
{
  "collectionSiteId": "S27138",
  "collectionSiteName": "LABCORP",
  "address1": "19002 PARK ROW",
  "address2": "SUITE 106",
  "city": "HOUSTON",
  "state": "TX",
  "zip": "77084",
  "distance": "5.205416741240954",
  "phoneNumber": "2819573639",
  "donorRegistrationId": 123
}
```

### Request Body Options

**Required:**
- `collectionSiteId` (string): The collection site ID from the locate-sites response

**Optional:**
- `collectionSiteName` (string): Name of the collection site
- `address1` (string): Street address line 1
- `address2` (string): Street address line 2
- `city` (string): City name
- `state` (string): State code (e.g., "TX")
- `zip` (string): Zip code
- `distance` (string): Distance from search zip
- `phoneNumber` (string): Formatted phone number
- `donorRegistrationId` (number): Optional link to donor registration

### Example Request Bodies

**Minimal (only required field):**
```json
{
  "collectionSiteId": "S27138"
}
```

**Complete (with all fields):**
```json
{
  "collectionSiteId": "S27138",
  "collectionSiteName": "LABCORP",
  "address1": "19002 PARK ROW",
  "address2": "SUITE 106",
  "city": "HOUSTON",
  "state": "TX",
  "zip": "77084",
  "distance": "5.205416741240954",
  "phoneNumber": "2819573639",
  "donorRegistrationId": 123
}
```

### Expected Success Response (200):
```json
{
  "success": true,
  "message": "Location selected successfully",
  "data": {
    "collectionSiteId": "S27138",
    "collectionSiteName": "LABCORP",
    "address1": "19002 PARK ROW",
    "address2": "SUITE 106",
    "city": "HOUSTON",
    "state": "TX",
    "zip": "77084",
    "distance": "5.205416741240954",
    "phoneNumber": "2819573639"
  },
  "donorRegistrationId": 123,
  "note": "This location will be used for order placement"
}
```

### Error Responses

**400 - Missing Required Field:**
```json
{
  "success": false,
  "message": "collectionSiteId is required"
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to select location"
}
```

---

## Postman Collection Setup Tips

### 1. Create Environment Variables

In Postman, create an environment with these variables:

```
base_url: http://localhost:3000/api
auth_token: (leave empty, will be set after login)
```

### 2. Setup Pre-request Script for Login

Create a login request with a **Tests** tab script to automatically save the token:

```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.token) {
        pm.environment.set("auth_token", jsonData.token);
        console.log("Token saved:", jsonData.token);
    }
}
```

### 3. Use Environment Variables in Requests

**URL:** `{{base_url}}/labcorp/locate-sites`

**Authorization Header:** `Bearer {{auth_token}}`

### 4. Create a Collection Flow

1. **Login** → Saves token to environment
2. **Locate Sites** → Uses saved token
3. **Select Location** → Uses saved token and data from step 2

---

## Quick Test Workflow

1. ✅ **Login** → Get token
2. ✅ **Locate Sites** with zip "77077" → Get list of sites
3. ✅ **Select Location** with `collectionSiteId` from step 2 → Confirm selection

---

## Troubleshooting

### Issue: "Access denied. No token provided"
- **Solution**: Make sure you've added the `Authorization` header with `Bearer YOUR_TOKEN`

### Issue: "Invalid token"
- **Solution**: Token may have expired (tokens expire after 1 hour). Login again to get a new token.

### Issue: "Labcorp SOAP fault"
- **Solution**: Check your `.env` file has correct LabCorp credentials:
  - `LABCORP_SOAP_URL`
  - `LABCORP_USER_ID`
  - `LABCORP_PASSWORD`

### Issue: "Invalid zip code format"
- **Solution**: Use 5-digit zip code format (e.g., "77077", not "77077-1234" or "7707")

---

## Example Postman Collection JSON

You can import this into Postman:

```json
{
  "info": {
    "name": "LabCorp Collection Sites API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"your-email@example.com\",\n  \"password\": \"your-password\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/auth/login",
          "host": ["{{base_url}}"],
          "path": ["auth", "login"]
        }
      }
    },
    {
      "name": "2. Locate Collection Sites",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"zip\": \"77077\",\n  \"distance\": 10\n}"
        },
        "url": {
          "raw": "{{base_url}}/labcorp/locate-sites",
          "host": ["{{base_url}}"],
          "path": ["labcorp", "locate-sites"]
        }
      }
    },
    {
      "name": "3. Select Location",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"collectionSiteId\": \"S27138\",\n  \"collectionSiteName\": \"LABCORP\",\n  \"address1\": \"19002 PARK ROW\",\n  \"address2\": \"SUITE 106\",\n  \"city\": \"HOUSTON\",\n  \"state\": \"TX\",\n  \"zip\": \"77084\",\n  \"distance\": \"5.205416741240954\",\n  \"phoneNumber\": \"2819573639\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/labcorp/select-location",
          "host": ["{{base_url}}"],
          "path": ["labcorp", "select-location"]
        }
      }
    }
  ]
}
```

---

**Happy Testing! 🚀**

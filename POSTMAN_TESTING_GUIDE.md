# Postman API Testing Guide

## Base URL
```
http://localhost:3000/api
```

## Step-by-Step Testing

### 1. Register a New User (Optional - if you don't have an account)

**Request:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/register`
- Headers:
  ```
  Content-Type: application/json
  ```
- Body (raw JSON):
  ```json
  {
      "username": "testuser",
      "email": "test@example.com",
      "password": "password123",
      "phone": "1234567890"
  }
  ```

### 2. Login to Get Token

**Request:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/login`
- Headers:
  ```
  Content-Type: application/json
  ```
- Body (raw JSON):
  ```json
  {
      "email": "test@example.com",
      "password": "password123"
  }
  ```

**Response:**
```json
{
    "success": true,
    "id": 1,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "USER",
    "username": "testuser",
    "email": "test@example.com",
    "phone": "1234567890"
}
```

**⚠️ IMPORTANT:** Copy the `token` value from the response!

### 3. Create a Service (Requires Authentication)

**Request:**
- Method: `POST`
- URL: `http://localhost:3000/api/services`
- Headers:
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN_HERE
  ```
  (Replace `YOUR_TOKEN_HERE` with the token from Step 2)

- Body (raw JSON):
  ```json
  {
      "name": "Drug Test Service",
      "slug": "drug-test-service",
      "createdBy": 1,
      "accountNo": "ACC123456",
      "panelID": "PANEL001",
      "serviceFee": 75.50,
      "status": true
  }
  ```

**Required Fields:**
- `name` (string) - Service name
- `slug` (string) - URL-friendly identifier
- `createdBy` (number) - User ID who created the service

**Optional Fields:**
- `accountNo` (string) - Account number
- `panelID` (string) - Panel ID
- `serviceFee` (number) - Service fee amount
- `status` (boolean) - Service status (default: true)

### 4. Create Service with Image Upload

**Request:**
- Method: `POST`
- URL: `http://localhost:3000/api/services`
- Headers:
  ```
  Authorization: Bearer YOUR_TOKEN_HERE
  ```
  (Do NOT set Content-Type - Postman will set it automatically for form-data)

- Body Type: `form-data`
- Fields:
  - `name`: Drug Test Service
  - `slug`: drug-test-service
  - `createdBy`: 1
  - `accountNo`: ACC123456
  - `panelID`: PANEL001
  - `serviceFee`: 75.50
  - `status`: true
  - `bannerImage`: (File) - Select an image file

## Common Issues & Solutions

### Issue: "Invalid token"
**Solution:** 
1. Make sure you copied the full token from the login response
2. Check that the token hasn't expired (tokens expire after 1 hour)
3. Verify the Authorization header format: `Bearer YOUR_TOKEN_HERE` (with space after "Bearer")
4. Login again to get a fresh token

### Issue: "Unauthorized" or "Access denied. No token provided"
**Solution:**
1. Make sure you added the Authorization header
2. Check the header format: `Authorization: Bearer YOUR_TOKEN_HERE`
3. Verify the token is still valid (login again if needed)

### Issue: 404 Not Found
**Solution:**
1. Check the URL includes `/api` prefix: `http://localhost:3000/api/services`
2. Verify your backend server is running on port 3000
3. Check the request method (POST for create, GET for read, etc.)

## Postman Environment Variables (Recommended)

Set up environment variables in Postman for easier testing:

1. Create a new Environment in Postman
2. Add variables:
   - `base_url`: `http://localhost:3000/api`
   - `token`: (leave empty, will be set after login)

3. Use in requests:
   - URL: `{{base_url}}/auth/login`
   - Authorization: `Bearer {{token}}`

4. After login, set the token:
   - In the login request, add a "Tests" tab with:
   ```javascript
   if (pm.response.code === 200) {
       const jsonData = pm.response.json();
       pm.environment.set("token", jsonData.token);
   }
   ```

## All Available Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (get token)
- `POST /api/auth/logout` - Logout (requires auth)
- `GET /api/auth/check-user?email=...` - Check if user exists

### Services
- `GET /api/services` - Get all services (public)
- `GET /api/services/:id` - Get service by ID (public)
- `POST /api/services` - Create service (requires auth)
- `PUT /api/services/:id` - Update service (requires auth)
- `DELETE /api/services/:id` - Delete service (requires auth)

### Payments (All require auth)
- `POST /api/payments` - Create payment
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID
- `PUT /api/payments/:id/status` - Update payment status
- `DELETE /api/payments/:id` - Delete payment

### Donor Registrations (All require auth)
- `POST /api/donors/donor-registration` - Create registration
- `GET /api/donors/donor-registrations` - Get all registrations
- `GET /api/donors/donor-registration/:id` - Get by ID
- `PUT /api/donors/donor-registration/:id` - Update
- `DELETE /api/donors/donor-registration/:id` - Delete

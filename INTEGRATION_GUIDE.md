# Complete Integration Guide: Donor & Payment APIs with Stripe Webhooks

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Understanding the ID Flow](#understanding-the-id-flow)
4. [Step-by-Step Integration](#step-by-step-integration)
5. [Frontend Implementation Examples](#frontend-implementation-examples)
6. [Error Handling](#error-handling)
7. [Testing Checklist](#testing-checklist)

---

## 🎯 Overview

This guide walks you through integrating the donor registration and payment system with Stripe from your frontend. The flow involves:

1. **User Authentication** → Get `userId` and `token`
2. **Create Stripe Checkout Session** → Get `sessionId` and `sessionUrl`
3. **User Completes Payment** → Stripe processes payment
4. **Webhook Receives Event** → Creates `donorId` and `paymentId`
5. **Frontend Confirms Payment** → Retrieves final data

---

## 📦 Prerequisites

### Backend Environment Variables
Ensure your backend has these environment variables set:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret
```

### Frontend Dependencies
```bash
npm install @stripe/stripe-js axios
# or
yarn add @stripe/stripe-js axios
```

### API Base URL
```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
```

---

## 🔑 Understanding the ID Flow

### Critical IDs to Track

| ID Type | Source | When Created | Purpose | Example |
|---------|--------|--------------|---------|---------|
| **userId** | Auth/Login | User registration/login | Links user to all records | `123` |
| **sessionId** | Stripe Checkout | When checkout session is created | Stripe checkout session identifier | `cs_test_...` |
| **paymentIntentId** | Stripe | When payment is processed | Stripe payment transaction ID | `pi_...` |
| **donorId** | Webhook | After payment completes | Donor registration record ID | `456` |
| **paymentId** | Webhook | After payment completes | Payment record ID | `789` |
| **transactionId** | Stripe | Payment intent ID | Used in payment record | `pi_...` |

### ID Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. User Login/Register
   └─> Returns: userId, token
   
2. Create Checkout Session
   POST /api/checkout
   Headers: { Authorization: "Bearer {token}" }
   Body: { selectedServices, donorInfo }
   └─> Returns: { sessionUrl, user: { id: userId, token, ... } }
   └─> Store: userId, sessionId (from sessionUrl)
   
3. Redirect to Stripe Checkout
   └─> User completes payment
   └─> Stripe redirects to: /confirmation?session_id={CHECKOUT_SESSION_ID}
   
4. Verify Payment Status
   GET /api/stripe/session/{sessionId}
   └─> Returns: { donorInfo, paymentInfo, session }
   
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND WEBHOOK FLOW                     │
└─────────────────────────────────────────────────────────────┘

5. Stripe Webhook (Automatic)
   POST /api/stripe/webhook
   Event: checkout.session.completed
   └─> Extracts: userId, donorInfo, services from metadata
   └─> Creates: DonorRegistration (donorId)
   └─> Creates: Payment (paymentId, transactionId)
   └─> Links: userId → donorId → paymentId
```

---

## 🚀 Step-by-Step Integration

### Step 1: User Authentication

**Purpose**: Get `userId` and authentication `token`

#### API Endpoint
```
POST /api/login
POST /api/register
```

#### Frontend Implementation
```javascript
// services/authService.js
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const authService = {
  async login(email, password) {
    const response = await axios.post(`${API_BASE_URL}/login`, {
      email,
      password,
    });
    
    // Store token and user data
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('userId', user.id.toString());
    
    return {
      userId: user.id,
      token,
      user,
    };
  },

  async register(username, email, password) {
    const response = await axios.post(`${API_BASE_URL}/register`, {
      username,
      email,
      password,
    });
    
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('userId', user.id.toString());
    
    return {
      userId: user.id,
      token,
      user,
    };
  },

  getToken() {
    return localStorage.getItem('token');
  },

  getUserId() {
    return parseInt(localStorage.getItem('userId') || '0');
  },
};
```

#### Response Structure
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

**✅ Store**: `userId`, `token` in localStorage/sessionStorage

---

### Step 2: Prepare Donor Information

**Purpose**: Collect donor data before creating checkout session

#### Required Donor Fields
```javascript
const donorInfo = {
  donorNameFirst: "John",
  donorNameLast: "Doe",
  donorEmail: "john@example.com",
  donorSSN: "123-45-6789", // Optional but recommended
  donorStateOfResidence: "CA",
  donorDateOfBirth: "1990-01-15", // ISO date string
  donorSex: "M", // M, F, or Other
  reasonForTest: "Pre-employment",
  panelId: "PANEL_123", // ⚠️ REQUIRED - from service selection
  accountNo: "ACC_456", // Optional
  registrationExpirationDate: "2025-12-31", // Optional, defaults to 1 year
};
```

#### Service Selection
```javascript
const selectedServices = [
  {
    _id: "service_123", // or id
    name: "5-Panel Drug Test",
    serviceFee: 49.99, // ⚠️ Must be a positive number
  },
  // ... more services
];
```

**⚠️ Critical**: 
- `panelId` is **REQUIRED** in `donorInfo`
- `serviceFee` must be a positive number
- Service can have `serviceFee`, `price`, `amount`, or `fee` field

---

### Step 3: Create Stripe Checkout Session

**Purpose**: Get `sessionUrl` and `sessionId` to redirect user to Stripe

#### API Endpoint
```
POST /api/checkout
```

**⚠️ Note**: This endpoint does NOT require authentication. It automatically creates/finds the user based on email.

#### Frontend Implementation
```javascript
// services/checkoutService.js
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const checkoutService = {
  async createCheckoutSession(selectedServices, donorInfo) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/checkout`,
        {
          selectedServices,
          donorInfo,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { sessionUrl, user } = response.data;

      // ⚠️ IMPORTANT: Store user data if new user was created
      if (user && user.token) {
        localStorage.setItem('token', user.token);
        localStorage.setItem('userId', user.id.toString());
      }

      // Extract sessionId from sessionUrl (optional, for tracking)
      const sessionIdMatch = sessionUrl.match(/\/checkout\/session\/([^/?]+)/);
      const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

      return {
        sessionUrl,
        sessionId,
        user, // Contains userId, token, etc.
      };
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      throw new Error(
        error.response?.data?.error || 
        'Failed to create checkout session'
      );
    }
  },
};
```

#### Request Body
```json
{
  "selectedServices": [
    {
      "_id": "service_123",
      "name": "5-Panel Drug Test",
      "serviceFee": 49.99
    }
  ],
  "donorInfo": {
    "donorNameFirst": "John",
    "donorNameLast": "Doe",
    "donorEmail": "john@example.com",
    "donorSSN": "123-45-6789",
    "donorStateOfResidence": "CA",
    "donorDateOfBirth": "1990-01-15",
    "donorSex": "M",
    "reasonForTest": "Pre-employment",
    "panelId": "PANEL_123",
    "accountNo": "ACC_456",
    "registrationExpirationDate": "2025-12-31"
  }
}
```

#### Response Structure
```json
{
  "sessionUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "user": {
    "id": 123,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "USER",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**✅ Store**: 
- `sessionUrl` → redirect user
- `sessionId` (extracted from URL) → for tracking
- `userId` and `token` (if new user was created)

---

### Step 4: Redirect to Stripe Checkout

**Purpose**: Let user complete payment on Stripe's secure page

#### Frontend Implementation
```javascript
// components/CheckoutButton.jsx or pages/checkout.jsx
import { checkoutService } from '../services/checkoutService';
import { useState } from 'react';

export default function CheckoutButton({ selectedServices, donorInfo }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate data before proceeding
      if (!donorInfo.panelId) {
        throw new Error('Panel ID is required');
      }

      if (!selectedServices || selectedServices.length === 0) {
        throw new Error('At least one service must be selected');
      }

      // Create checkout session
      const { sessionUrl, sessionId, user } = await checkoutService.createCheckoutSession(
        selectedServices,
        donorInfo
      );

      // Store sessionId for later retrieval
      if (sessionId) {
        sessionStorage.setItem('currentSessionId', sessionId);
      }

      // Store user data if provided
      if (user?.token) {
        localStorage.setItem('token', user.token);
        localStorage.setItem('userId', user.id.toString());
      }

      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

**✅ Store**: `sessionId` in sessionStorage for confirmation page

---

### Step 5: Handle Payment Confirmation

**Purpose**: After Stripe redirects back, verify payment and retrieve donor/payment IDs

#### Stripe Redirect URLs
- **Success**: `/b2c/appointment/confirmation?session_id={CHECKOUT_SESSION_ID}`
- **Cancel**: `/b2c/appointment/checkout?canceled=true`

#### Frontend Implementation
```javascript
// pages/confirmation.jsx or pages/b2c/appointment/confirmation.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    // Poll for payment confirmation (webhook may take a few seconds)
    const checkPaymentStatus = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/stripe/session/${sessionId}`
        );

        const { donorInfo, paymentInfo, session } = response.data;

        // Check if payment is completed
        if (session.payment_status === 'paid' && paymentInfo) {
          setPaymentData({
            sessionId: session.id,
            transactionId: paymentInfo.transactionId, // paymentIntentId
            amount: paymentInfo.amount,
            currency: paymentInfo.currency,
            paymentMethod: paymentInfo.paymentMethod,
            donorInfo,
          });
          setLoading(false);
        } else {
          // Payment not completed yet, retry after 2 seconds
          setTimeout(checkPaymentStatus, 2000);
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        // Retry on error (webhook might still be processing)
        setTimeout(checkPaymentStatus, 2000);
      }
    };

    // Start checking immediately
    checkPaymentStatus();

    // Set timeout to stop polling after 30 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
      if (!paymentData) {
        setError('Payment confirmation is taking longer than expected. Please check your email or contact support.');
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [sessionId]);

  if (loading) {
    return <div>Processing your payment...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!paymentData) {
    return <div>Waiting for payment confirmation...</div>;
  }

  return (
    <div className="confirmation">
      <h1>Payment Successful!</h1>
      <div>
        <p><strong>Transaction ID:</strong> {paymentData.transactionId}</p>
        <p><strong>Amount:</strong> ${paymentData.amount} {paymentData.currency}</p>
        <p><strong>Payment Method:</strong> {paymentData.paymentMethod}</p>
        <p><strong>Donor:</strong> {paymentData.donorInfo.donorNameFirst} {paymentData.donorInfo.donorNameLast}</p>
      </div>
      {/* Note: donorId and paymentId are created by webhook, 
          you can fetch them using authenticated API calls */}
    </div>
  );
}
```

#### API Endpoint
```
GET /api/stripe/session/:sessionId
```

#### Response Structure
```json
{
  "donorInfo": {
    "donorNameFirst": "John",
    "donorNameLast": "Doe",
    "donorEmail": "john@example.com",
    "panelId": "PANEL_123"
  },
  "paymentInfo": {
    "amount": 49.99,
    "currency": "USD",
    "paymentMethod": "CARD",
    "transactionId": "pi_3ABC123..." // This is the paymentIntentId
  },
  "session": {
    "id": "cs_test_...",
    "status": "complete",
    "payment_status": "paid"
  }
}
```

**✅ Store**: `transactionId` (paymentIntentId) for reference

---

### Step 6: Retrieve Donor and Payment Records (Optional)

**Purpose**: Get `donorId` and `paymentId` after webhook processes the payment

**⚠️ Important**: The webhook creates the donor and payment records asynchronously. You may need to poll or wait a few seconds before these records are available.

#### API Endpoints
```
GET /api/donors (requires auth)
GET /api/donors/:id (requires auth)
GET /api/payments (requires auth)
GET /api/payments/:id (requires auth)
```

#### Frontend Implementation
```javascript
// services/donorService.js
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const donorService = {
  async getAllDonors(page = 1, perPage = 10) {
    const response = await axios.get(
      `${API_BASE_URL}/donors?page=${page}&perPage=${perPage}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  async getDonorById(donorId) {
    const response = await axios.get(
      `${API_BASE_URL}/donors/${donorId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Find donor by transaction ID (search through payments)
  async findDonorByTransactionId(transactionId) {
    // First, get all payments
    const paymentsResponse = await axios.get(
      `${API_BASE_URL}/payments`,
      { headers: getAuthHeaders() }
    );
    
    // Find payment with matching transactionId
    const payment = paymentsResponse.data.data.find(
      p => p.transactionId === transactionId
    );
    
    if (payment) {
      // Get the associated donor
      const donorResponse = await axios.get(
        `${API_BASE_URL}/donors/${payment.donorRegistrationId}`,
        { headers: getAuthHeaders() }
      );
      return {
        donor: donorResponse.data.data,
        payment: payment,
      };
    }
    
    return null;
  },
};
```

#### Usage Example
```javascript
// After payment confirmation
useEffect(() => {
  const fetchDonorAndPayment = async () => {
    if (paymentData?.transactionId) {
      try {
        // Wait a bit for webhook to process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const result = await donorService.findDonorByTransactionId(
          paymentData.transactionId
        );
        
        if (result) {
          console.log('Donor ID:', result.donor.id);
          console.log('Payment ID:', result.payment.id);
          setDonorId(result.donor.id);
          setPaymentId(result.payment.id);
        }
      } catch (error) {
        console.error('Error fetching donor/payment:', error);
      }
    }
  };
  
  fetchDonorAndPayment();
}, [paymentData]);
```

---

## 📝 Frontend Implementation Examples

### Complete React Component Example

```javascript
// pages/checkout-flow.jsx
import { useState } from 'react';
import { checkoutService } from '../services/checkoutService';
import { donorService } from '../services/donorService';

export default function CheckoutFlow() {
  const [step, setStep] = useState('form'); // form, processing, success
  const [donorInfo, setDonorInfo] = useState({
    donorNameFirst: '',
    donorNameLast: '',
    donorEmail: '',
    donorSSN: '',
    donorStateOfResidence: '',
    panelId: '', // ⚠️ REQUIRED
  });
  const [selectedServices, setSelectedServices] = useState([]);
  const [trackingIds, setTrackingIds] = useState({
    userId: null,
    sessionId: null,
    transactionId: null,
    donorId: null,
    paymentId: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStep('processing');

    try {
      // Step 1: Create checkout session
      const { sessionUrl, sessionId, user } = await checkoutService.createCheckoutSession(
        selectedServices,
        donorInfo
      );

      // Store tracking IDs
      setTrackingIds(prev => ({
        ...prev,
        userId: user.id,
        sessionId: sessionId,
      }));

      // Store in localStorage for confirmation page
      localStorage.setItem('checkoutSessionId', sessionId);
      localStorage.setItem('checkoutUserId', user.id.toString());

      // Redirect to Stripe
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create checkout session: ' + error.message);
      setStep('form');
    }
  };

  return (
    <div>
      {step === 'form' && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="First Name"
            value={donorInfo.donorNameFirst}
            onChange={(e) => setDonorInfo({ ...donorInfo, donorNameFirst: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={donorInfo.donorNameLast}
            onChange={(e) => setDonorInfo({ ...donorInfo, donorNameLast: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={donorInfo.donorEmail}
            onChange={(e) => setDonorInfo({ ...donorInfo, donorEmail: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Panel ID *"
            value={donorInfo.panelId}
            onChange={(e) => setDonorInfo({ ...donorInfo, panelId: e.target.value })}
            required
          />
          <button type="submit">Proceed to Payment</button>
        </form>
      )}
      
      {step === 'processing' && <div>Redirecting to payment...</div>}
    </div>
  );
}
```

---

## ⚠️ Error Handling

### Common Errors and Solutions

#### 1. Missing Panel ID
```javascript
// Error: "Missing panelId/panelID in donorInfo metadata"
// Solution: Ensure donorInfo.panelId is set
if (!donorInfo.panelId) {
  throw new Error('Panel ID is required');
}
```

#### 2. Invalid Service Fee
```javascript
// Error: "Invalid serviceFee for service"
// Solution: Ensure serviceFee is a positive number
const validatedServices = selectedServices.map(svc => ({
  ...svc,
  serviceFee: Number(svc.serviceFee) || 0,
}));
```

#### 3. Webhook Not Processing
```javascript
// If donor/payment records aren't found immediately:
// - Wait 3-5 seconds (webhook processing time)
// - Check webhook logs in Stripe Dashboard
// - Verify STRIPE_WEBHOOK_SECRET is set correctly
```

#### 4. Authentication Errors
```javascript
// Error: "Access denied. No token provided."
// Solution: Ensure token is stored and sent in headers
const token = localStorage.getItem('token');
if (!token) {
  // Redirect to login
}
```

---

## ✅ Testing Checklist

### Pre-Production Testing

- [ ] **User Authentication**
  - [ ] User can register
  - [ ] User can login
  - [ ] Token is stored correctly
  - [ ] `userId` is retrieved and stored

- [ ] **Checkout Session Creation**
  - [ ] Checkout session is created successfully
  - [ ] `sessionUrl` is received
  - [ ] `sessionId` can be extracted
  - [ ] All required fields are validated

- [ ] **Stripe Payment Flow**
  - [ ] User can complete payment on Stripe
  - [ ] Success redirect works
  - [ ] Cancel redirect works
  - [ ] `session_id` is in URL after success

- [ ] **Payment Confirmation**
  - [ ] Payment status can be retrieved
  - [ ] `transactionId` is available
  - [ ] Donor info is returned
  - [ ] Payment info is returned

- [ ] **Webhook Processing**
  - [ ] Webhook receives `checkout.session.completed` event
  - [ ] Donor record is created (`donorId`)
  - [ ] Payment record is created (`paymentId`)
  - [ ] All IDs are linked correctly

- [ ] **Data Retrieval**
  - [ ] Can fetch donor by ID (authenticated)
  - [ ] Can fetch payment by ID (authenticated)
  - [ ] Can find donor by `transactionId`
  - [ ] All relationships are correct

### ID Tracking Verification

- [ ] `userId` → Stored after login/register
- [ ] `sessionId` → Extracted from `sessionUrl`
- [ ] `transactionId` → Retrieved from payment confirmation
- [ ] `donorId` → Retrieved after webhook processes (with delay)
- [ ] `paymentId` → Retrieved after webhook processes (with delay)

---

## 🔍 Debugging Tips

### 1. Check Webhook Logs
```bash
# Backend console should show:
🔔 WEBHOOK REQUEST RECEIVED
🛒 PROCESSING CHECKOUT.SESSION.COMPLETED EVENT
✅ Donor registration created successfully
✅ Payment created successfully
```

### 2. Verify Metadata in Stripe Dashboard
- Go to Stripe Dashboard → Payments → Checkout Sessions
- Click on your session
- Check "Metadata" section contains:
  - `userId`
  - `donorInfo` (JSON string)
  - `services` (JSON string)

### 3. Test Webhook Locally
```bash
# Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 4. Monitor Network Requests
- Check browser DevTools → Network tab
- Verify all API calls have correct headers
- Check response status codes

---

## 📚 API Reference Summary

### Public Endpoints (No Auth Required)
- `POST /api/checkout` - Create Stripe checkout session
- `GET /api/stripe/session/:sessionId` - Get session details
- `POST /api/stripe/webhook` - Stripe webhook (called by Stripe)

### Protected Endpoints (Auth Required)
- `POST /api/donors/donor-registration` - Create donor (manual)
- `GET /api/donors` - Get all donors
- `GET /api/donors/:id` - Get donor by ID
- `POST /api/payments` - Create payment (manual)
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID

---

## 🎯 Quick Reference: ID Tracking

```javascript
// Complete ID tracking example
const trackingIds = {
  // Step 1: Authentication
  userId: localStorage.getItem('userId'), // From login/register
  
  // Step 2: Checkout
  sessionId: sessionStorage.getItem('currentSessionId'), // From checkout response
  
  // Step 3: Payment Confirmation
  transactionId: paymentData.transactionId, // From /api/stripe/session/:id
  
  // Step 4: After Webhook (with delay)
  donorId: null, // Retrieved via /api/donors (search by transactionId)
  paymentId: null, // Retrieved via /api/payments (search by transactionId)
};

// To find donorId and paymentId:
// 1. Wait 3-5 seconds after payment confirmation
// 2. Search payments by transactionId
// 3. Get donorRegistrationId from payment record
// 4. Fetch donor record using donorRegistrationId
```

---

## 🚨 Important Notes

1. **Webhook Timing**: The webhook processes asynchronously. Allow 3-5 seconds before querying for `donorId` and `paymentId`.

2. **Panel ID Required**: `panelId` is **mandatory** in `donorInfo`. The webhook will fail without it.

3. **Service Fee Format**: Service fees must be positive numbers. The backend converts dollars to cents automatically.

4. **Token Management**: Store tokens securely. Use `httpOnly` cookies in production if possible.

5. **Error Handling**: Always handle errors gracefully. Webhook failures are logged but don't block the user flow.

---

## 📞 Support

If you encounter issues:
1. Check backend logs for webhook processing
2. Verify Stripe Dashboard for payment status
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Last Updated**: 2024
**Version**: 1.0

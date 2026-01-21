# Quick Reference: ID Tracking Flow

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND INTEGRATION FLOW                   │
└─────────────────────────────────────────────────────────────────┘

STEP 1: AUTHENTICATION
───────────────────────
POST /api/login or /api/register
Response: { token, user: { id: userId, ... } }
✅ STORE: userId, token

STEP 2: CREATE CHECKOUT
───────────────────────
POST /api/checkout
Body: { selectedServices, donorInfo }
Response: { sessionUrl, user: { id: userId, token } }
✅ STORE: sessionId (extract from sessionUrl), userId, token

STEP 3: REDIRECT TO STRIPE
───────────────────────
window.location.href = sessionUrl
User completes payment on Stripe
Stripe redirects: /confirmation?session_id={CHECKOUT_SESSION_ID}
✅ STORE: sessionId from URL

STEP 4: VERIFY PAYMENT
───────────────────────
GET /api/stripe/session/{sessionId}
Response: { paymentInfo: { transactionId }, donorInfo, session }
✅ STORE: transactionId (paymentIntentId)

STEP 5: RETRIEVE RECORDS (After 3-5 sec delay)
───────────────────────
GET /api/payments (with auth token)
Search for payment with transactionId
GET /api/donors/{donorRegistrationId} (with auth token)
✅ RETRIEVE: donorId, paymentId

┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND WEBHOOK FLOW (Automatic)            │
└─────────────────────────────────────────────────────────────────┘

Stripe → POST /api/stripe/webhook
Event: checkout.session.completed
Extracts from metadata:
  - userId
  - donorInfo (JSON)
  - services (JSON)

Creates:
  1. DonorRegistration
     - id: donorId (auto-generated)
     - userId: from metadata
     - ...donorInfo fields
  
  2. Payment
     - id: paymentId (auto-generated)
     - donorRegistrationId: donorId
     - userId: from metadata
     - transactionId: session.payment_intent (paymentIntentId)
     - amount, currency, status: "COMPLETED"
```

## 📊 ID Mapping Table

| Step | ID Name | Source | Storage Location | Example Value |
|------|---------|--------|------------------|---------------|
| 1 | `userId` | Login/Register response | localStorage | `123` |
| 1 | `token` | Login/Register response | localStorage | `eyJhbGc...` |
| 2 | `sessionId` | Checkout response (extract from URL) | sessionStorage | `cs_test_abc123` |
| 4 | `transactionId` | Payment confirmation response | State/Storage | `pi_3ABC123...` |
| 5 | `donorId` | Donor API (search by transactionId) | State | `456` |
| 5 | `paymentId` | Payment API (search by transactionId) | State | `789` |

## 🔑 Critical IDs Explained

### userId
- **What**: User account identifier
- **When**: Created during registration
- **Where**: Stored in `User` table
- **Usage**: Links all records (donors, payments) to a user

### sessionId
- **What**: Stripe Checkout Session ID
- **When**: Created when checkout session is initialized
- **Where**: Stripe Dashboard, returned in `sessionUrl`
- **Usage**: Track payment session, verify payment status

### transactionId (paymentIntentId)
- **What**: Stripe Payment Intent ID
- **When**: Created when payment is processed
- **Where**: Stripe Dashboard, returned in payment confirmation
- **Usage**: Unique identifier for the payment transaction, stored in `Payment.transactionId`

### donorId (DonorRegistration.id)
- **What**: Donor registration record ID
- **When**: Created by webhook after payment completes
- **Where**: `DonorRegistration` table
- **Usage**: Reference donor registration, link to payments

### paymentId (Payment.id)
- **What**: Payment record ID
- **When**: Created by webhook after payment completes
- **Where**: `Payment` table
- **Usage**: Reference payment record, link to donor

## 🎯 Quick Code Snippets

### Extract sessionId from sessionUrl
```javascript
const sessionIdMatch = sessionUrl.match(/\/checkout\/session\/([^/?]+)/);
const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
```

### Find Donor and Payment by transactionId
```javascript
// 1. Get all payments
const payments = await axios.get('/api/payments', {
  headers: { Authorization: `Bearer ${token}` }
});

// 2. Find payment with matching transactionId
const payment = payments.data.data.find(
  p => p.transactionId === transactionId
);

// 3. Get donor using donorRegistrationId
if (payment) {
  const donor = await axios.get(`/api/donors/${payment.donorRegistrationId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Donor ID:', donor.data.data.id);
  console.log('Payment ID:', payment.id);
}
```

### Wait for Webhook Processing
```javascript
// Webhook processes asynchronously, wait 3-5 seconds
await new Promise(resolve => setTimeout(resolve, 3000));

// Then query for records
const result = await findDonorByTransactionId(transactionId);
```

## ⚠️ Common Pitfalls

1. **Missing panelId**: Webhook will fail if `donorInfo.panelId` is not provided
2. **Timing**: Don't query for `donorId`/`paymentId` immediately - wait 3-5 seconds
3. **Authentication**: Protected endpoints require `Authorization: Bearer {token}` header
4. **Service Fee**: Must be a positive number (backend converts to cents)

## 📝 Required Fields Checklist

### For Checkout Session (`/api/checkout`)
- ✅ `selectedServices[]` - Array with at least one service
- ✅ `selectedServices[].serviceFee` - Positive number
- ✅ `donorInfo.donorEmail` - Valid email
- ✅ `donorInfo.donorNameFirst` - String
- ✅ `donorInfo.donorNameLast` - String
- ✅ `donorInfo.panelId` - **REQUIRED** (webhook will fail without it)

### Optional but Recommended
- `donorInfo.donorSSN`
- `donorInfo.donorStateOfResidence`
- `donorInfo.donorDateOfBirth`
- `donorInfo.donorSex`
- `donorInfo.reasonForTest`
- `donorInfo.accountNo`
- `donorInfo.registrationExpirationDate`

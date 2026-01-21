# Donor & Payment API Integration - Quick Start

This guide provides a complete step-by-step integration for the donor registration and payment system with Stripe webhooks.

## 📚 Documentation Files

1. **INTEGRATION_GUIDE.md** - Complete detailed guide with all steps
2. **QUICK_REFERENCE.md** - Quick reference for ID tracking and common patterns
3. **examples/CompleteCheckoutExample.jsx** - Full React component example
4. **examples/frontend-services.js** - Complete API service functions

## 🚀 Quick Start (5 Steps)

### Step 1: Install Dependencies
```bash
npm install axios
# or
yarn add axios
```

### Step 2: Set Up API Base URL
```javascript
// In your .env.local or config
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Step 3: Copy Service Files
Copy `examples/frontend-services.js` to your project:
```bash
cp examples/frontend-services.js src/services/apiServices.js
```

### Step 4: Create Checkout Flow
```javascript
import { checkoutService } from '../services/apiServices';

// In your checkout component
const handleCheckout = async () => {
  const { sessionUrl, sessionId, user } = await checkoutService.createCheckoutSession(
    selectedServices,
    donorInfo
  );
  
  // Store IDs
  localStorage.setItem('sessionId', sessionId);
  
  // Redirect to Stripe
  window.location.href = sessionUrl;
};
```

### Step 5: Handle Confirmation
```javascript
import { stripeSessionService, donorService } from '../services/apiServices';

// In your confirmation page
const sessionId = searchParams.get('session_id');

// Wait for payment confirmation
const sessionData = await stripeSessionService.pollForPaymentConfirmation(sessionId);

// Wait 3-5 seconds for webhook, then get records
await new Promise(resolve => setTimeout(resolve, 3000));
const result = await donorService.findDonorByTransactionId(
  sessionData.paymentInfo.transactionId
);

console.log('Donor ID:', result.donor.id);
console.log('Payment ID:', result.payment.id);
```

## 🔑 Critical IDs to Track

| ID | When | Where | Purpose |
|---|---|---|---|
| `userId` | Login/Register | localStorage | User account |
| `sessionId` | Checkout created | sessionStorage | Stripe session |
| `transactionId` | Payment confirmed | State | Payment intent |
| `donorId` | Webhook processed | State | Donor record |
| `paymentId` | Webhook processed | State | Payment record |

## ⚠️ Important Requirements

1. **Panel ID is REQUIRED**: `donorInfo.panelId` must be provided
2. **Service Fee**: Must be a positive number
3. **Webhook Timing**: Wait 3-5 seconds before querying for `donorId`/`paymentId`
4. **Authentication**: Protected endpoints require `Authorization: Bearer {token}` header

## 📋 Required Fields for Checkout

```javascript
const donorInfo = {
  donorNameFirst: "John",        // ✅ Required
  donorNameLast: "Doe",          // ✅ Required
  donorEmail: "john@example.com", // ✅ Required
  panelId: "PANEL_123",          // ✅ REQUIRED (webhook fails without it)
  // ... other optional fields
};

const selectedServices = [
  {
    _id: "service_123",          // ✅ Required
    name: "Service Name",         // ✅ Required
    serviceFee: 49.99,            // ✅ Required (positive number)
  }
];
```

## 🔄 Complete Flow

```
1. User Login → Get userId, token
2. Create Checkout → Get sessionUrl, sessionId
3. Redirect to Stripe → User pays
4. Stripe redirects → /confirmation?session_id={id}
5. Verify Payment → Get transactionId
6. Wait 3-5 seconds → Webhook processes
7. Fetch Records → Get donorId, paymentId
```

## 📖 Full Documentation

For complete details, see:
- **INTEGRATION_GUIDE.md** - Step-by-step guide
- **QUICK_REFERENCE.md** - ID tracking reference
- **examples/** - Working code examples

## 🐛 Troubleshooting

### Webhook not processing?
- Check backend logs for webhook events
- Verify `STRIPE_WEBHOOK_SECRET` is set
- Wait 3-5 seconds before querying records

### Missing panelId error?
- Ensure `donorInfo.panelId` is provided
- Check that it's not empty or null

### Can't find donor/payment records?
- Wait longer (webhook processes asynchronously)
- Check authentication token is valid
- Verify transactionId matches

## 📞 API Endpoints Summary

### Public (No Auth)
- `POST /api/checkout` - Create checkout session
- `GET /api/stripe/session/:id` - Get session details

### Protected (Auth Required)
- `GET /api/donors` - List donors
- `GET /api/donors/:id` - Get donor
- `GET /api/payments` - List payments
- `GET /api/payments/:id` - Get payment

## ✅ Testing Checklist

- [ ] User can login/register
- [ ] Checkout session is created
- [ ] User can complete payment
- [ ] Payment confirmation works
- [ ] Donor record is created (after webhook)
- [ ] Payment record is created (after webhook)
- [ ] All IDs are tracked correctly

---

**Need more help?** See the full **INTEGRATION_GUIDE.md** for detailed explanations and examples.

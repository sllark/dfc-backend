/**
 * Helper script to generate a test Stripe webhook payload
 * This can be used to test webhooks in Postman
 * 
 * Usage: node scripts/generate-webhook-test.js
 */

const crypto = require('crypto');

// Your webhook secret from .env
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

// Sample checkout.session.completed event
const testEvent = {
    id: 'evt_test_webhook_' + Date.now(),
    object: 'event',
    api_version: '2020-08-27',
    created: Math.floor(Date.now() / 1000),
    data: {
        object: {
            id: 'cs_test_' + Date.now(),
            object: 'checkout.session',
            amount_total: 10000, // $100.00
            currency: 'usd',
            customer_email: 'test@example.com',
            payment_intent: 'pi_test_' + Date.now(),
            payment_status: 'paid',
            metadata: {
                userId: '1',
                donorEmail: 'test@example.com',
                donorInfo: JSON.stringify({
                    donorNameFirst: 'John',
                    donorNameLast: 'Doe',
                    donorEmail: 'test@example.com',
                    donorSSN: '123-45-6789',
                    donorStateOfResidence: 'CA',
                    reasonForTest: 'Employment',
                    accountNo: 'ACC123',
                    panelID: 'PANEL123',
                    registrationExpirationDate: '2025-12-31'
                }),
                services: JSON.stringify([
                    {
                        _id: 'service123',
                        name: 'Drug Test',
                        serviceFee: 100
                    }
                ])
            }
        }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
        id: 'req_test_' + Date.now(),
        idempotency_key: null
    },
    type: 'checkout.session.completed'
};

// Generate Stripe signature
function generateStripeSignature(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');
    
    return `t=${timestamp},v1=${signature}`;
}

// Convert event to JSON string
const payload = JSON.stringify(testEvent);

// Generate signature
const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

console.log('\n' + '='.repeat(80));
console.log('📋 STRIPE WEBHOOK TEST PAYLOAD FOR POSTMAN');
console.log('='.repeat(80));
console.log('\n📍 URL: http://localhost:3000/api/stripe/webhook');
console.log('📝 Method: POST\n');

console.log('📌 HEADERS:');
console.log('   Content-Type: application/json');
console.log(`   stripe-signature: ${signature}\n`);

console.log('📦 BODY (Raw JSON):');
console.log(payload);
console.log('\n' + '='.repeat(80));
console.log('\n💡 Copy the payload above and use it in Postman');
console.log('   Make sure to set the stripe-signature header!\n');

// Also save to file
const fs = require('fs');
const output = {
    url: 'http://localhost:3000/api/stripe/webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
    },
    body: testEvent
};

fs.writeFileSync('webhook-test-payload.json', JSON.stringify(output, null, 2));
console.log('✅ Saved to: webhook-test-payload.json\n');

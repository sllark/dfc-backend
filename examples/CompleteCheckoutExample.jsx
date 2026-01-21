/**
 * Complete Checkout Flow Example
 * 
 * This example demonstrates the complete integration flow:
 * 1. User authentication
 * 2. Creating Stripe checkout session
 * 3. Handling payment confirmation
 * 4. Tracking all IDs (userId, sessionId, transactionId, donorId, paymentId)
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ============================================================================
// STEP 1: CHECKOUT PAGE - Create Session and Redirect
// ============================================================================

export function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [donorInfo, setDonorInfo] = useState({
    donorNameFirst: '',
    donorNameLast: '',
    donorEmail: '',
    donorSSN: '',
    donorStateOfResidence: '',
    panelId: '', // ⚠️ REQUIRED
    reasonForTest: '',
  });
  
  const [selectedServices, setSelectedServices] = useState([
    {
      _id: 'service_123',
      name: '5-Panel Drug Test',
      serviceFee: 49.99,
    },
  ]);

  // Tracking IDs state
  const [trackingIds, setTrackingIds] = useState({
    userId: null,
    sessionId: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!donorInfo.panelId) {
        throw new Error('Panel ID is required');
      }
      if (!donorInfo.donorEmail) {
        throw new Error('Donor email is required');
      }
      if (!selectedServices || selectedServices.length === 0) {
        throw new Error('At least one service must be selected');
      }

      // Step 1: Create checkout session
      console.log('📝 Creating checkout session...');
      const response = await axios.post(
        `${API_BASE_URL}/checkout`,
        {
          selectedServices,
          donorInfo,
        }
      );

      const { sessionUrl, user } = response.data;

      // Extract sessionId from sessionUrl
      const sessionIdMatch = sessionUrl.match(/\/checkout\/session\/([^/?]+)/);
      const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

      // Store tracking IDs
      setTrackingIds({
        userId: user.id,
        sessionId: sessionId,
      });

      // Store in localStorage for confirmation page
      localStorage.setItem('checkoutSessionId', sessionId);
      localStorage.setItem('checkoutUserId', user.id.toString());
      
      // Store token if new user was created
      if (user.token) {
        localStorage.setItem('token', user.token);
        localStorage.setItem('userId', user.id.toString());
      }

      console.log('✅ Checkout session created:', {
        userId: user.id,
        sessionId: sessionId,
      });

      // Step 2: Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (err) {
      console.error('❌ Checkout error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create checkout session');
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      
      {error && (
        <div className="error" style={{ color: 'red', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label>First Name *</label>
          <input
            type="text"
            value={donorInfo.donorNameFirst}
            onChange={(e) => setDonorInfo({ ...donorInfo, donorNameFirst: e.target.value })}
            required
          />
        </div>

        <div>
          <label>Last Name *</label>
          <input
            type="text"
            value={donorInfo.donorNameLast}
            onChange={(e) => setDonorInfo({ ...donorInfo, donorNameLast: e.target.value })}
            required
          />
        </div>

        <div>
          <label>Email *</label>
          <input
            type="email"
            value={donorInfo.donorEmail}
            onChange={(e) => setDonorInfo({ ...donorInfo, donorEmail: e.target.value })}
            required
          />
        </div>

        <div>
          <label>Panel ID * (Required)</label>
          <input
            type="text"
            value={donorInfo.panelId}
            onChange={(e) => setDonorInfo({ ...donorInfo, panelId: e.target.value })}
            required
            placeholder="e.g., PANEL_123"
          />
        </div>

        <div>
          <label>State of Residence</label>
          <input
            type="text"
            value={donorInfo.donorStateOfResidence}
            onChange={(e) => setDonorInfo({ ...donorInfo, donorStateOfResidence: e.target.value })}
          />
        </div>

        <div>
          <label>Reason for Test</label>
          <input
            type="text"
            value={donorInfo.reasonForTest}
            onChange={(e) => setDonorInfo({ ...donorInfo, reasonForTest: e.target.value })}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </form>

      {/* Debug: Show tracking IDs */}
      {trackingIds.userId && (
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
          <strong>Tracking IDs:</strong>
          <pre>{JSON.stringify(trackingIds, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP 2: CONFIRMATION PAGE - Verify Payment and Retrieve IDs
// ============================================================================

export function ConfirmationPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [donorRecord, setDonorRecord] = useState(null);
  const [paymentRecord, setPaymentRecord] = useState(null);
  
  // Complete tracking IDs
  const [allTrackingIds, setAllTrackingIds] = useState({
    userId: null,
    sessionId: null,
    transactionId: null,
    donorId: null,
    paymentId: null,
  });

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    // Get stored userId
    const userId = localStorage.getItem('checkoutUserId');
    setAllTrackingIds(prev => ({
      ...prev,
      userId: userId ? parseInt(userId) : null,
      sessionId: sessionId,
    }));

    // Poll for payment confirmation
    const checkPaymentStatus = async () => {
      try {
        console.log('🔍 Checking payment status for session:', sessionId);
        
        const response = await axios.get(
          `${API_BASE_URL}/stripe/session/${sessionId}`
        );

        const { donorInfo, paymentInfo, session } = response.data;

        // Check if payment is completed
        if (session.payment_status === 'paid' && paymentInfo) {
          console.log('✅ Payment confirmed:', {
            transactionId: paymentInfo.transactionId,
            amount: paymentInfo.amount,
          });

          setPaymentData({
            sessionId: session.id,
            transactionId: paymentInfo.transactionId,
            amount: paymentInfo.amount,
            currency: paymentInfo.currency,
            paymentMethod: paymentInfo.paymentMethod,
            donorInfo,
          });

          // Update tracking IDs
          setAllTrackingIds(prev => ({
            ...prev,
            transactionId: paymentInfo.transactionId,
          }));

          // Wait for webhook to process (3-5 seconds)
          console.log('⏳ Waiting for webhook to process...');
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Now try to fetch donor and payment records
          await fetchDonorAndPayment(paymentInfo.transactionId);

          setLoading(false);
        } else {
          // Payment not completed yet, retry after 2 seconds
          console.log('⏳ Payment not completed yet, retrying...');
          setTimeout(checkPaymentStatus, 2000);
        }
      } catch (err) {
        console.error('❌ Error checking payment status:', err);
        // Retry on error (webhook might still be processing)
        setTimeout(checkPaymentStatus, 2000);
      }
    };

    // Function to fetch donor and payment records
    const fetchDonorAndPayment = async (transactionId) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No token found, cannot fetch donor/payment records');
          return;
        }

        console.log('🔍 Fetching donor and payment records...');

        // Get all payments
        const paymentsResponse = await axios.get(
          `${API_BASE_URL}/payments`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        // Find payment with matching transactionId
        const payment = paymentsResponse.data.data.find(
          p => p.transactionId === transactionId
        );

        if (payment) {
          console.log('✅ Payment record found:', {
            paymentId: payment.id,
            donorRegistrationId: payment.donorRegistrationId,
          });

          setPaymentRecord(payment);

          // Get the associated donor
          const donorResponse = await axios.get(
            `${API_BASE_URL}/donors/${payment.donorRegistrationId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          console.log('✅ Donor record found:', {
            donorId: donorResponse.data.data.id,
          });

          setDonorRecord(donorResponse.data.data);

          // Update complete tracking IDs
          setAllTrackingIds(prev => ({
            ...prev,
            donorId: donorResponse.data.data.id,
            paymentId: payment.id,
          }));
        } else {
          console.warn('⚠️ Payment record not found yet, webhook may still be processing');
          // Retry after 2 more seconds
          setTimeout(() => fetchDonorAndPayment(transactionId), 2000);
        }
      } catch (err) {
        console.error('❌ Error fetching donor/payment:', err);
        // Retry after 2 seconds
        setTimeout(() => fetchDonorAndPayment(transactionId), 2000);
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
    return (
      <div className="confirmation-page">
        <h1>Processing your payment...</h1>
        <p>Please wait while we confirm your payment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="confirmation-page">
        <h1>Error</h1>
        <div className="error" style={{ color: 'red' }}>{error}</div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="confirmation-page">
        <h1>Waiting for payment confirmation...</h1>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <h1>✅ Payment Successful!</h1>
      
      <div className="payment-summary">
        <h2>Payment Details</h2>
        <p><strong>Transaction ID:</strong> {paymentData.transactionId}</p>
        <p><strong>Amount:</strong> ${paymentData.amount} {paymentData.currency}</p>
        <p><strong>Payment Method:</strong> {paymentData.paymentMethod}</p>
        <p><strong>Session ID:</strong> {paymentData.sessionId}</p>
      </div>

      {donorRecord && (
        <div className="donor-summary">
          <h2>Donor Information</h2>
          <p><strong>Donor ID:</strong> {donorRecord.id}</p>
          <p><strong>Name:</strong> {donorRecord.donorNameFirst} {donorRecord.donorNameLast}</p>
          <p><strong>Email:</strong> {donorRecord.donorEmail}</p>
          <p><strong>Status:</strong> {donorRecord.status}</p>
        </div>
      )}

      {paymentRecord && (
        <div className="payment-record-summary">
          <h2>Payment Record</h2>
          <p><strong>Payment ID:</strong> {paymentRecord.id}</p>
          <p><strong>Status:</strong> {paymentRecord.status}</p>
          <p><strong>Created At:</strong> {new Date(paymentRecord.createdAt).toLocaleString()}</p>
        </div>
      )}

      {/* Complete Tracking IDs Display */}
      <div className="tracking-ids" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f5f5f5' }}>
        <h3>📊 Complete ID Tracking</h3>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(allTrackingIds, null, 2)}
        </pre>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          All IDs have been successfully tracked and linked:
          <br />
          • <strong>userId</strong> → Links to user account
          <br />
          • <strong>sessionId</strong> → Stripe checkout session
          <br />
          • <strong>transactionId</strong> → Stripe payment intent
          <br />
          • <strong>donorId</strong> → Donor registration record
          <br />
          • <strong>paymentId</strong> → Payment record
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * In your Next.js app:
 * 
 * // pages/checkout.jsx
 * import { CheckoutPage } from '../examples/CompleteCheckoutExample';
 * export default CheckoutPage;
 * 
 * // pages/confirmation.jsx
 * import { ConfirmationPage } from '../examples/CompleteCheckoutExample';
 * export default ConfirmationPage;
 */

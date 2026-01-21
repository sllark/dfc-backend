/**
 * Frontend API Services
 * 
 * Complete set of service functions for integrating with the donor and payment APIs
 * Includes ID tracking and error handling
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

export const authService = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{userId: number, token: string, user: object}>}
   */
  async login(email, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email,
        password,
      });

      const { token, user } = response.data;

      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id.toString());

      return {
        userId: user.id,
        token,
        user,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  /**
   * Register new user
   * @param {string} username - Username
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{userId: number, token: string, user: object}>}
   */
  async register(username, email, password) {
    try {
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
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  /**
   * Get stored authentication token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('token');
  },

  /**
   * Get stored user ID
   * @returns {number|null}
   */
  getUserId() {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId) : null;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Logout user (clear stored data)
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  },
};

// ============================================================================
// CHECKOUT SERVICE
// ============================================================================

export const checkoutService = {
  /**
   * Create Stripe checkout session
   * @param {Array} selectedServices - Array of service objects
   * @param {Object} donorInfo - Donor information object
   * @returns {Promise<{sessionUrl: string, sessionId: string, user: object}>}
   */
  async createCheckoutSession(selectedServices, donorInfo) {
    try {
      // Validate required fields
      if (!donorInfo?.donorEmail) {
        throw new Error('Donor email is required');
      }
      if (!donorInfo?.panelId) {
        throw new Error('Panel ID is required');
      }
      if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
        throw new Error('At least one service must be selected');
      }

      // Validate service fees
      selectedServices.forEach((svc, index) => {
        const fee = Number(svc.serviceFee ?? svc.price ?? svc.amount ?? svc.fee ?? 0);
        if (isNaN(fee) || fee <= 0) {
          throw new Error(
            `Invalid serviceFee for service at index ${index}. ` +
            `Service must have a valid 'serviceFee', 'price', 'amount', or 'fee' field.`
          );
        }
      });

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

      // Extract sessionId from sessionUrl
      const sessionIdMatch = sessionUrl.match(/\/checkout\/session\/([^/?]+)/);
      const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

      // Store user data if new user was created
      if (user && user.token) {
        localStorage.setItem('token', user.token);
        localStorage.setItem('userId', user.id.toString());
      }

      // Store sessionId for tracking
      if (sessionId) {
        sessionStorage.setItem('currentSessionId', sessionId);
      }

      return {
        sessionUrl,
        sessionId,
        user, // Contains userId, token, etc.
      };
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to create checkout session'
      );
    }
  },
};

// ============================================================================
// STRIPE SESSION SERVICE
// ============================================================================

export const stripeSessionService = {
  /**
   * Get Stripe session details
   * @param {string} sessionId - Stripe checkout session ID
   * @returns {Promise<{donorInfo: object, paymentInfo: object, session: object}>}
   */
  async getSession(sessionId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/stripe/session/${sessionId}`
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch session details'
      );
    }
  },

  /**
   * Poll for payment confirmation
   * @param {string} sessionId - Stripe checkout session ID
   * @param {number} maxAttempts - Maximum number of polling attempts
   * @param {number} intervalMs - Polling interval in milliseconds
   * @returns {Promise<{donorInfo: object, paymentInfo: object, session: object}>}
   */
  async pollForPaymentConfirmation(sessionId, maxAttempts = 15, intervalMs = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const data = await this.getSession(sessionId);

        if (data.session.payment_status === 'paid' && data.paymentInfo) {
          return data;
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.warn(`Polling attempt ${attempt} failed:`, error.message);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    }

    throw new Error('Payment confirmation timeout. Please check your email or contact support.');
  },
};

// ============================================================================
// DONOR SERVICE
// ============================================================================

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication required. Please login first.');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const donorService = {
  /**
   * Get all donor registrations
   * @param {number} page - Page number (default: 1)
   * @param {number} perPage - Items per page (default: 10)
   * @param {string} search - Search query (optional)
   * @param {string} status - Filter by status (optional)
   * @returns {Promise<{data: Array, total: number, meta: object}>}
   */
  async getAllDonors(page = 1, perPage = 10, search = null, status = null) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response = await axios.get(
        `${API_BASE_URL}/donors?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching donors:', error);
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch donors'
      );
    }
  },

  /**
   * Get donor by ID
   * @param {number} donorId - Donor registration ID
   * @returns {Promise<object>}
   */
  async getDonorById(donorId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/donors/${donorId}`,
        { headers: getAuthHeaders() }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error fetching donor:', error);
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch donor'
      );
    }
  },

  /**
   * Create donor registration (manual - usually done via webhook)
   * @param {Object} donorData - Donor registration data
   * @returns {Promise<object>}
   */
  async createDonor(donorData) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/donors/donor-registration`,
        donorData,
        { headers: getAuthHeaders() }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error creating donor:', error);
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Failed to create donor'
      );
    }
  },

  /**
   * Find donor by transaction ID
   * @param {string} transactionId - Stripe payment intent ID
   * @returns {Promise<{donor: object, payment: object}|null>}
   */
  async findDonorByTransactionId(transactionId) {
    try {
      // First, get all payments
      const paymentsResponse = await axios.get(
        `${API_BASE_URL}/payments`,
        { headers: getAuthHeaders() }
      );

      // Find payment with matching transactionId
      const payment = paymentsResponse.data.data.find(
        p => p.transactionId === transactionId
      );

      if (!payment) {
        return null;
      }

      // Get the associated donor
      const donor = await this.getDonorById(payment.donorRegistrationId);

      return {
        donor,
        payment,
      };
    } catch (error) {
      console.error('Error finding donor by transaction ID:', error);
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Failed to find donor by transaction ID'
      );
    }
  },
};

// ============================================================================
// PAYMENT SERVICE
// ============================================================================

export const paymentService = {
  /**
   * Get all payments
   * @param {number} page - Page number (default: 1)
   * @param {number} perPage - Items per page (default: 10)
   * @param {string} status - Filter by status (optional)
   * @returns {Promise<{data: Array, total: number, meta: object}>}
   */
  async getAllPayments(page = 1, perPage = 10, status = null) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
      });
      if (status) params.append('status', status);

      const response = await axios.get(
        `${API_BASE_URL}/payments?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch payments'
      );
    }
  },

  /**
   * Get payment by ID
   * @param {number} paymentId - Payment ID
   * @returns {Promise<object>}
   */
  async getPaymentById(paymentId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/${paymentId}`,
        { headers: getAuthHeaders() }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch payment'
      );
    }
  },

  /**
   * Find payment by transaction ID
   * @param {string} transactionId - Stripe payment intent ID
   * @returns {Promise<object|null>}
   */
  async findPaymentByTransactionId(transactionId) {
    try {
      const payments = await this.getAllPayments(1, 100); // Get first 100 payments
      return payments.data.find(p => p.transactionId === transactionId) || null;
    } catch (error) {
      console.error('Error finding payment by transaction ID:', error);
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Failed to find payment by transaction ID'
      );
    }
  },
};

// ============================================================================
// ID TRACKING UTILITY
// ============================================================================

export const idTrackingService = {
  /**
   * Get all tracking IDs for a completed payment
   * @param {string} sessionId - Stripe checkout session ID
   * @param {number} maxWaitMs - Maximum time to wait for webhook (default: 10000ms)
   * @returns {Promise<{userId: number, sessionId: string, transactionId: string, donorId: number, paymentId: number}>}
   */
  async getAllTrackingIds(sessionId, maxWaitMs = 10000) {
    const trackingIds = {
      userId: null,
      sessionId: sessionId,
      transactionId: null,
      donorId: null,
      paymentId: null,
    };

    try {
      // Get userId from storage
      trackingIds.userId = authService.getUserId();

      // Get session details to get transactionId
      const sessionData = await stripeSessionService.pollForPaymentConfirmation(sessionId);
      trackingIds.transactionId = sessionData.paymentInfo.transactionId;

      // Wait for webhook to process
      const startTime = Date.now();
      let found = false;

      while (!found && (Date.now() - startTime) < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const result = await donorService.findDonorByTransactionId(trackingIds.transactionId);
          
          if (result) {
            trackingIds.donorId = result.donor.id;
            trackingIds.paymentId = result.payment.id;
            found = true;
          }
        } catch (error) {
          // Continue polling
        }
      }

      if (!found) {
        console.warn('⚠️ Could not find donor/payment records. Webhook may still be processing.');
      }

      return trackingIds;
    } catch (error) {
      console.error('Error getting tracking IDs:', error);
      throw error;
    }
  },

  /**
   * Store tracking IDs in localStorage
   * @param {Object} trackingIds - Tracking IDs object
   */
  storeTrackingIds(trackingIds) {
    Object.keys(trackingIds).forEach(key => {
      if (trackingIds[key] !== null) {
        localStorage.setItem(`tracking_${key}`, trackingIds[key].toString());
      }
    });
  },

  /**
   * Get stored tracking IDs from localStorage
   * @returns {Object}
   */
  getStoredTrackingIds() {
    return {
      userId: localStorage.getItem('tracking_userId') ? parseInt(localStorage.getItem('tracking_userId')) : null,
      sessionId: localStorage.getItem('tracking_sessionId'),
      transactionId: localStorage.getItem('tracking_transactionId'),
      donorId: localStorage.getItem('tracking_donorId') ? parseInt(localStorage.getItem('tracking_donorId')) : null,
      paymentId: localStorage.getItem('tracking_paymentId') ? parseInt(localStorage.getItem('tracking_paymentId')) : null,
    };
  },
};

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================

export default {
  authService,
  checkoutService,
  stripeSessionService,
  donorService,
  paymentService,
  idTrackingService,
};

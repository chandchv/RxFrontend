import axios from './axios';

/**
 * Fetch all bills for the current patient
 * @returns {Promise} - Promise resolving to bills data
 */
export const getPatientBills = async () => {
  try {
    const response = await axios.get('/billing/api/patient/me/bills/');
    return response.data;
  } catch (error) {
    console.error('Error fetching patient bills:', error);
    throw error;
  }
};

/**
 * Fetch a specific bill by ID
 * @param {number} billId - The ID of the bill to fetch
 * @returns {Promise} - Promise resolving to bill details
 */
export const getBillDetails = async (billId) => {
  try {
    const response = await axios.get(`/billing/api/bills/${billId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching bill details:', error);
    throw error;
  }
};

/**
 * Download bill PDF
 * @param {number} billId - The ID of the bill to download
 * @returns {Promise} - Promise resolving to PDF URL
 */
export const downloadBillPdf = async (billId) => {
  try {
    const response = await axios.get(`/billing/api/bills/${billId}/download/`);
    return response.data.pdf_url;
  } catch (error) {
    console.error('Error downloading bill PDF:', error);
    throw error;
  }
};

/**
 * Initiate payment for an appointment
 * @param {number} appointmentId - The ID of the appointment to pay for
 * @returns {Promise} - Promise resolving to payment intent details
 */
export const initiateAppointmentPayment = async (appointmentId) => {
  try {
    const response = await axios.post('/billing/api/appointments/payment/initiate/', {
      appointment_id: appointmentId
    });
    return response.data;
  } catch (error) {
    console.error('Error initiating appointment payment:', error);
    throw error;
  }
};

/**
 * Confirm payment for an appointment
 * @param {number} appointmentId - The ID of the appointment
 * @param {string} paymentIntentId - The payment intent ID from the payment gateway
 * @returns {Promise} - Promise resolving to confirmation details
 */
export const confirmAppointmentPayment = async (appointmentId, paymentIntentId) => {
  try {
    const response = await axios.post('/billing/api/appointments/payment/confirm/', {
      appointment_id: appointmentId,
      payment_intent_id: paymentIntentId
    });
    return response.data;
  } catch (error) {
    console.error('Error confirming appointment payment:', error);
    throw error;
  }
};

/**
 * Pay balance for a bill
 * @param {number} billId - The ID of the bill
 * @param {string} paymentIntentId - The payment intent ID from the payment gateway
 * @returns {Promise} - Promise resolving to payment details
 */
export const payBillBalance = async (billId, paymentIntentId) => {
  try {
    const response = await axios.post(`/billing/api/bills/${billId}/pay_balance/`, {
      payment_intent_id: paymentIntentId
    });
    return response.data;
  } catch (error) {
    console.error('Error paying bill balance:', error);
    throw error;
  }
};

/**
 * Fetch billing summary for a doctor
 * @param {Object} dateRange - Optional date range parameters
 * @param {string} dateRange.fromDate - Start date in ISO format
 * @param {string} dateRange.toDate - End date in ISO format
 * @returns {Promise} - Promise resolving to billing summary data
 */
export const getDoctorBillingSummary = async (dateRange = {}) => {
  try {
    const { fromDate, toDate } = dateRange;
    let url = '/billing/api/doctor/me/billing-summary/';
    
    if (fromDate || toDate) {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching doctor billing summary:', error);
    throw error;
  }
};

/**
 * Generate provisional invoice for an appointment
 * @param {number} appointmentId - The ID of the appointment
 * @returns {Promise} - Promise resolving to the generated invoice
 */
export const generateProvisionalInvoice = async (appointmentId) => {
  try {
    const response = await axios.post('/billing/api/appointments/invoice/generate/', {
      appointment_id: appointmentId
    });
    return response.data;
  } catch (error) {
    console.error('Error generating provisional invoice:', error);
    throw error;
  }
};

/**
 * Finalize an invoice and prepare for payment
 * @param {number} billId - The ID of the bill to finalize
 * @param {Array} addedItems - Optional additional items to add to the bill
 * @returns {Promise} - Promise resolving to the finalized invoice and payment details
 */
export const finalizeInvoice = async (billId, addedItems = []) => {
  try {
    const response = await axios.post(`/billing/api/bills/${billId}/finalize/`, {
      items: addedItems
    });
    return response.data;
  } catch (error) {
    console.error('Error finalizing invoice:', error);
    throw error;
  }
}; 
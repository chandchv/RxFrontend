import axios from './axios';

/**
 * Fetch all prescriptions for the current patient
 * @returns {Promise} - Promise resolving to prescriptions data
 */
export const getPatientPrescriptions = async () => {
  try {
    const response = await axios.get('/pharmacy/api/patient/me/prescriptions/');
    return response.data;
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    throw error;
  }
};

/**
 * Fetch a specific prescription by ID
 * @param {number} prescriptionId - The ID of the prescription to fetch
 * @returns {Promise} - Promise resolving to prescription details
 */
export const getPrescriptionDetails = async (prescriptionId) => {
  try {
    const response = await axios.get(`/pharmacy/api/prescriptions/${prescriptionId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching prescription details:', error);
    throw error;
  }
};

/**
 * Fetch all pharmacies
 * @returns {Promise} - Promise resolving to pharmacies data
 */
export const getPharmacies = async () => {
  try {
    const response = await axios.get('/pharmacy/api/pharmacies/');
    return response.data;
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    throw error;
  }
};

/**
 * Fetch pharmacy details
 * @param {number} pharmacyId - The ID of the pharmacy
 * @returns {Promise} - Promise resolving to pharmacy details
 */
export const getPharmacyDetails = async (pharmacyId) => {
  try {
    const response = await axios.get(`/pharmacy/api/pharmacies/${pharmacyId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching pharmacy details:', error);
    throw error;
  }
};

/**
 * Check medicine availability at a pharmacy
 * @param {number} pharmacyId - The ID of the pharmacy
 * @param {number} medicineId - The ID of the medicine to check
 * @returns {Promise} - Promise resolving to availability details
 */
export const checkMedicineAvailability = async (pharmacyId, medicineId) => {
  try {
    const response = await axios.get(`/pharmacy/api/pharmacies/${pharmacyId}/check-availability/${medicineId}/`);
    return response.data;
  } catch (error) {
    console.error('Error checking medicine availability:', error);
    throw error;
  }
};

/**
 * Request medication delivery from a pharmacy
 * @param {number} prescriptionId - The ID of the prescription
 * @param {number} pharmacyId - The ID of the pharmacy
 * @param {Object} deliveryDetails - Delivery address and contact details
 * @returns {Promise} - Promise resolving to delivery request details
 */
export const requestMedicationDelivery = async (prescriptionId, pharmacyId, deliveryDetails) => {
  try {
    const response = await axios.post('/pharmacy/api/delivery/request/', {
      prescription_id: prescriptionId,
      pharmacy_id: pharmacyId,
      delivery_details: deliveryDetails
    });
    return response.data;
  } catch (error) {
    console.error('Error requesting medication delivery:', error);
    throw error;
  }
};

/**
 * Get pharmacy dashboard data (for pharmacy staff)
 * @returns {Promise} - Promise resolving to pharmacy dashboard data
 */
export const getPharmacyDashboard = async () => {
  try {
    const response = await axios.get('/pharmacy/api/staff/dashboard/');
    return response.data;
  } catch (error) {
    console.error('Error fetching pharmacy dashboard:', error);
    throw error;
  }
};

/**
 * Get pharmacy inventory data (for pharmacy staff)
 * @returns {Promise} - Promise resolving to pharmacy inventory data
 */
export const getPharmacyInventory = async () => {
  try {
    const response = await axios.get('/pharmacy/api/staff/inventory/');
    return response.data;
  } catch (error) {
    console.error('Error fetching pharmacy inventory:', error);
    throw error;
  }
};

/**
 * Update pharmacy stock (for pharmacy staff)
 * @param {Object} stockData - The stock data to update
 * @returns {Promise} - Promise resolving to updated stock data
 */
export const updatePharmacyStock = async (stockData) => {
  try {
    const response = await axios.post('/pharmacy/api/staff/inventory/update/', stockData);
    return response.data;
  } catch (error) {
    console.error('Error updating pharmacy stock:', error);
    throw error;
  }
};

/**
 * Get pending prescriptions for a pharmacy (for pharmacy staff)
 * @returns {Promise} - Promise resolving to pending prescriptions data
 */
export const getPendingPrescriptions = async () => {
  try {
    const response = await axios.get('/pharmacy/api/staff/prescriptions/pending/');
    return response.data;
  } catch (error) {
    console.error('Error fetching pending prescriptions:', error);
    throw error;
  }
};

/**
 * Process a prescription (for pharmacy staff)
 * @param {number} prescriptionId - The ID of the prescription to process
 * @param {Object} processingDetails - Details about the processing
 * @returns {Promise} - Promise resolving to processed prescription data
 */
export const processPrescription = async (prescriptionId, processingDetails) => {
  try {
    const response = await axios.post(`/pharmacy/api/staff/prescriptions/${prescriptionId}/process/`, processingDetails);
    return response.data;
  } catch (error) {
    console.error('Error processing prescription:', error);
    throw error;
  }
}; 
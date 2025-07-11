import axios from './axios';

/**
 * Fetch all lab tests for the current patient
 * @returns {Promise} - Promise resolving to lab tests data
 */
export const getPatientLabTests = async () => {
  try {
    const response = await axios.get('/labs/api/patient/me/lab-orders/');
    return response.data;
  } catch (error) {
    console.error('Error fetching patient lab tests:', error);
    throw error;
  }
};

/**
 * Fetch lab test details by ID
 * @param {number} labOrderId - The ID of the lab order to fetch
 * @returns {Promise} - Promise resolving to lab test details
 */
export const getLabOrderDetails = async (labOrderId) => {
  try {
    const response = await axios.get(`/labs/api/lab-orders/${labOrderId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lab order details:', error);
    throw error;
  }
};

/**
 * Fetch lab test result by ID
 * @param {number} resultId - The ID of the lab result to fetch
 * @returns {Promise} - Promise resolving to lab result details
 */
export const getLabResultDetails = async (resultId) => {
  try {
    const response = await axios.get(`/labs/api/lab-results/${resultId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lab result details:', error);
    throw error;
  }
};

/**
 * Fetch all available lab profiles
 * @returns {Promise} - Promise resolving to lab profiles data
 */
export const getLabProfiles = async () => {
  try {
    const response = await axios.get('/labs/api/lab-profiles/');
    return response.data;
  } catch (error) {
    console.error('Error fetching lab profiles:', error);
    throw error;
  }
};

/**
 * Fetch lab profile details
 * @param {number} labProfileId - The ID of the lab profile
 * @returns {Promise} - Promise resolving to lab profile details
 */
export const getLabProfileDetails = async (labProfileId) => {
  try {
    const response = await axios.get(`/labs/api/lab-profiles/${labProfileId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lab profile details:', error);
    throw error;
  }
};

/**
 * Fetch all available test definitions
 * @returns {Promise} - Promise resolving to test definitions data
 */
export const getTestDefinitions = async () => {
  try {
    const response = await axios.get('/labs/api/test-definitions/');
    return response.data;
  } catch (error) {
    console.error('Error fetching test definitions:', error);
    throw error;
  }
};

/**
 * Book a lab test
 * @param {Object} bookingDetails - The booking details
 * @returns {Promise} - Promise resolving to booking confirmation details
 */
export const bookLabTest = async (bookingDetails) => {
  try {
    const response = await axios.post('/labs/api/lab-orders/book/', bookingDetails);
    return response.data;
  } catch (error) {
    console.error('Error booking lab test:', error);
    throw error;
  }
};

/**
 * Choose a lab for a lab order
 * @param {number} labOrderId - The ID of the lab order
 * @param {number} labProfileId - The ID of the chosen lab
 * @returns {Promise} - Promise resolving to updated lab order
 */
export const chooseLabForOrder = async (labOrderId, labProfileId) => {
  try {
    const response = await axios.post(`/labs/api/lab-orders/${labOrderId}/choose-lab/`, {
      lab_profile_id: labProfileId
    });
    return response.data;
  } catch (error) {
    console.error('Error choosing lab for order:', error);
    throw error;
  }
};

/**
 * Get lab dashboard data (for lab staff)
 * @returns {Promise} - Promise resolving to lab dashboard data
 */
export const getLabDashboard = async () => {
  try {
    const response = await axios.get('/labs/api/staff/dashboard/');
    return response.data;
  } catch (error) {
    console.error('Error fetching lab dashboard:', error);
    throw error;
  }
};

/**
 * Get pending lab orders (for lab staff)
 * @returns {Promise} - Promise resolving to pending lab orders data
 */
export const getPendingLabOrders = async () => {
  try {
    const response = await axios.get('/labs/api/staff/lab-orders/pending/');
    return response.data;
  } catch (error) {
    console.error('Error fetching pending lab orders:', error);
    throw error;
  }
};

/**
 * Update lab order status (for lab staff)
 * @param {number} labOrderId - The ID of the lab order
 * @param {Object} statusUpdate - The status update data
 * @returns {Promise} - Promise resolving to updated lab order
 */
export const updateLabOrderStatus = async (labOrderId, statusUpdate) => {
  try {
    const response = await axios.post(`/labs/api/staff/lab-orders/${labOrderId}/update-status/`, statusUpdate);
    return response.data;
  } catch (error) {
    console.error('Error updating lab order status:', error);
    throw error;
  }
};

/**
 * Upload lab result (for lab staff)
 * @param {number} labOrderId - The ID of the lab order
 * @param {Object} resultData - The result data
 * @returns {Promise} - Promise resolving to lab result details
 */
export const uploadLabResult = async (labOrderId, resultData) => {
  try {
    const formData = new FormData();
    
    // Add result file if provided
    if (resultData.resultFile) {
      formData.append('result_file', resultData.resultFile);
    }
    
    // Add structured result if provided
    if (resultData.structuredResult) {
      formData.append('structured_result', JSON.stringify(resultData.structuredResult));
    }
    
    // Add lab metadata if provided
    if (resultData.labMetadata) {
      formData.append('lab_metadata', JSON.stringify(resultData.labMetadata));
    }
    
    const response = await axios.post(
      `/labs/api/staff/lab-orders/${labOrderId}/upload-result/`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error uploading lab result:', error);
    throw error;
  }
}; 
import apiClient from './apiClient';
import { handleApiError } from '../utils/errorUtils';

class PrescriptionService {
  /**
   * Get list of prescriptions with filtering options
   */
  async getPrescriptions(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.pageSize) params.append('page_size', filters.pageSize);
      
      const response = await apiClient.get(`/pharmacy/api/mobile/prescriptions/?${params}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get prescription details by ID
   */
  async getPrescriptionDetail(prescriptionId) {
    try {
      const response = await apiClient.get(`/pharmacy/api/mobile/prescriptions/${prescriptionId}/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get prescription status and tracking information
   */
  async getPrescriptionStatus(prescriptionId) {
    try {
      const response = await apiClient.get(`/pharmacy/api/mobile/prescriptions/${prescriptionId}/status/`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get prescription history with time period filtering
   */
  async getPrescriptionHistory(period = 'all') {
    try {
      const response = await apiClient.get(`/pharmacy/api/mobile/prescriptions/history/?period=${period}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get prescription statistics
   */
  async getPrescriptionStats() {
    try {
      const response = await apiClient.get('/pharmacy/api/mobile/prescriptions/stats/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Request prescription refill
   */
  async requestRefill(prescriptionId, refillData) {
    try {
      const response = await apiClient.post(
        `/pharmacy/api/mobile/prescriptions/${prescriptionId}/request-refill/`,
        refillData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get nearby pharmacies
   */
  async getNearbyPharmacies(location = {}) {
    try {
      const params = new URLSearchParams();
      
      if (location.latitude) params.append('latitude', location.latitude);
      if (location.longitude) params.append('longitude', location.longitude);
      if (location.radius) params.append('radius', location.radius);
      
      const response = await apiClient.get(`/pharmacy/api/mobile/pharmacies/nearby/?${params}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get prescription status options for filtering
   */
  getStatusOptions() {
    return [
      { value: 'new', label: 'New' },
      { value: 'processing', label: 'Processing' },
      { value: 'partially_dispensed', label: 'Partially Dispensed' },
      { value: 'fully_dispensed', label: 'Fully Dispensed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'expired', label: 'Expired' }
    ];
  }

  /**
   * Get time period options for history filtering
   */
  getTimePeriodOptions() {
    return [
      { value: 'all', label: 'All Time' },
      { value: 'week', label: 'Last Week' },
      { value: 'month', label: 'Last Month' },
      { value: 'year', label: 'Last Year' }
    ];
  }

  /**
   * Format prescription status for display
   */
  formatStatus(status) {
    const statusMap = {
      'new': { label: 'New', color: '#2196F3' },
      'processing': { label: 'Processing', color: '#FF9800' },
      'partially_dispensed': { label: 'Partially Dispensed', color: '#FF5722' },
      'fully_dispensed': { label: 'Fully Dispensed', color: '#4CAF50' },
      'cancelled': { label: 'Cancelled', color: '#9E9E9E' },
      'expired': { label: 'Expired', color: '#F44336' }
    };
    
    return statusMap[status] || { label: status, color: '#9E9E9E' };
  }

  /**
   * Calculate prescription progress percentage
   */
  calculateProgress(prescription) {
    if (!prescription.prescription_drugs || prescription.prescription_drugs.length === 0) {
      return 0;
    }

    const totalDrugs = prescription.prescription_drugs.length;
    const fullyDispensedDrugs = prescription.prescription_drugs.filter(
      drug => drug.is_fully_dispensed
    ).length;

    return Math.round((fullyDispensedDrugs / totalDrugs) * 100);
  }

  /**
   * Check if prescription is eligible for refill
   */
  isEligibleForRefill(prescription) {
    return prescription.status === 'fully_dispensed' && 
           !prescription.is_expired &&
           prescription.status !== 'cancelled';
  }

  /**
   * Get prescription urgency level
   */
  getUrgencyLevel(prescription) {
    if (prescription.is_expired) {
      return { level: 'expired', label: 'Expired', color: '#F44336' };
    }

    const expiryDate = new Date(prescription.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 7) {
      return { level: 'urgent', label: 'Expires Soon', color: '#FF5722' };
    } else if (daysUntilExpiry <= 30) {
      return { level: 'moderate', label: 'Expires This Month', color: '#FF9800' };
    } else {
      return { level: 'normal', label: 'Active', color: '#4CAF50' };
    }
  }

  /**
   * Scan prescription using OCR
   */
  async scanPrescription(imageFile, options = {}) {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageFile.uri,
        type: imageFile.type || 'image/jpeg',
        name: imageFile.name || 'prescription.jpg'
      });
      
      if (options.useTextract !== undefined) {
        formData.append('use_textract', options.useTextract);
      }

      const response = await apiClient.post(
        '/pharmacy/api/mobile/prescriptions/scan/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60 seconds for OCR processing
        }
      );
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Validate extracted prescription data
   */
  validateExtractedData(extractedData) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      completeness: 0
    };

    const requiredFields = ['patient_info', 'doctor_info', 'medications'];
    const completedFields = [];

    // Check patient information
    if (extractedData.patient_info?.name) {
      completedFields.push('patient_info');
    } else {
      validationResults.errors.push('Patient name is required');
      validationResults.isValid = false;
    }

    // Check doctor information
    if (extractedData.doctor_info?.name) {
      completedFields.push('doctor_info');
    } else {
      validationResults.warnings.push('Doctor information is incomplete');
    }

    // Check medications
    if (extractedData.medications?.length > 0) {
      completedFields.push('medications');
      
      // Validate each medication
      extractedData.medications.forEach((med, index) => {
        if (!med.name) {
          validationResults.errors.push(`Medication ${index + 1}: Name is required`);
          validationResults.isValid = false;
        }
        if (!med.dosage) {
          validationResults.warnings.push(`Medication ${index + 1}: Dosage information is missing`);
        }
      });
    } else {
      validationResults.errors.push('At least one medication is required');
      validationResults.isValid = false;
    }

    // Calculate completeness percentage
    validationResults.completeness = Math.round(
      (completedFields.length / requiredFields.length) * 100
    );

    return validationResults;
  }

  /**
   * Get medication suggestions based on extracted text
   */
  getMedicationSuggestions(medicationName) {
    // This would typically call an API to get medication suggestions
    // For now, return a mock response
    const commonMedications = [
      'Paracetamol', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Metformin',
      'Lisinopril', 'Atorvastatin', 'Omeprazole', 'Amlodipine', 'Simvastatin'
    ];

    if (!medicationName) return [];

    return commonMedications.filter(med => 
      med.toLowerCase().includes(medicationName.toLowerCase())
    ).slice(0, 5);
  }

  /**
   * Format dosage instructions for display
   */
  formatDosageInstructions(instructions) {
    if (!instructions) return 'No instructions provided';
    
    // Common abbreviations and their expansions
    const abbreviations = {
      'bid': 'twice daily',
      'tid': 'three times daily',
      'qid': 'four times daily',
      'qd': 'once daily',
      'prn': 'as needed',
      'po': 'by mouth',
      'mg': 'milligrams',
      'ml': 'milliliters'
    };

    let formatted = instructions.toLowerCase();
    Object.keys(abbreviations).forEach(abbrev => {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      formatted = formatted.replace(regex, abbreviations[abbrev]);
    });

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}

export default new PrescriptionService();
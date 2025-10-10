import apiClient from './apiClient';
import { handleApiError } from '../utils/errorUtils';

class AppointmentService {
  /**
   * Get appointments list with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} API response
   */
  async getAppointments(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add filter parameters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await apiClient.get(`/scheduling/api/mobile/appointments/?${params.toString()}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get appointment details
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} API response
   */
  async getAppointmentDetail(appointmentId) {
    try {
      const response = await apiClient.get(`/scheduling/api/mobile/appointments/${appointmentId}/`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Create a new appointment
   * @param {Object} appointmentData - Appointment data
   * @returns {Promise<Object>} API response
   */
  async createAppointment(appointmentData) {
    try {
      const response = await apiClient.post('/scheduling/api/mobile/appointments/create/', appointmentData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Update an existing appointment
   * @param {string} appointmentId - Appointment ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} API response
   */
  async updateAppointment(appointmentId, updateData) {
    try {
      const response = await apiClient.put(`/scheduling/api/mobile/appointments/${appointmentId}/update/`, updateData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Cancel an appointment
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} API response
   */
  async cancelAppointment(appointmentId) {
    try {
      const response = await apiClient.delete(`/scheduling/api/mobile/appointments/${appointmentId}/cancel/`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get available appointment slots
   * @param {Object} params - Parameters (doctor_id, date, appointment_type_id)
   * @returns {Promise<Object>} API response
   */
  async getAvailableSlots(params) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const response = await apiClient.get(`/scheduling/api/mobile/available-slots/?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get appointment types
   * @returns {Promise<Object>} API response
   */
  async getAppointmentTypes() {
    try {
      const response = await apiClient.get('/scheduling/api/mobile/appointment-types/');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get doctors list
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} API response
   */
  async getDoctors(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await apiClient.get(`/scheduling/api/mobile/doctors/?${params.toString()}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get appointment statistics for dashboard
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} API response
   */
  async getAppointmentStats(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await apiClient.get(`/scheduling/api/mobile/appointments/stats/?${params.toString()}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Reschedule an appointment
   * @param {string} appointmentId - Appointment ID
   * @param {Object} rescheduleData - New date and time
   * @returns {Promise<Object>} API response
   */
  async rescheduleAppointment(appointmentId, rescheduleData) {
    try {
      const response = await apiClient.put(
        `/scheduling/api/mobile/appointments/${appointmentId}/update/`,
        {
          appointment_date: rescheduleData.appointment_date,
          appointment_time: rescheduleData.appointment_time,
          reason: rescheduleData.reason
        }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Check appointment conflicts
   * @param {Object} appointmentData - Appointment data to check
   * @returns {Promise<Object>} API response
   */
  async checkConflicts(appointmentData) {
    try {
      const response = await apiClient.post('/scheduling/api/mobile/appointments/check-conflicts/', appointmentData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get upcoming appointments (next 7 days)
   * @returns {Promise<Object>} API response
   */
  async getUpcomingAppointments() {
    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const filters = {
        date_from: today.toISOString().split('T')[0],
        date_to: nextWeek.toISOString().split('T')[0],
        status: 'scheduled',
        limit: 10
      };

      return await this.getAppointments(filters);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get today's appointments
   * @returns {Promise<Object>} API response
   */
  async getTodayAppointments() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const filters = {
        date_from: today,
        date_to: today,
        limit: 50
      };

      return await this.getAppointments(filters);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Search appointments
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} API response
   */
  async searchAppointments(query, filters = {}) {
    try {
      const searchFilters = {
        ...filters,
        search: query,
        limit: 50
      };

      return await this.getAppointments(searchFilters);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get appointment history for a patient
   * @param {string} patientId - Patient ID (optional, for doctors/admin)
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} API response
   */
  async getAppointmentHistory(patientId = null, filters = {}) {
    try {
      const historyFilters = {
        ...filters,
        status: 'completed',
        limit: 100
      };

      if (patientId) {
        historyFilters.patient_id = patientId;
      }

      return await this.getAppointments(historyFilters);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Get calendar events for appointments
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} API response with calendar format
   */
  async getCalendarEvents(filters = {}) {
    try {
      const calendarFilters = {
        ...filters,
        view_type: 'calendar'
      };

      return await this.getAppointments(calendarFilters);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Validate appointment data before creation/update
   * @param {Object} appointmentData - Appointment data to validate
   * @returns {Object} Validation result
   */
  validateAppointmentData(appointmentData) {
    const errors = {};

    // Required fields validation
    if (!appointmentData.doctor_id) {
      errors.doctor_id = 'Doctor is required';
    }

    if (!appointmentData.appointment_date) {
      errors.appointment_date = 'Appointment date is required';
    }

    if (!appointmentData.appointment_time) {
      errors.appointment_time = 'Appointment time is required';
    }

    // Date validation
    if (appointmentData.appointment_date) {
      const appointmentDate = new Date(appointmentData.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        errors.appointment_date = 'Cannot schedule appointments in the past';
      }
    }

    // Time validation
    if (appointmentData.appointment_date && appointmentData.appointment_time) {
      const appointmentDateTime = new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`);
      const now = new Date();

      if (appointmentDateTime <= now) {
        errors.appointment_time = 'Cannot schedule appointments in the past';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Format appointment data for display
   * @param {Object} appointment - Raw appointment data
   * @returns {Object} Formatted appointment data
   */
  formatAppointmentForDisplay(appointment) {
    return {
      ...appointment,
      formatted_date: this.formatDate(appointment.appointment_date),
      formatted_time: this.formatTime(appointment.appointment_time),
      formatted_datetime: this.formatDateTime(appointment.appointment_date, appointment.appointment_time),
      status_color: this.getStatusColor(appointment.status),
      can_reschedule: this.canReschedule(appointment),
      is_upcoming: this.isUpcoming(appointment),
      is_today: this.isToday(appointment)
    };
  }

  /**
   * Helper method to format date
   * @param {string} dateString - Date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Helper method to format time
   * @param {string} timeString - Time string
   * @returns {string} Formatted time
   */
  formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Helper method to format datetime
   * @param {string} dateString - Date string
   * @param {string} timeString - Time string
   * @returns {string} Formatted datetime
   */
  formatDateTime(dateString, timeString) {
    return `${this.formatDate(dateString)} at ${this.formatTime(timeString)}`;
  }

  /**
   * Helper method to get status color
   * @param {string} status - Appointment status
   * @returns {string} Color code
   */
  getStatusColor(status) {
    const statusColors = {
      scheduled: '#2196F3',
      in_progress: '#FF9800',
      completed: '#4CAF50',
      cancelled: '#F44336',
      no_show: '#F44336',
      missed: '#F44336'
    };
    return statusColors[status] || '#2196F3';
  }

  /**
   * Helper method to check if appointment can be rescheduled
   * @param {Object} appointment - Appointment object
   * @returns {boolean} Can reschedule
   */
  canReschedule(appointment) {
    if (appointment.status !== 'scheduled') {
      return false;
    }

    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const hoursDiff = (appointmentDateTime - now) / (1000 * 60 * 60);

    // Can reschedule if appointment is more than 2 hours away
    return hoursDiff > 2;
  }

  /**
   * Helper method to check if appointment is upcoming
   * @param {Object} appointment - Appointment object
   * @returns {boolean} Is upcoming
   */
  isUpcoming(appointment) {
    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointmentDate >= today && appointment.status === 'scheduled';
  }

  /**
   * Helper method to check if appointment is today
   * @param {Object} appointment - Appointment object
   * @returns {boolean} Is today
   */
  isToday(appointment) {
    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    
    return appointmentDate.toDateString() === today.toDateString();
  }
}

export const appointmentService = new AppointmentService();
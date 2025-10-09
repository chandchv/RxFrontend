import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import AppointmentDetailScreen from '../../../screens/appointments/AppointmentDetailScreen';
import { appointmentService } from '../../../services/appointmentService';

// Mock dependencies
jest.mock('../../../services/appointmentService');
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockAppointment = {
  id: '1',
  appointment_date: '2024-01-15',
  appointment_time: '10:00',
  appointment_datetime: '2024-01-15T10:00:00',
  reason: 'Regular checkup for annual physical examination',
  status: 'scheduled',
  status_display: 'Scheduled',
  is_emergency: false,
  is_telemedicine: true,
  is_walk_in: false,
  token_number: 5,
  fee: '100.00',
  prepaid_amount: '50.00',
  can_modify: true,
  can_cancel: true,
  patient: {
    id: 'patient-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    date_of_birth: '1990-05-15',
    gender: 'Male',
    blood_group: 'O+'
  },
  doctor: {
    id: 'doctor-1',
    name: 'Dr. Sarah Smith',
    specialization: 'General Medicine',
    phone: '+1987654321',
    email: 'dr.smith@clinic.com',
    qualification: 'MD, MBBS',
    experience_years: 10
  },
  scheduling_info: {
    appointment_type: {
      id: 'type-1',
      name: 'Consultation',
      duration: 30,
      color: '#2196F3'
    },
    is_telemedicine: true,
    is_emergency: false,
    is_walk_in: false,
    notes: 'Patient requested video consultation',
    created_by: 'Dr. Smith',
    created_at: '2024-01-10T10:00:00Z'
  },
  related_prescriptions: [
    {
      id: 'prescription-1',
      date: '2024-01-15',
      diagnosis: 'Hypertension',
      chief_complaints: 'High blood pressure',
      clinical_findings: 'BP: 140/90 mmHg',
      advice: 'Regular exercise and diet control',
      follow_up_date: '2024-02-15'
    }
  ],
  related_documents: [
    {
      id: 'doc-1',
      filename: 'blood_test_results.pdf',
      document_type: 'lab_report',
      processing_status: 'completed',
      created_at: '2024-01-15T09:00:00Z',
      record_title: 'Blood Test Results'
    }
  ],
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-12T14:00:00Z'
};

const mockRouteWithAppointment = {
  params: {
    appointmentId: '1',
    appointment: mockAppointment
  }
};

const mockRouteWithoutAppointment = {
  params: {
    appointmentId: '1'
  }
};

describe('AppointmentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appointmentService.getAppointmentDetail.mockResolvedValue({
      success: true,
      data: mockAppointment
    });
  });

  it('renders correctly with provided appointment data', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    expect(getByText('January 15, 2024')).toBeTruthy();
    expect(getByText('10:00 AM')).toBeTruthy();
    expect(getByText('Scheduled')).toBeTruthy();
    expect(getByText('Regular checkup for annual physical examination')).toBeTruthy();
  });

  it('loads appointment details when not provided', async () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithoutAppointment} />
    );

    await waitFor(() => {
      expect(appointmentService.getAppointmentDetail).toHaveBeenCalledWith('1');
      expect(getByText('January 15, 2024')).toBeTruthy();
    });
  });

  it('displays patient information correctly', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Patient')).toBeTruthy();
    expect(getByText('Phone: +1234567890')).toBeTruthy();
    expect(getByText('Email: john.doe@example.com')).toBeTruthy();
    expect(getByText('Gender: Male')).toBeTruthy();
    expect(getByText('Blood Group: O+')).toBeTruthy();
  });

  it('displays doctor information correctly', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    expect(getByText('Dr. Sarah Smith')).toBeTruthy();
    expect(getByText('General Medicine')).toBeTruthy();
    expect(getByText('Phone: +1987654321')).toBeTruthy();
    expect(getByText('Email: dr.smith@clinic.com')).toBeTruthy();
    expect(getByText('Qualification: MD, MBBS')).toBeTruthy();
    expect(getByText('Experience: 10 years')).toBeTruthy();
  });

  it('displays appointment flags correctly', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    expect(getByText('Telemedicine')).toBeTruthy();
  });

  it('displays scheduling information correctly', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    expect(getByText('Appointment Details')).toBeTruthy();
    expect(getByText('Type: Consultation')).toBeTruthy();
    expect(getByText('Notes: Patient requested video consultation')).toBeTruthy();
  });

  it('displays related items correctly', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    expect(getByText('Related Items')).toBeTruthy();
    expect(getByText('Prescriptions')).toBeTruthy();
    expect(getByText('1 prescription(s)')).toBeTruthy();
    expect(getByText('Clinical Documents')).toBeTruthy();
    expect(getByText('1 document(s)')).toBeTruthy();
  });

  it('handles edit appointment button press', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const editButton = getByText('Edit');
    fireEvent.press(editButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ScheduleAppointment', {
      appointmentId: '1',
      appointment: mockAppointment,
      editMode: true
    });
  });

  it('handles reschedule appointment button press', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const rescheduleButton = getByText('Reschedule');
    fireEvent.press(rescheduleButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ScheduleAppointment', {
      appointmentId: '1',
      appointment: mockAppointment,
      rescheduleMode: true
    });
  });

  it('handles cancel appointment button press', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      expect.any(Array)
    );
  });

  it('handles successful appointment cancellation', async () => {
    appointmentService.cancelAppointment.mockResolvedValue({
      success: true
    });

    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    // Get the alert callback and simulate user confirmation
    const alertCall = Alert.alert.mock.calls[0];
    const confirmCallback = alertCall[2][1].onPress;
    
    await confirmCallback();

    await waitFor(() => {
      expect(appointmentService.cancelAppointment).toHaveBeenCalledWith('1');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Appointment cancelled successfully',
        expect.any(Array)
      );
    });
  });

  it('handles failed appointment cancellation', async () => {
    appointmentService.cancelAppointment.mockResolvedValue({
      success: false,
      error: 'Cannot cancel appointment'
    });

    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    // Get the alert callback and simulate user confirmation
    const alertCall = Alert.alert.mock.calls[0];
    const confirmCallback = alertCall[2][1].onPress;
    
    await confirmCallback();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Cannot cancel appointment');
    });
  });

  it('handles phone call to patient', () => {
    const { getByTestId } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const phoneButton = getByTestId('call-patient-button');
    fireEvent.press(phoneButton);

    expect(Linking.openURL).toHaveBeenCalledWith('tel:+1234567890');
  });

  it('handles phone call to doctor', () => {
    const { getByTestId } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const phoneButton = getByTestId('call-doctor-button');
    fireEvent.press(phoneButton);

    expect(Linking.openURL).toHaveBeenCalledWith('tel:+1987654321');
  });

  it('handles email to patient', () => {
    const { getByTestId } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const emailButton = getByTestId('email-patient-button');
    fireEvent.press(emailButton);

    expect(Linking.openURL).toHaveBeenCalledWith('mailto:john.doe@example.com');
  });

  it('handles email to doctor', () => {
    const { getByTestId } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const emailButton = getByTestId('email-doctor-button');
    fireEvent.press(emailButton);

    expect(Linking.openURL).toHaveBeenCalledWith('mailto:dr.smith@clinic.com');
  });

  it('handles view prescriptions press', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const prescriptionsItem = getByText('Prescriptions');
    fireEvent.press(prescriptionsItem);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PrescriptionList', {
      appointmentId: '1',
      patientId: 'patient-1'
    });
  });

  it('handles view documents press', () => {
    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithAppointment} />
    );

    const documentsItem = getByText('Clinical Documents');
    fireEvent.press(documentsItem);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecordsList', {
      appointmentId: '1',
      patientId: 'patient-1'
    });
  });

  it('displays loading state when loading appointment details', () => {
    appointmentService.getAppointmentDetail.mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithoutAppointment} />
    );

    expect(getByText('Loading appointment details...')).toBeTruthy();
  });

  it('displays error state when loading fails', async () => {
    appointmentService.getAppointmentDetail.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithoutAppointment} />
    );

    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  it('handles appointment not found', async () => {
    appointmentService.getAppointmentDetail.mockResolvedValue({
      success: false,
      error: 'Appointment not found'
    });

    const { getByText } = render(
      <AppointmentDetailScreen navigation={mockNavigation} route={mockRouteWithoutAppointment} />
    );

    await waitFor(() => {
      expect(getByText('Appointment not found')).toBeTruthy();
    });
  });

  it('does not show action buttons when user cannot modify', () => {
    const nonModifiableAppointment = {
      ...mockAppointment,
      can_modify: false,
      can_cancel: false
    };

    const { queryByText } = render(
      <AppointmentDetailScreen 
        navigation={mockNavigation} 
        route={{
          params: {
            appointmentId: '1',
            appointment: nonModifiableAppointment
          }
        }} 
      />
    );

    expect(queryByText('Edit')).toBeFalsy();
    expect(queryByText('Reschedule')).toBeFalsy();
    expect(queryByText('Cancel')).toBeFalsy();
  });

  it('displays emergency appointment flag', () => {
    const emergencyAppointment = {
      ...mockAppointment,
      is_emergency: true
    };

    const { getByText } = render(
      <AppointmentDetailScreen 
        navigation={mockNavigation} 
        route={{
          params: {
            appointmentId: '1',
            appointment: emergencyAppointment
          }
        }} 
      />
    );

    expect(getByText('Emergency')).toBeTruthy();
  });

  it('handles appointment without patient info (doctor view)', () => {
    const appointmentWithoutPatient = {
      ...mockAppointment,
      patient: null
    };

    const { queryByText } = render(
      <AppointmentDetailScreen 
        navigation={mockNavigation} 
        route={{
          params: {
            appointmentId: '1',
            appointment: appointmentWithoutPatient
          }
        }} 
      />
    );

    expect(queryByText('Patient')).toBeFalsy();
  });

  it('handles appointment without doctor info (patient view)', () => {
    const appointmentWithoutDoctor = {
      ...mockAppointment,
      doctor: null
    };

    const { queryByText } = render(
      <AppointmentDetailScreen 
        navigation={mockNavigation} 
        route={{
          params: {
            appointmentId: '1',
            appointment: appointmentWithoutDoctor
          }
        }} 
      />
    );

    expect(queryByText('Dr. Sarah Smith')).toBeFalsy();
  });

  it('handles appointment without related items', () => {
    const appointmentWithoutRelated = {
      ...mockAppointment,
      related_prescriptions: [],
      related_documents: []
    };

    const { queryByText } = render(
      <AppointmentDetailScreen 
        navigation={mockNavigation} 
        route={{
          params: {
            appointmentId: '1',
            appointment: appointmentWithoutRelated
          }
        }} 
      />
    );

    expect(queryByText('Related Items')).toBeFalsy();
  });

  it('displays correct status colors', () => {
    const completedAppointment = {
      ...mockAppointment,
      status: 'completed',
      status_display: 'Completed'
    };

    const { getByText } = render(
      <AppointmentDetailScreen 
        navigation={mockNavigation} 
        route={{
          params: {
            appointmentId: '1',
            appointment: completedAppointment
          }
        }} 
      />
    );

    const statusChip = getByText('Completed');
    expect(statusChip).toBeTruthy();
  });
});
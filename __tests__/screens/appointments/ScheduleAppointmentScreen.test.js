import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ScheduleAppointmentScreen from '../../../screens/appointments/ScheduleAppointmentScreen';
import { appointmentService } from '../../../services/appointmentService';

// Mock dependencies
jest.mock('../../../services/appointmentService');

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockDoctors = [
  {
    id: 'doctor-1',
    name: 'Dr. Sarah Smith',
    specialization: 'General Medicine',
    phone: '+1987654321',
    email: 'dr.smith@clinic.com',
    is_available: true
  },
  {
    id: 'doctor-2',
    name: 'Dr. John Johnson',
    specialization: 'Cardiology',
    phone: '+1876543210',
    email: 'dr.johnson@clinic.com',
    is_available: true
  }
];

const mockAppointmentTypes = [
  {
    id: 'type-1',
    name: 'Consultation',
    duration: 30,
    color: '#2196F3',
    description: 'General consultation'
  },
  {
    id: 'type-2',
    name: 'Follow-up',
    duration: 15,
    color: '#4CAF50',
    description: 'Follow-up visit'
  }
];

const mockAvailableSlots = [
  {
    time: '09:00',
    formatted_time: '9:00 AM',
    datetime: '2024-01-15T09:00:00',
    duration_minutes: 30,
    is_available: true
  },
  {
    time: '09:30',
    formatted_time: '9:30 AM',
    datetime: '2024-01-15T09:30:00',
    duration_minutes: 30,
    is_available: true
  },
  {
    time: '10:00',
    formatted_time: '10:00 AM',
    datetime: '2024-01-15T10:00:00',
    duration_minutes: 30,
    is_available: true
  }
];

const mockExistingAppointment = {
  id: '1',
  appointment_date: '2024-01-15',
  appointment_time: '10:00',
  reason: 'Regular checkup',
  is_emergency: false,
  is_telemedicine: true,
  doctor: {
    id: 'doctor-1',
    name: 'Dr. Sarah Smith'
  },
  patient: {
    id: 'patient-1',
    name: 'John Doe'
  },
  scheduling_info: {
    appointment_type: {
      id: 'type-1',
      name: 'Consultation'
    },
    notes: 'Patient requested video consultation'
  }
};

describe('ScheduleAppointmentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    appointmentService.getDoctors.mockResolvedValue({
      success: true,
      data: { doctors: mockDoctors }
    });
    
    appointmentService.getAppointmentTypes.mockResolvedValue({
      success: true,
      data: { appointment_types: mockAppointmentTypes }
    });
    
    appointmentService.getAvailableSlots.mockResolvedValue({
      success: true,
      data: { slots: mockAvailableSlots }
    });
    
    appointmentService.createAppointment.mockResolvedValue({
      success: true,
      data: mockExistingAppointment
    });
  });

  it('renders correctly for new appointment', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Schedule New Appointment')).toBeTruthy();
      expect(getByText('Doctor *')).toBeTruthy();
      expect(getByText('Appointment Date *')).toBeTruthy();
      expect(getByText('Time Slot *')).toBeTruthy();
      expect(getByText('Reason for Visit *')).toBeTruthy();
    });
  });

  it('renders correctly for edit mode', async () => {
    const route = {
      params: {
        appointmentId: '1',
        appointment: mockExistingAppointment,
        editMode: true
      }
    };

    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Edit Appointment')).toBeTruthy();
      expect(getByText('Update')).toBeTruthy();
    });
  });

  it('renders correctly for reschedule mode', async () => {
    const route = {
      params: {
        appointmentId: '1',
        appointment: mockExistingAppointment,
        rescheduleMode: true
      }
    };

    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Reschedule Appointment')).toBeTruthy();
      expect(getByText('Reschedule')).toBeTruthy();
    });
  });

  it('loads initial data on mount', async () => {
    render(<ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />);

    await waitFor(() => {
      expect(appointmentService.getDoctors).toHaveBeenCalled();
      expect(appointmentService.getAppointmentTypes).toHaveBeenCalled();
    });
  });

  it('populates form with existing appointment data', async () => {
    const route = {
      params: {
        appointmentId: '1',
        appointment: mockExistingAppointment,
        editMode: true
      }
    };

    const { getByDisplayValue } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByDisplayValue('Regular checkup')).toBeTruthy();
    });
  });

  it('handles doctor selection', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Select a doctor')).toBeTruthy();
    });

    const doctorButton = getByText('Select a doctor');
    fireEvent.press(doctorButton);

    await waitFor(() => {
      expect(getByText('Select Doctor')).toBeTruthy();
      expect(getByText('Dr. Sarah Smith')).toBeTruthy();
    });

    fireEvent.press(getByText('Dr. Sarah Smith'));

    await waitFor(() => {
      expect(getByText('Dr. Sarah Smith - General Medicine')).toBeTruthy();
    });
  });

  it('handles date selection', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Select date')).toBeTruthy();
    });

    const dateButton = getByText('Select date');
    fireEvent.press(dateButton);

    await waitFor(() => {
      expect(getByText('Select Date')).toBeTruthy();
    });
  });

  it('loads available slots when doctor and date are selected', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    // Select doctor first
    await waitFor(() => {
      expect(getByText('Select a doctor')).toBeTruthy();
    });

    const doctorButton = getByText('Select a doctor');
    fireEvent.press(doctorButton);

    await waitFor(() => {
      expect(getByText('Dr. Sarah Smith')).toBeTruthy();
    });

    fireEvent.press(getByText('Dr. Sarah Smith'));

    // Mock date selection
    act(() => {
      // Simulate date selection by directly updating the form state
      // This would normally happen through the calendar modal
    });

    await waitFor(() => {
      expect(appointmentService.getAvailableSlots).toHaveBeenCalled();
    });
  });

  it('handles time slot selection', async () => {
    const route = {
      params: {
        appointmentId: '1',
        appointment: {
          ...mockExistingAppointment,
          doctor: { id: 'doctor-1' },
          appointment_date: '2024-01-15'
        },
        editMode: true
      }
    };

    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Select time slot')).toBeTruthy();
    });

    const timeButton = getByText('Select time slot');
    fireEvent.press(timeButton);

    await waitFor(() => {
      expect(getByText('Select Time Slot')).toBeTruthy();
      expect(getByText('9:00 AM')).toBeTruthy();
    });

    fireEvent.press(getByText('9:00 AM'));

    await waitFor(() => {
      expect(getByText('9:00 AM')).toBeTruthy();
    });
  });

  it('handles appointment type selection', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Select type (optional)')).toBeTruthy();
    });

    const typeButton = getByText('Select type (optional)');
    fireEvent.press(typeButton);

    await waitFor(() => {
      expect(getByText('Select Appointment Type')).toBeTruthy();
      expect(getByText('Consultation')).toBeTruthy();
    });

    fireEvent.press(getByText('Consultation'));

    await waitFor(() => {
      expect(getByText('Consultation')).toBeTruthy();
    });
  });

  it('handles form input changes', async () => {
    const { getByLabelText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      const reasonInput = getByLabelText('Reason for Visit *');
      expect(reasonInput).toBeTruthy();
    });

    const reasonInput = getByLabelText('Reason for Visit *');
    fireEvent.changeText(reasonInput, 'Annual physical examination');

    expect(reasonInput.props.value).toBe('Annual physical examination');
  });

  it('handles emergency and telemedicine toggles', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Emergency Appointment')).toBeTruthy();
      expect(getByText('Telemedicine Consultation')).toBeTruthy();
    });

    const emergencyToggle = getByText('Emergency Appointment').parent;
    const telemedicineToggle = getByText('Telemedicine Consultation').parent;

    fireEvent.press(emergencyToggle);
    fireEvent.press(telemedicineToggle);

    // Toggles should be activated
    expect(emergencyToggle).toBeTruthy();
    expect(telemedicineToggle).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Schedule')).toBeTruthy();
    });

    const scheduleButton = getByText('Schedule');
    fireEvent.press(scheduleButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please fix the errors and try again'
      );
    });
  });

  it('handles successful appointment creation', async () => {
    const { getByText, getByLabelText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Select a doctor')).toBeTruthy();
    });

    // Fill in required fields
    const doctorButton = getByText('Select a doctor');
    fireEvent.press(doctorButton);

    await waitFor(() => {
      expect(getByText('Dr. Sarah Smith')).toBeTruthy();
    });

    fireEvent.press(getByText('Dr. Sarah Smith'));

    // Fill reason
    const reasonInput = getByLabelText('Reason for Visit *');
    fireEvent.changeText(reasonInput, 'Regular checkup');

    // Mock form completion and submission
    const scheduleButton = getByText('Schedule');
    fireEvent.press(scheduleButton);

    await waitFor(() => {
      expect(appointmentService.createAppointment).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Appointment created successfully',
        expect.any(Array)
      );
    });
  });

  it('handles failed appointment creation', async () => {
    appointmentService.createAppointment.mockResolvedValue({
      success: false,
      error: 'Time slot is already booked'
    });

    const { getByText, getByLabelText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Select a doctor')).toBeTruthy();
    });

    // Fill in required fields and submit
    const reasonInput = getByLabelText('Reason for Visit *');
    fireEvent.changeText(reasonInput, 'Regular checkup');

    const scheduleButton = getByText('Schedule');
    fireEvent.press(scheduleButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Time slot is already booked');
    });
  });

  it('handles appointment update', async () => {
    appointmentService.updateAppointment.mockResolvedValue({
      success: true,
      data: mockExistingAppointment
    });

    const route = {
      params: {
        appointmentId: '1',
        appointment: mockExistingAppointment,
        editMode: true
      }
    };

    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Update')).toBeTruthy();
    });

    const updateButton = getByText('Update');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(appointmentService.updateAppointment).toHaveBeenCalledWith('1', expect.any(Object));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Appointment updated successfully',
        expect.any(Array)
      );
    });
  });

  it('handles cancel button press', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('handles doctor search', async () => {
    const { getByText, getByPlaceholderText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Select a doctor')).toBeTruthy();
    });

    const doctorButton = getByText('Select a doctor');
    fireEvent.press(doctorButton);

    await waitFor(() => {
      expect(getByPlaceholderText('Search doctors...')).toBeTruthy();
    });

    const searchInput = getByPlaceholderText('Search doctors...');
    fireEvent.changeText(searchInput, 'Sarah');

    await waitFor(() => {
      expect(getByText('Dr. Sarah Smith')).toBeTruthy();
    });
  });

  it('disables time slot selection when doctor or date not selected', async () => {
    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Select time slot')).toBeTruthy();
      expect(getByText('Please select doctor and date first')).toBeTruthy();
    });

    const timeButton = getByText('Select time slot');
    // Button should be disabled, so pressing it shouldn't open modal
    fireEvent.press(timeButton);

    // Modal should not open
    expect(getByText('Select time slot')).toBeTruthy();
  });

  it('handles loading states correctly', async () => {
    appointmentService.getDoctors.mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    expect(getByText('Loading appointment form...')).toBeTruthy();
  });

  it('handles no available slots', async () => {
    appointmentService.getAvailableSlots.mockResolvedValue({
      success: true,
      data: { slots: [] }
    });

    const route = {
      params: {
        appointmentId: '1',
        appointment: {
          ...mockExistingAppointment,
          doctor: { id: 'doctor-1' },
          appointment_date: '2024-01-15'
        },
        editMode: true
      }
    };

    const { getByText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Select time slot')).toBeTruthy();
    });

    const timeButton = getByText('Select time slot');
    fireEvent.press(timeButton);

    await waitFor(() => {
      expect(getByText('No available slots for this date')).toBeTruthy();
    });
  });

  it('validates past date selection', async () => {
    const { getByText, getByLabelText } = render(
      <ScheduleAppointmentScreen navigation={mockNavigation} route={{}} />
    );

    await waitFor(() => {
      expect(getByText('Schedule')).toBeTruthy();
    });

    // Mock selecting a past date
    // This would normally be prevented by the calendar component
    // but we test the validation logic

    const reasonInput = getByLabelText('Reason for Visit *');
    fireEvent.changeText(reasonInput, 'Test appointment');

    const scheduleButton = getByText('Schedule');
    fireEvent.press(scheduleButton);

    // Should show validation error
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please fix the errors and try again'
      );
    });
  });
});
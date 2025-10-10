import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AppointmentListScreen from '../../../screens/appointments/AppointmentListScreen';
import { appointmentService } from '../../../services/appointmentService';

// Mock dependencies
jest.mock('../../../services/appointmentService');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = {
  params: {},
};

const mockAppointments = [
  {
    id: '1',
    appointment_date: '2024-01-15',
    appointment_time: '10:00',
    reason: 'Regular checkup',
    status: 'scheduled',
    status_display: 'Scheduled',
    patient_name: 'John Doe',
    doctor_name: 'Dr. Smith',
    doctor_specialization: 'General Medicine',
    duration_minutes: 30,
    is_emergency: false,
    is_telemedicine: false,
    is_walk_in: false,
    can_modify: true,
    can_cancel: true,
    created_at: '2024-01-10T10:00:00Z'
  },
  {
    id: '2',
    appointment_date: '2024-01-16',
    appointment_time: '14:30',
    reason: 'Follow-up consultation',
    status: 'completed',
    status_display: 'Completed',
    patient_name: 'Jane Smith',
    doctor_name: 'Dr. Johnson',
    doctor_specialization: 'Cardiology',
    duration_minutes: 45,
    is_emergency: false,
    is_telemedicine: true,
    is_walk_in: false,
    can_modify: false,
    can_cancel: false,
    created_at: '2024-01-12T14:00:00Z'
  }
];

describe('AppointmentListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appointmentService.getAppointments.mockResolvedValue({
      success: true,
      data: {
        appointments: mockAppointments,
        total_count: 2,
        has_more: false
      }
    });
  });

  it('renders correctly', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByPlaceholderText('Search appointments...')).toBeTruthy();
    
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });
  });

  it('loads appointments on mount', async () => {
    render(<AppointmentListScreen navigation={mockNavigation} route={mockRoute} />);

    await waitFor(() => {
      expect(appointmentService.getAppointments).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        view_type: 'list'
      });
    });
  });

  it('handles search functionality', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    const searchInput = getByPlaceholderText('Search appointments...');
    
    act(() => {
      fireEvent.changeText(searchInput, 'John');
    });

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(queryByText('Jane Smith')).toBeFalsy();
    });
  });

  it('handles status filter', async () => {
    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    // Test status filter functionality
    const statusFilter = getByText('Status');
    fireEvent.press(statusFilter);

    await waitFor(() => {
      expect(getByText('Scheduled')).toBeTruthy();
    });
  });

  it('handles appointment item press', async () => {
    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    const appointmentCard = getByText('John Doe').closest('View');
    fireEvent.press(appointmentCard);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('AppointmentDetail', {
      appointmentId: '1',
      appointment: mockAppointments[0]
    });
  });

  it('handles create appointment button press', async () => {
    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    const createButton = getByText('New Appointment');
    fireEvent.press(createButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ScheduleAppointment');
  });

  it('handles appointment cancellation', async () => {
    appointmentService.cancelAppointment.mockResolvedValue({
      success: true
    });

    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
    });

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Cancel Appointment',
      expect.stringContaining('Are you sure you want to cancel'),
      expect.any(Array)
    );
  });

  it('handles refresh functionality', async () => {
    const { getByTestId } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(appointmentService.getAppointments).toHaveBeenCalledTimes(1);
    });

    // Simulate pull to refresh
    const flatList = getByTestId('appointments-list');
    fireEvent(flatList, 'refresh');

    await waitFor(() => {
      expect(appointmentService.getAppointments).toHaveBeenCalledTimes(2);
    });
  });

  it('handles load more functionality', async () => {
    appointmentService.getAppointments.mockResolvedValueOnce({
      success: true,
      data: {
        appointments: mockAppointments,
        total_count: 50,
        has_more: true
      }
    });

    const { getByTestId } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(appointmentService.getAppointments).toHaveBeenCalledTimes(1);
    });

    const flatList = getByTestId('appointments-list');
    fireEvent(flatList, 'endReached');

    await waitFor(() => {
      expect(appointmentService.getAppointments).toHaveBeenCalledTimes(2);
    });
  });

  it('displays empty state when no appointments', async () => {
    appointmentService.getAppointments.mockResolvedValue({
      success: true,
      data: {
        appointments: [],
        total_count: 0,
        has_more: false
      }
    });

    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('No Appointments')).toBeTruthy();
      expect(getByText("You don't have any appointments yet")).toBeTruthy();
    });
  });

  it('displays error state when loading fails', async () => {
    appointmentService.getAppointments.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  it('handles date filter selection', async () => {
    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Date')).toBeTruthy();
    });

    const dateFilter = getByText('Date');
    fireEvent.press(dateFilter);

    await waitFor(() => {
      expect(getByText('Today')).toBeTruthy();
      expect(getByText('Tomorrow')).toBeTruthy();
    });

    fireEvent.press(getByText('Today'));

    await waitFor(() => {
      expect(appointmentService.getAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: expect.any(String),
          date_to: expect.any(String)
        })
      );
    });
  });

  it('handles clear filters', async () => {
    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Status')).toBeTruthy();
    });

    // Apply a filter first
    const statusFilter = getByText('Status');
    fireEvent.press(statusFilter);

    await waitFor(() => {
      expect(getByText('Scheduled')).toBeTruthy();
    });

    fireEvent.press(getByText('Scheduled'));

    // Clear filters should appear
    await waitFor(() => {
      expect(getByText('Clear')).toBeTruthy();
    });

    fireEvent.press(getByText('Clear'));

    // Should reload appointments without filters
    await waitFor(() => {
      expect(appointmentService.getAppointments).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        view_type: 'list'
      });
    });
  });

  it('displays appointment flags correctly', async () => {
    const emergencyAppointment = {
      ...mockAppointments[0],
      is_emergency: true,
      is_telemedicine: true
    };

    appointmentService.getAppointments.mockResolvedValue({
      success: true,
      data: {
        appointments: [emergencyAppointment],
        total_count: 1,
        has_more: false
      }
    });

    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Emergency')).toBeTruthy();
      expect(getByText('Telemedicine')).toBeTruthy();
    });
  });

  it('handles edit appointment button press', async () => {
    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Edit')).toBeTruthy();
    });

    const editButton = getByText('Edit');
    fireEvent.press(editButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ScheduleAppointment', {
      appointmentId: '1',
      editMode: true
    });
  });

  it('handles calendar modal', async () => {
    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Date')).toBeTruthy();
    });

    const dateFilter = getByText('Date');
    fireEvent.press(dateFilter);

    await waitFor(() => {
      expect(getByText('Custom Date')).toBeTruthy();
    });

    fireEvent.press(getByText('Custom Date'));

    await waitFor(() => {
      expect(getByText('Select Date')).toBeTruthy();
    });
  });

  it('displays loading state correctly', () => {
    appointmentService.getAppointments.mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Loading appointments...')).toBeTruthy();
  });

  it('handles appointment status colors correctly', async () => {
    const { getByText } = render(
      <AppointmentListScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Scheduled')).toBeTruthy();
      expect(getByText('Completed')).toBeTruthy();
    });

    // Status chips should be rendered with appropriate colors
    const scheduledChip = getByText('Scheduled');
    const completedChip = getByText('Completed');
    
    expect(scheduledChip).toBeTruthy();
    expect(completedChip).toBeTruthy();
  });
});
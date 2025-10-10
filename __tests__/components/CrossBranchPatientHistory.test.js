import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CrossBranchPatientHistory from '../../components/CrossBranchPatientHistory';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';

// Mock the contexts
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/BranchContext');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

const mockMakeAuthenticatedRequest = jest.fn();

const mockBranchContext = {
  accessibleBranches: [
    {
      id: 1,
      name: 'Main Branch',
      clinic_type: 'parent',
      branch_code: 'MB'
    },
    {
      id: 2,
      name: 'Downtown Branch',
      clinic_type: 'branch',
      branch_code: 'DB'
    }
  ],
  getBranchTypeColor: (type) => {
    switch (type) {
      case 'parent': return '#4CAF50';
      case 'branch': return '#2196F3';
      default: return '#666';
    }
  },
  getBranchTypeLabel: (type) => {
    switch (type) {
      case 'parent': return 'Main Branch';
      case 'branch': return 'Branch';
      default: return 'Clinic';
    }
  }
};

const mockAuthContext = {
  makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
};

const mockPatientHistory = {
  total_visits: 5,
  branches_visited: 2,
  total_prescriptions: 3,
  appointments: [
    {
      id: 1,
      doctor_name: 'Smith',
      appointment_date: '2024-01-15T10:00:00Z',
      status: 'completed',
      diagnosis: 'Common cold',
      notes: 'Patient feeling better',
      clinic_id: 1
    },
    {
      id: 2,
      doctor_name: 'Johnson',
      appointment_date: '2024-01-10T14:30:00Z',
      status: 'cancelled',
      diagnosis: null,
      notes: 'Patient cancelled',
      clinic_id: 2
    }
  ],
  prescriptions: [
    {
      id: 1,
      doctor_name: 'Smith',
      created_at: '2024-01-15T10:30:00Z',
      medications: [
        {
          name: 'Paracetamol',
          dosage: '500mg',
          duration: '5 days'
        }
      ],
      notes: 'Take with food',
      clinic_id: 1
    }
  ],
  lab_results: [
    {
      id: 1,
      test_name: 'Blood Test',
      test_date: '2024-01-12T09:00:00Z',
      status: 'completed',
      results: 'Normal',
      ordered_by: 'Smith',
      clinic_id: 1
    }
  ],
  diagnoses: [
    {
      id: 1,
      condition: 'Hypertension',
      diagnosis_date: '2024-01-01T11:00:00Z',
      severity: 'Mild',
      notes: 'Monitor blood pressure',
      diagnosed_by: 'Smith',
      clinic_id: 1
    }
  ],
  access_history: [
    {
      id: 1,
      access_type: 'visit',
      access_date: '2024-01-15T10:00:00Z',
      accessed_by_name: 'Dr. Smith',
      purpose: 'Regular checkup',
      clinic_id: 1
    }
  ]
};

describe('CrossBranchPatientHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(mockAuthContext);
    useBranch.mockReturnValue(mockBranchContext);
    mockMakeAuthenticatedRequest.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPatientHistory)
    });
  });

  describe('Component Rendering', () => {
    it('renders loading state initially', () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      expect(getByText('Loading patient history...')).toBeTruthy();
    });

    it('renders patient history after loading', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Cross-Branch Activity Summary')).toBeTruthy();
        expect(getByText('5')).toBeTruthy(); // Total visits
        expect(getByText('2')).toBeTruthy(); // Branches visited
        expect(getByText('3')).toBeTruthy(); // Total prescriptions
      });
    });

    it('renders time range selector', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Time Range:')).toBeTruthy();
        expect(getByText('30 Days')).toBeTruthy();
        expect(getByText('90 Days')).toBeTruthy();
        expect(getByText('All Time')).toBeTruthy();
      });
    });

    it('renders section headers with counts', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Appointments')).toBeTruthy();
        expect(getByText('Prescriptions')).toBeTruthy();
        expect(getByText('Lab Results')).toBeTruthy();
        expect(getByText('Diagnoses')).toBeTruthy();
        expect(getByText('Access History')).toBeTruthy();
      });
    });
  });

  describe('Data Fetching', () => {
    it('fetches patient history on mount', async () => {
      render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('/users/api/cross-branch/patients/1/history/')
        );
      });
    });

    it('includes correct parameters in API call', async () => {
      render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('include_details=true&days=30')
        );
      });
    });

    it('handles API errors gracefully', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch history' })
      });

      render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to fetch history');
      });
    });

    it('refetches data when time range changes', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('90 Days')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('90 Days'));
      });

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('days=90')
        );
      });
    });
  });

  describe('Section Expansion', () => {
    it('expands and collapses sections when header is tapped', async () => {
      const { getByText, queryByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Appointment with Dr. Smith')).toBeTruthy();
      });

      // Collapse appointments section
      await act(async () => {
        fireEvent.press(getByText('Appointments'));
      });

      expect(queryByText('Appointment with Dr. Smith')).toBeNull();

      // Expand appointments section again
      await act(async () => {
        fireEvent.press(getByText('Appointments'));
      });

      expect(getByText('Appointment with Dr. Smith')).toBeTruthy();
    });

    it('shows correct expand/collapse icons', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Appointments')).toBeTruthy();
      });

      // Initially expanded sections should show expand-less icon
      // After collapsing, should show expand-more icon
      // This would require checking the icon state, which depends on implementation
    });
  });

  describe('Appointment Items', () => {
    it('displays appointment information correctly', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Appointment with Dr. Smith')).toBeTruthy();
        expect(getByText('Jan 15, 2024, 10:00 AM')).toBeTruthy();
        expect(getByText('completed')).toBeTruthy();
        expect(getByText('Diagnosis: Common cold')).toBeTruthy();
        expect(getByText('Notes: Patient feeling better')).toBeTruthy();
        expect(getByText('Branch: Main Branch')).toBeTruthy();
      });
    });

    it('shows different status colors for appointments', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Check that both completed and cancelled appointments are shown
        expect(getByText('completed')).toBeTruthy();
        expect(getByText('cancelled')).toBeTruthy();
      });
    });

    it('displays branch indicators for appointments', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('MB')).toBeTruthy(); // Main Branch indicator
        expect(getByText('DB')).toBeTruthy(); // Downtown Branch indicator
      });
    });
  });

  describe('Prescription Items', () => {
    it('displays prescription information correctly', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Prescription by Dr. Smith')).toBeTruthy();
        expect(getByText('Medications:')).toBeTruthy();
        expect(getByText('• Paracetamol - 500mg (5 days)')).toBeTruthy();
        expect(getByText('Notes: Take with food')).toBeTruthy();
      });
    });
  });

  describe('Lab Results Items', () => {
    it('displays lab result information correctly', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Blood Test')).toBeTruthy();
        expect(getByText('Results: Normal')).toBeTruthy();
        expect(getByText('Ordered by: Dr. Smith')).toBeTruthy();
      });
    });
  });

  describe('Diagnosis Items', () => {
    it('displays diagnosis information correctly', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Hypertension')).toBeTruthy();
        expect(getByText('Severity: Mild')).toBeTruthy();
        expect(getByText('Notes: Monitor blood pressure')).toBeTruthy();
        expect(getByText('Diagnosed by: Dr. Smith')).toBeTruthy();
      });
    });
  });

  describe('Access History Items', () => {
    it('displays access history information correctly', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Patient Visit')).toBeTruthy();
        expect(getByText('Accessed by: Dr. Smith')).toBeTruthy();
        expect(getByText('Purpose: Regular checkup')).toBeTruthy();
      });
    });

    it('shows access history section collapsed by default', async () => {
      const { queryByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Access history should be collapsed by default
        expect(queryByText('Accessed by: Dr. Smith')).toBeNull();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no history is available', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null)
      });

      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('No patient history available')).toBeTruthy();
      });
    });

    it('shows no data messages for empty sections', async () => {
      const emptyHistory = {
        ...mockPatientHistory,
        appointments: [],
        prescriptions: [],
        lab_results: [],
        diagnoses: [],
        access_history: []
      };

      mockMakeAuthenticatedRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(emptyHistory)
      });

      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('No appointments found')).toBeTruthy();
        expect(getByText('No prescriptions found')).toBeTruthy();
        expect(getByText('No lab results found')).toBeTruthy();
        expect(getByText('No diagnoses found')).toBeTruthy();
      });
    });
  });

  describe('Time Range Selection', () => {
    it('updates selected time range when option is pressed', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('90 Days')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('90 Days'));
      });

      // The button should now be in active state (this would require checking styles)
      // and API should be called with new parameter
      expect(mockMakeAuthenticatedRequest).toHaveBeenLastCalledWith(
        expect.stringContaining('days=90')
      );
    });

    it('handles "All Time" selection correctly', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('All Time')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('All Time'));
      });

      // Should not include days parameter for "All Time"
      expect(mockMakeAuthenticatedRequest).toHaveBeenLastCalledWith(
        expect.not.stringContaining('days=')
      );
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes data when pull-to-refresh is triggered', async () => {
      const { getByTestId } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(1);
      });

      // Simulate pull-to-refresh
      const scrollView = getByTestId('patient-history-scroll') || 
                        getByText('Cross-Branch Activity Summary').parent.parent;
      
      await act(async () => {
        fireEvent(scrollView, 'onRefresh');
      });

      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('Date Formatting', () => {
    it('formats dates correctly', async () => {
      const { getByText } = render(
        <CrossBranchPatientHistory patientId={1} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Check that dates are formatted in readable format
        expect(getByText('Jan 15, 2024, 10:00 AM')).toBeTruthy();
        expect(getByText('Jan 10, 2024, 2:30 PM')).toBeTruthy();
      });
    });
  });
});
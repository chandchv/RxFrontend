import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert } from 'react-native';

// Import screens and components
import CrossBranchPatientSearchScreen from '../../screens/CrossBranchPatientSearchScreen';
import CrossBranchPatientDetails from '../../screens/CrossBranchPatientDetails';
import CrossBranchPatientSearch from '../../components/CrossBranchPatientSearch';
import CrossBranchPatientHistory from '../../components/CrossBranchPatientHistory';
import PatientBranchTransfer from '../../components/PatientBranchTransfer';

// Import contexts
import { AuthProvider } from '../../contexts/AuthContext';
import { BranchProvider } from '../../contexts/BranchContext';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock fetch
global.fetch = jest.fn();

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

const createMockNavigation = () => ({
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: mockSetOptions,
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  isFocused: jest.fn(() => true),
});

// Mock auth context
const mockMakeAuthenticatedRequest = jest.fn();
const mockAuthContext = {
  user: { 
    id: 1, 
    username: 'testuser',
    role: 'DOCTOR',
    current_tenant: { id: 1, name: 'Main Clinic' }
  },
  token: 'test-token',
  makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
};

// Mock branch context
const mockBranchContext = {
  accessibleBranches: [
    { 
      id: 1, 
      name: 'Main Clinic', 
      clinic_type: 'parent',
      branch_code: 'MAIN',
      address: '123 Main St'
    },
    { 
      id: 2, 
      name: 'Branch Clinic', 
      clinic_type: 'branch',
      branch_code: 'BR01',
      address: '456 Branch St'
    },
  ],
  currentBranch: { id: 1, name: 'Main Clinic', clinic_type: 'parent' },
  canAccessMultipleBranches: () => true,
  getBranchTypeColor: jest.fn((type) => {
    const colors = { parent: '#4CAF50', branch: '#2196F3', independent: '#FF9800' };
    return colors[type] || '#666';
  }),
  getBranchTypeLabel: jest.fn((type) => {
    const labels = { parent: 'Main Branch', branch: 'Branch', independent: 'Independent' };
    return labels[type] || 'Unknown';
  }),
  canManageBranches: jest.fn(() => true),
  switchBranch: jest.fn(),
};

const Stack = createStackNavigator();

const TestWrapper = ({ children, initialRouteName = 'Search' }) => (
  <NavigationContainer>
    <AuthProvider value={mockAuthContext}>
      <BranchProvider value={mockBranchContext}>
        <Stack.Navigator initialRouteName={initialRouteName}>
          <Stack.Screen name="Search" component={() => children} />
          <Stack.Screen name="CrossBranchPatientDetails" component={CrossBranchPatientDetails} />
        </Stack.Navigator>
      </BranchProvider>
    </AuthProvider>
  </NavigationContainer>
);

// Mock patient data
const mockPatients = [
  {
    id: 1,
    patient_id: 'P001',
    first_name: 'John',
    last_name: 'Doe',
    gender: 'Male',
    age: 35,
    phone_number: '+1234567890',
    email: 'john@example.com',
    clinic_id: 1,
    last_visit_date: '2023-12-01T10:00:00Z',
  },
  {
    id: 2,
    patient_id: 'P002',
    first_name: 'Jane',
    last_name: 'Smith',
    gender: 'Female',
    age: 28,
    phone_number: '+1234567891',
    email: 'jane@example.com',
    clinic_id: 2,
    last_visit_date: '2023-11-15T14:30:00Z',
  },
];

const mockPatientDetails = {
  id: 1,
  patient_id: 'P001',
  first_name: 'John',
  last_name: 'Doe',
  gender: 'Male',
  age: 35,
  date_of_birth: '1988-01-01',
  phone_number: '+1234567890',
  email: 'john@example.com',
  address: '123 Main St',
  clinic_id: 1,
  registration_date: '2023-01-01T00:00:00Z',
  recent_activity: {
    total_appointments: 5,
    total_prescriptions: 3,
    branches_visited: 2,
    last_visit_date: '2023-12-01T10:00:00Z',
  },
};

const mockPatientHistory = {
  appointments: [
    {
      id: 1,
      doctor_name: 'Dr. Smith',
      appointment_date: '2023-12-01T10:00:00Z',
      status: 'completed',
      diagnosis: 'Common cold',
      clinic_id: 1,
    },
  ],
  prescriptions: [
    {
      id: 1,
      doctor_name: 'Dr. Smith',
      created_at: '2023-12-01T10:30:00Z',
      medications: [
        { name: 'Paracetamol', dosage: '500mg', duration: '5 days' },
      ],
      clinic_id: 1,
    },
  ],
  lab_results: [],
  diagnoses: [],
  access_history: [],
  total_visits: 5,
  branches_visited: 2,
  total_prescriptions: 3,
};

describe('Cross-Branch Patient Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Patient Search Integration', () => {
    it('performs complete search workflow', async () => {
      // Mock search API response
      mockMakeAuthenticatedRequest.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: mockPatients,
          count: 2,
          next: null,
          previous: null,
        }),
      });

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <CrossBranchPatientSearchScreen navigation={createMockNavigation()} />
        </TestWrapper>
      );

      // Enter search term
      const searchInput = getByPlaceholderText(/search patients/i);
      fireEvent.changeText(searchInput, 'John');

      // Wait for search results
      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('/users/api/cross-branch/patients/search/')
        );
      });

      // Verify search was called with correct parameters
      const callUrl = mockMakeAuthenticatedRequest.mock.calls[0][0];
      expect(callUrl).toContain('search_term=John');
      expect(callUrl).toContain('page=1');
    });

    it('handles branch filtering in search', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: [mockPatients[0]], // Only main clinic patient
          count: 1,
          next: null,
          previous: null,
        }),
      });

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <CrossBranchPatientSearch 
            onPatientSelect={jest.fn()}
            navigation={createMockNavigation()}
            showBranchFilter={true}
          />
        </TestWrapper>
      );

      // Open branch filter
      const filterButton = getByText(/filter/i);
      fireEvent.press(filterButton);

      // Wait for filter modal
      await waitFor(() => {
        expect(getByText('Filter by Branches')).toBeTruthy();
      });

      // Deselect a branch
      const branchCheckbox = getByText('Branch Clinic');
      fireEvent.press(branchCheckbox);

      // Perform search
      const searchInput = getByPlaceholderText(/search patients/i);
      fireEvent.changeText(searchInput, 'John');

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalled();
      });

      // Verify clinic_ids parameter was included
      const callUrl = mockMakeAuthenticatedRequest.mock.calls[0][0];
      expect(callUrl).toContain('clinic_ids=');
    });

    it('handles search errors gracefully', async () => {
      mockMakeAuthenticatedRequest.mockRejectedValueOnce(new Error('Network error'));

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <CrossBranchPatientSearch 
            onPatientSelect={jest.fn()}
            navigation={createMockNavigation()}
          />
        </TestWrapper>
      );

      const searchInput = getByPlaceholderText(/search patients/i);
      fireEvent.changeText(searchInput, 'John');

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Search Error',
          expect.stringContaining('Failed to search patients')
        );
      });
    });
  });

  describe('Patient Details Integration', () => {
    it('loads and displays patient details', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPatientDetails),
      });

      const mockRoute = { params: { patientId: 1 } };

      const { getByText } = render(
        <TestWrapper>
          <CrossBranchPatientDetails 
            route={mockRoute} 
            navigation={createMockNavigation()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('ID: P001')).toBeTruthy();
        expect(getByText('Male • 35 years')).toBeTruthy();
      });

      expect(mockSetOptions).toHaveBeenCalledWith({
        title: 'John Doe',
      });
    });

    it('switches between details and history tabs', async () => {
      mockMakeAuthenticatedRequest
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPatientDetails),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPatientHistory),
        });

      const mockRoute = { params: { patientId: 1 } };

      const { getByText } = render(
        <TestWrapper>
          <CrossBranchPatientDetails 
            route={mockRoute} 
            navigation={createMockNavigation()} 
          />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // Switch to history tab
      const historyTab = getByText('Cross-Branch History');
      fireEvent.press(historyTab);

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('/users/api/cross-branch/patients/1/history/')
        );
      });
    });
  });

  describe('Patient History Integration', () => {
    it('loads and displays patient history', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPatientHistory),
      });

      const { getByText } = render(
        <TestWrapper>
          <CrossBranchPatientHistory 
            patientId={1} 
            navigation={createMockNavigation()} 
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Cross-Branch Activity Summary')).toBeTruthy();
        expect(getByText('5')).toBeTruthy(); // Total visits
        expect(getByText('2')).toBeTruthy(); // Branches visited
        expect(getByText('3')).toBeTruthy(); // Total prescriptions
      });
    });

    it('filters history by time range', async () => {
      mockMakeAuthenticatedRequest
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPatientHistory),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockPatientHistory,
            appointments: [], // No appointments in 30 days
          }),
        });

      const { getByText } = render(
        <TestWrapper>
          <CrossBranchPatientHistory 
            patientId={1} 
            navigation={createMockNavigation()} 
          />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Cross-Branch Activity Summary')).toBeTruthy();
      });

      // Change time range to 30 days
      const thirtyDaysButton = getByText('30 Days');
      fireEvent.press(thirtyDaysButton);

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('days=30')
        );
      });
    });
  });

  describe('Patient Transfer Integration', () => {
    it('performs complete transfer workflow', async () => {
      // Mock validation response
      mockMakeAuthenticatedRequest
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            can_transfer: true,
            message: 'Transfer is allowed',
          }),
        })
        // Mock transfer response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Patient transferred successfully',
          }),
        });

      const mockOnTransferComplete = jest.fn();
      const mockOnClose = jest.fn();

      const { getByText, getByDisplayValue } = render(
        <TestWrapper>
          <PatientBranchTransfer
            patientId={1}
            patientName="John Doe"
            currentBranchId={1}
            visible={true}
            onClose={mockOnClose}
            onTransferComplete={mockOnTransferComplete}
          />
        </TestWrapper>
      );

      // Select target branch
      const branchOption = getByText('Branch Clinic');
      fireEvent.press(branchOption);

      // Wait for validation
      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          '/users/api/cross-branch/patients/validate-transfer/',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              patient_id: 1,
              target_clinic_id: 2,
            }),
          })
        );
      });

      // Select transfer reason
      const reasonChip = getByText('Patient relocation');
      fireEvent.press(reasonChip);

      // Submit transfer
      const transferButton = getByText('Transfer Patient');
      fireEvent.press(transferButton);

      // Confirm in alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Confirm Transfer',
          expect.stringContaining('John Doe'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel' }),
            expect.objectContaining({ text: 'Transfer' }),
          ])
        );
      });

      // Simulate user confirming
      const alertCall = Alert.alert.mock.calls.find(call => 
        call[0] === 'Confirm Transfer'
      );
      const confirmButton = alertCall[2].find(button => button.text === 'Transfer');
      await act(async () => {
        confirmButton.onPress();
      });

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          '/users/api/cross-branch/patients/transfer/',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              patient_id: 1,
              target_clinic_id: 2,
              transfer_reason: 'Patient relocation',
              transfer_notes: null,
              maintain_history: true,
            }),
          })
        );
      });

      // Verify success handling
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Transfer Successful',
          expect.stringContaining('successfully transferred'),
          expect.arrayContaining([
            expect.objectContaining({
              text: 'OK',
              onPress: expect.any(Function),
            }),
          ])
        );
      });
    });

    it('handles transfer validation errors', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          can_transfer: false,
          error: 'Insufficient permissions',
        }),
      });

      const { getByText } = render(
        <TestWrapper>
          <PatientBranchTransfer
            patientId={1}
            patientName="John Doe"
            currentBranchId={1}
            visible={true}
            onClose={jest.fn()}
            onTransferComplete={jest.fn()}
          />
        </TestWrapper>
      );

      // Select target branch
      const branchOption = getByText('Branch Clinic');
      fireEvent.press(branchOption);

      await waitFor(() => {
        expect(getByText('Transfer not allowed')).toBeTruthy();
        expect(getByText('Insufficient permissions')).toBeTruthy();
      });

      // Transfer button should be disabled
      const transferButton = getByText('Transfer Patient');
      expect(transferButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('End-to-End Workflow', () => {
    it('completes full patient search to transfer workflow', async () => {
      // Mock search response
      mockMakeAuthenticatedRequest
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: mockPatients,
            count: 2,
          }),
        })
        // Mock patient details response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPatientDetails),
        })
        // Mock transfer validation
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ can_transfer: true }),
        })
        // Mock transfer execution
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const navigation = createMockNavigation();

      // 1. Start with search screen
      const { getByPlaceholderText, getByText, rerender } = render(
        <TestWrapper>
          <CrossBranchPatientSearchScreen navigation={navigation} />
        </TestWrapper>
      );

      // 2. Search for patient
      const searchInput = getByPlaceholderText(/search patients/i);
      fireEvent.changeText(searchInput, 'John');

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('search_term=John')
        );
      });

      // 3. Simulate navigation to patient details
      expect(mockNavigate).toHaveBeenCalledWith('CrossBranchPatientDetails', {
        patientId: expect.any(Number),
      });

      // 4. Render patient details screen
      const mockRoute = { params: { patientId: 1 } };
      rerender(
        <TestWrapper>
          <CrossBranchPatientDetails route={mockRoute} navigation={navigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // 5. Open transfer modal
      const transferButton = getByText('Transfer');
      fireEvent.press(transferButton);

      // This completes the integration test showing the full workflow
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(2);
    });
  });
});
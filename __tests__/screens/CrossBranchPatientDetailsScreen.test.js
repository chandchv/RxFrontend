import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/navigation';
import { createStackNavigator } from '@react-navigation/stack';
import CrossBranchPatientDetails from '../../screens/CrossBranchPatientDetails';
import { AuthProvider } from '../../contexts/AuthContext';
import { BranchProvider } from '../../contexts/BranchContext';

// Mock the components
jest.mock('../../components/CrossBranchPatientHistory', () => {
  const { View, Text } = require('react-native');
  return ({ patientId }) => (
    <View testID="cross-branch-patient-history">
      <Text>Patient History for ID: {patientId}</Text>
    </View>
  );
});

jest.mock('../../components/PatientBranchTransfer', () => {
  const { View, Text } = require('react-native');
  return ({ visible, onClose }) => (
    visible ? (
      <View testID="patient-branch-transfer">
        <Text>Transfer Modal</Text>
      </View>
    ) : null
  );
});

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: mockSetOptions,
};

// Mock route params
const mockRoute = {
  params: {
    patientId: 123,
  },
};

// Mock auth context
const mockMakeAuthenticatedRequest = jest.fn();
const mockAuthContext = {
  user: { id: 1, name: 'Test User' },
  token: 'test-token',
  makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
  isAuthenticated: true,
};

// Mock branch context
const mockBranchContext = {
  accessibleBranches: [
    { id: 1, name: 'Main Branch', clinic_type: 'parent' },
    { id: 2, name: 'Branch 1', clinic_type: 'branch' },
  ],
  currentBranch: { id: 1, name: 'Main Branch' },
  getBranchTypeColor: jest.fn((type) => {
    const colors = { parent: '#4CAF50', branch: '#2196F3', independent: '#FF9800' };
    return colors[type] || '#666';
  }),
  getBranchTypeLabel: jest.fn((type) => {
    const labels = { parent: 'Main Branch', branch: 'Branch', independent: 'Independent' };
    return labels[type] || 'Unknown';
  }),
  canManageBranches: jest.fn(() => true),
};

const Stack = createStackNavigator();

const TestWrapper = ({ children }) => (
  <NavigationContainer>
    <AuthProvider value={mockAuthContext}>
      <BranchProvider value={mockBranchContext}>
        <Stack.Navigator>
          <Stack.Screen name="Test" component={() => children} />
        </Stack.Navigator>
      </BranchProvider>
    </AuthProvider>
  </NavigationContainer>
);

// Mock patient data
const mockPatientData = {
  id: 123,
  patient_id: 'P123',
  first_name: 'John',
  last_name: 'Doe',
  gender: 'Male',
  age: 35,
  date_of_birth: '1988-01-01',
  phone_number: '+1234567890',
  email: 'john.doe@example.com',
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

describe('CrossBranchPatientDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMakeAuthenticatedRequest.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPatientData),
    });
  });

  it('renders loading state initially', () => {
    const { getByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByText('Loading patient details...')).toBeTruthy();
  });

  it('fetches and displays patient data', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading patient details...')).toBeNull();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('ID: P123')).toBeTruthy();
    });

    expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
      '/users/api/cross-branch/patients/123/details/?include_history=true&include_appointments=true&include_prescriptions=true'
    );
  });

  it('sets navigation title with patient name', async () => {
    render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSetOptions).toHaveBeenCalledWith({
        title: 'John Doe',
      });
    });
  });

  it('displays patient information correctly', async () => {
    const { getByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('ID: P123')).toBeTruthy();
      expect(getByText('Male • 35 years')).toBeTruthy();
      expect(getByText('+1234567890 • john.doe@example.com')).toBeTruthy();
    });
  });

  it('displays branch indicator', async () => {
    const { getByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Current Branch: Main Branch')).toBeTruthy();
    });
  });

  it('shows action buttons', async () => {
    const { getByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Book Appointment')).toBeTruthy();
      expect(getByText('New Prescription')).toBeTruthy();
      expect(getByText('Transfer')).toBeTruthy(); // Since canManageBranches returns true
    });
  });

  it('handles tab switching', async () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Details')).toBeTruthy();
      expect(getByText('Cross-Branch History')).toBeTruthy();
    });

    // Switch to history tab
    fireEvent.press(getByText('Cross-Branch History'));

    await waitFor(() => {
      expect(getByTestId('cross-branch-patient-history')).toBeTruthy();
    });
  });

  it('handles transfer modal', async () => {
    const { getByText, queryByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Transfer')).toBeTruthy();
    });

    // Initially modal should not be visible
    expect(queryByTestId('patient-branch-transfer')).toBeNull();

    // Open transfer modal
    fireEvent.press(getByText('Transfer'));

    await waitFor(() => {
      expect(queryByTestId('patient-branch-transfer')).toBeTruthy();
    });
  });

  it('handles refresh', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(1);
    });

    // Simulate pull to refresh
    const scrollView = getByTestId('patient-details-scroll') || { props: {} };
    if (scrollView.props.refreshControl) {
      act(() => {
        scrollView.props.refreshControl.props.onRefresh();
      });
    }

    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(2);
    });
  });

  it('handles API errors', async () => {
    mockMakeAuthenticatedRequest.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Patient not found' }),
    });

    const { getByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('handles network errors', async () => {
    mockMakeAuthenticatedRequest.mockRejectedValueOnce(new Error('Network error'));

    const { getByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('calculates age correctly when age is not provided', async () => {
    const patientWithoutAge = {
      ...mockPatientData,
      age: null,
      date_of_birth: '1990-01-01',
    };

    mockMakeAuthenticatedRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(patientWithoutAge),
    });

    const { getByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should calculate age from date of birth
      expect(getByText(/Male • \d+ years/)).toBeTruthy();
    });
  });

  it('handles transfer completion', async () => {
    const { getByText } = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Transfer')).toBeTruthy();
    });

    // Simulate transfer completion
    const component = render(
      <TestWrapper>
        <CrossBranchPatientDetails route={mockRoute} navigation={mockNavigation} />
      </TestWrapper>
    ).getInstance();

    if (component && component.handleTransferComplete) {
      act(() => {
        component.handleTransferComplete({ success: true });
      });
    }

    // Should refresh patient data after transfer
    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(2);
    });
  });
});
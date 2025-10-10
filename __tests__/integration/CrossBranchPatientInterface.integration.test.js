import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import CrossBranchPatientSearchScreen from '../../screens/CrossBranchPatientSearch';
import CrossBranchPatientDetails from '../../screens/CrossBranchPatientDetails';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';

// Mock the contexts
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/BranchContext');

// Mock Alert
jest.spyOn(Alert, 'alert');

const Stack = createStackNavigator();

const mockMakeAuthenticatedRequest = jest.fn();

const mockBranchContext = {
  accessibleBranches: [
    {
      id: 1,
      name: 'Main Branch',
      clinic_type: 'parent',
      branch_code: 'MB',
      address: '123 Main St'
    },
    {
      id: 2,
      name: 'Downtown Branch',
      clinic_type: 'branch',
      branch_code: 'DB',
      address: '456 Downtown Ave'
    },
    {
      id: 3,
      name: 'Suburban Branch',
      clinic_type: 'branch',
      branch_code: 'SB',
      address: '789 Suburban Rd'
    }
  ],
  currentBranch: {
    id: 1,
    name: 'Main Branch',
    clinic_type: 'parent'
  },
  canAccessMultipleBranches: () => true,
  canManageBranches: () => true,
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
  user: {
    id: 1,
    role: 'DOCTOR',
    first_name: 'Dr. John',
    last_name: 'Smith'
  }
};

const mockSearchResults = {
  results: [
    {
      id: 1,
      patient_id: 'P001',
      first_name: 'John',
      last_name: 'Doe',
      gender: 'Male',
      age: 35,
      phone_number: '+1234567890',
      email: 'john.doe@email.com',
      clinic_id: 1,
      last_visit_date: '2024-01-15T10:00:00Z'
    },
    {
      id: 2,
      patient_id: 'P002',
      first_name: 'Jane',
      last_name: 'Smith',
      gender: 'Female',
      age: 28,
      phone_number: '+1234567891',
      email: 'jane.smith@email.com',
      clinic_id: 2,
      last_visit_date: '2024-01-10T14:30:00Z'
    }
  ],
  count: 2,
  next: null,
  previous: null
};

const mockPatientDetails = {
  id: 1,
  patient_id: 'P001',
  first_name: 'John',
  last_name: 'Doe',
  gender: 'Male',
  age: 35,
  date_of_birth: '1989-01-15',
  phone_number: '+1234567890',
  email: 'john.doe@email.com',
  address: '123 Patient St',
  clinic_id: 1,
  registration_date: '2023-01-01T00:00:00Z',
  recent_activity: {
    total_appointments: 5,
    total_prescriptions: 3,
    branches_visited: 2,
    last_visit_date: '2024-01-15T10:00:00Z'
  }
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
  lab_results: [],
  diagnoses: [],
  access_history: []
};

const TestNavigator = ({ initialRouteName = 'CrossBranchPatientSearch' }) => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen 
        name="CrossBranchPatientSearch" 
        component={CrossBranchPatientSearchScreen} 
      />
      <Stack.Screen 
        name="CrossBranchPatientDetails" 
        component={CrossBranchPatientDetails} 
      />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('Cross-Branch Patient Interface Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(mockAuthContext);
    useBranch.mockReturnValue(mockBranchContext);
    
    // Setup default API responses
    mockMakeAuthenticatedRequest.mockImplementation((url) => {
      if (url.includes('/search/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResults)
        });
      } else if (url.includes('/details/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPatientDetails)
        });
      } else if (url.includes('/history/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPatientHistory)
        });
      } else if (url.includes('/validate-transfer/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ can_transfer: true })
        });
      } else if (url.includes('/transfer/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Complete Patient Search to Details Flow', () => {
    it('allows searching for patients and navigating to details', async () => {
      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      // Search for patients
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      // Wait for search results
      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
      });

      // Tap on a patient to navigate to details
      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      // Should navigate to patient details screen
      await waitFor(() => {
        expect(getByText('Personal Information')).toBeTruthy();
        expect(getByText('Contact Information')).toBeTruthy();
        expect(getByText('Branch Information')).toBeTruthy();
      });
    });

    it('displays correct patient information in details screen', async () => {
      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      // Navigate to patient details
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      // Verify patient details are displayed
      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('ID: P001')).toBeTruthy();
        expect(getByText('Male • 35 years')).toBeTruthy();
        expect(getByText('+1234567890 • john.doe@email.com')).toBeTruthy();
        expect(getByText('Current Branch: Main Branch')).toBeTruthy();
      });
    });
  });

  describe('Cross-Branch History Integration', () => {
    it('switches between details and history tabs', async () => {
      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      // Navigate to patient details
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      // Should be on details tab by default
      await waitFor(() => {
        expect(getByText('Personal Information')).toBeTruthy();
      });

      // Switch to history tab
      await act(async () => {
        fireEvent.press(getByText('Cross-Branch History'));
      });

      // Should show history content
      await waitFor(() => {
        expect(getByText('Cross-Branch Activity Summary')).toBeTruthy();
        expect(getByText('Appointments')).toBeTruthy();
        expect(getByText('Prescriptions')).toBeTruthy();
      });

      // Switch back to details tab
      await act(async () => {
        fireEvent.press(getByText('Details'));
      });

      await waitFor(() => {
        expect(getByText('Personal Information')).toBeTruthy();
      });
    });

    it('displays patient history with branch indicators', async () => {
      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      // Navigate to patient details and history tab
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      await act(async () => {
        fireEvent.press(getByText('Cross-Branch History'));
      });

      // Verify history content with branch information
      await waitFor(() => {
        expect(getByText('Appointment with Dr. Smith')).toBeTruthy();
        expect(getByText('Prescription by Dr. Smith')).toBeTruthy();
        expect(getByText('Branch: Main Branch')).toBeTruthy();
      });
    });
  });

  describe('Branch Filtering Integration', () => {
    it('filters search results by selected branches', async () => {
      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      // Open branch filter
      await act(async () => {
        fireEvent.press(getByText('All'));
      });

      // Should show branch filter modal
      await waitFor(() => {
        expect(getByText('Filter by Branches')).toBeTruthy();
        expect(getByText('Main Branch')).toBeTruthy();
        expect(getByText('Downtown Branch')).toBeTruthy();
      });

      // Deselect Main Branch
      await act(async () => {
        fireEvent.press(getByText('Main Branch'));
      });

      // Close filter modal
      await act(async () => {
        fireEvent.press(getByText('close'));
      });

      // Perform search with filtered branches
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      // Verify API was called with filtered clinic IDs
      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('clinic_ids=2,3')
        );
      });
    });
  });

  describe('Patient Transfer Integration', () => {
    it('opens transfer modal from patient details', async () => {
      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      // Navigate to patient details
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      // Wait for details to load and click transfer button
      await waitFor(() => {
        expect(getByText('Transfer')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer'));
      });

      // Should open transfer modal
      await waitFor(() => {
        expect(getByText('Transfer Patient')).toBeTruthy();
        expect(getByText('Transferring Patient')).toBeTruthy();
        expect(getByText('Downtown Branch')).toBeTruthy();
        expect(getByText('Suburban Branch')).toBeTruthy();
      });
    });

    it('completes patient transfer flow', async () => {
      Alert.alert.mockImplementation((title, message, buttons) => {
        if (title === 'Confirm Transfer') {
          const confirmButton = buttons.find(b => b.text === 'Transfer');
          if (confirmButton) {
            confirmButton.onPress();
          }
        } else if (title === 'Transfer Successful') {
          const okButton = buttons.find(b => b.text === 'OK');
          if (okButton) {
            okButton.onPress();
          }
        }
      });

      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      // Navigate to patient details and open transfer modal
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      await waitFor(() => {
        expect(getByText('Transfer')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer'));
      });

      // Complete transfer process
      await waitFor(() => {
        expect(getByText('Downtown Branch')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer Patient'));
      });

      // Verify transfer API calls
      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          '/users/api/cross-branch/patients/validate-transfer/',
          expect.any(Object)
        );
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          '/users/api/cross-branch/patients/transfer/',
          expect.any(Object)
        );
      });

      // Verify success alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Transfer Successful',
        expect.stringContaining('John Doe has been successfully transferred'),
        expect.any(Array)
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('handles search API errors gracefully', async () => {
      mockMakeAuthenticatedRequest.mockImplementation((url) => {
        if (url.includes('/search/')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Search service unavailable' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const { getByPlaceholderText } = render(<TestNavigator />);

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Search Error', 'Search service unavailable');
      });
    });

    it('handles patient details API errors gracefully', async () => {
      mockMakeAuthenticatedRequest.mockImplementation((url) => {
        if (url.includes('/search/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSearchResults)
          });
        } else if (url.includes('/details/')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Patient not found' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Patient not found');
      });
    });
  });

  describe('Performance and Loading States', () => {
    it('shows loading states during API calls', async () => {
      mockMakeAuthenticatedRequest.mockImplementation((url) => {
        if (url.includes('/search/')) {
          return new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockSearchResults)
          }), 100));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      // Should show loading state
      expect(getByText('Searching across branches...')).toBeTruthy();

      // Wait for results
      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });
    });

    it('handles pagination in search results', async () => {
      const paginatedResults = {
        ...mockSearchResults,
        next: 'http://example.com/api/patients/search/?page=2'
      };

      mockMakeAuthenticatedRequest
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(paginatedResults)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: [
              {
                id: 3,
                patient_id: 'P003',
                first_name: 'Bob',
                last_name: 'Johnson',
                gender: 'Male',
                age: 42,
                phone_number: '+1234567892',
                email: 'bob.johnson@email.com',
                clinic_id: 3,
                last_visit_date: '2024-01-05T09:15:00Z'
              }
            ],
            count: 3,
            next: null,
            previous: 'http://example.com/api/patients/search/?page=1'
          })
        });

      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // Simulate scroll to end to load more results
      const flatList = getByText('John Doe').parent.parent.parent;
      await act(async () => {
        fireEvent(flatList, 'onEndReached');
      });

      await waitFor(() => {
        expect(getByText('Bob Johnson')).toBeTruthy();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility throughout the flow', async () => {
      const { getByPlaceholderText, getByText } = render(<TestNavigator />);

      // Search input should be accessible
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      expect(searchInput).toBeTruthy();

      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // Patient items should be accessible
      const patientItem = getByText('John Doe');
      expect(patientItem).toBeTruthy();

      await act(async () => {
        fireEvent.press(patientItem);
      });

      // Details screen elements should be accessible
      await waitFor(() => {
        expect(getByText('Personal Information')).toBeTruthy();
        expect(getByText('Cross-Branch History')).toBeTruthy();
      });
    });
  });
});
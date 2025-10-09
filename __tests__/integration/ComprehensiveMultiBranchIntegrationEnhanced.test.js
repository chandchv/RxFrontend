import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens and components
import BranchManagementScreen from '../../screens/BranchManagementScreen';
import CreateBranchScreen from '../../screens/CreateBranchScreen';
import CrossBranchPatientSearch from '../../screens/CrossBranchPatientSearch';
import CrossBranchPatientDetails from '../../screens/CrossBranchPatientDetails';
import ConsolidatedReportingScreen from '../../screens/ConsolidatedReportingScreen';

// Import components
import BranchSelector from '../../components/BranchSelector';
import BranchPermissionsManager from '../../components/BranchPermissionsManager';
import CrossBranchPatientHistory from '../../components/CrossBranchPatientHistory';
import PatientBranchTransfer from '../../components/PatientBranchTransfer';
import OrganizationManagement from '../../components/OrganizationManagement';
import BranchContextIndicator from '../../components/BranchContextIndicator';

// Import contexts
import { AuthProvider } from '../../contexts/AuthContext';
import { BranchProvider } from '../../contexts/BranchContext';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
  PieChart: 'PieChart',
}));

jest.mock('@react-native-picker/picker', () => ({
  Picker: ({ children, onValueChange, selectedValue, testID }) => {
    const MockPicker = require('react-native').TouchableOpacity;
    return (
      <MockPicker 
        testID={testID || "picker"} 
        onPress={() => onValueChange && onValueChange('branch1')}
      >
        {children}
      </MockPicker>
    );
  },
  'Picker.Item': ({ label, value }) => {
    const MockItem = require('react-native').Text;
    return <MockItem testID={`picker-item-${value}`}>{label}</MockItem>;
  }
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
  if (buttons && buttons.length > 0) {
    // Simulate pressing the first button
    if (buttons[0].onPress) {
      buttons[0].onPress();
    }
  }
});

// Mock API calls
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../utils/apiClient', () => mockApiClient);

// Mock data
const mockOrganization = {
  id: 1,
  name: 'Healthcare Network Inc',
  registration_number: 'HN2025001',
  headquarters_address: '123 Healthcare Ave, Medical City',
  contact_email: 'contact@healthcare.com',
  contact_phone: '+1234567890'
};

const mockParentClinic = {
  id: 1,
  name: 'Main Healthcare Center',
  registration_number: 'MHC001',
  address: '123 Main St, Medical City',
  phone_number: '+1234567890',
  email: 'main@healthcare.com',
  organization: mockOrganization.id,
  clinic_type: 'parent'
};

const mockBranchClinics = [
  {
    id: 2,
    name: 'Downtown Branch',
    registration_number: 'MHC002',
    address: '456 Downtown St, Medical City',
    phone_number: '+1234567891',
    email: 'downtown@healthcare.com',
    organization: mockOrganization.id,
    parent_clinic: mockParentClinic.id,
    clinic_type: 'branch',
    branch_code: 'DT001'
  },
  {
    id: 3,
    name: 'Uptown Branch',
    registration_number: 'MHC003',
    address: '789 Uptown Ave, Medical City',
    phone_number: '+1234567892',
    email: 'uptown@healthcare.com',
    organization: mockOrganization.id,
    parent_clinic: mockParentClinic.id,
    clinic_type: 'branch',
    branch_code: 'UT001'
  }
];

const mockPatients = [
  {
    id: 1,
    patient_id: 'P001',
    first_name: 'John',
    last_name: 'Doe',
    gender: 'Male',
    date_of_birth: '1985-01-01',
    phone_number: '+1234567890',
    email: 'john.doe@email.com',
    address: '123 Patient St',
    clinic: mockParentClinic.id
  },
  {
    id: 2,
    patient_id: 'P002',
    first_name: 'Jane',
    last_name: 'Smith',
    gender: 'Female',
    date_of_birth: '1990-05-15',
    phone_number: '+1234567891',
    email: 'jane.smith@email.com',
    address: '456 Patient Ave',
    clinic: mockBranchClinics[0].id
  }
];

const mockUser = {
  id: 1,
  username: 'doctor_user',
  email: 'doctor@test.com',
  first_name: 'Dr. John',
  last_name: 'Smith',
  current_tenant: mockParentClinic.id
};

// Test wrapper component
const TestWrapper = ({ children }) => {
  const Stack = createStackNavigator();
  
  return (
    <NavigationContainer>
      <AuthProvider>
        <BranchProvider>
          <Stack.Navigator>
            <Stack.Screen name="Test" component={() => children} />
          </Stack.Navigator>
        </BranchProvider>
      </AuthProvider>
    </NavigationContainer>
  );
};

describe('Comprehensive Multi-Branch Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockUser));
    
    // Setup default API responses
    mockApiClient.get.mockImplementation((url) => {
      if (url.includes('/accessible_clinics')) {
        return Promise.resolve({
          data: {
            accessible_clinics: [mockParentClinic, ...mockBranchClinics],
            current_clinic: mockParentClinic
          }
        });
      }
      if (url.includes('/cross_branch_patient_search')) {
        return Promise.resolve({
          data: {
            results: mockPatients,
            total_results: mockPatients.length,
            accessible_clinics: [mockParentClinic, ...mockBranchClinics]
          }
        });
      }
      if (url.includes('/consolidated_reports')) {
        return Promise.resolve({
          data: {
            report_type: 'summary',
            generated_at: new Date().toISOString(),
            generated_by: mockUser.username,
            clinics_included: [mockParentClinic, ...mockBranchClinics],
            summary_statistics: {
              total_patients: 150,
              total_appointments: 75,
              total_revenue: 25000
            },
            clinic_breakdown: [
              { clinic: mockParentClinic, patients: 50, appointments: 25, revenue: 10000 },
              { clinic: mockBranchClinics[0], patients: 60, appointments: 30, revenue: 8000 },
              { clinic: mockBranchClinics[1], patients: 40, appointments: 20, revenue: 7000 }
            ]
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    
    mockApiClient.post.mockImplementation((url, data) => {
      if (url.includes('/branch_switch')) {
        return Promise.resolve({
          data: {
            success: true,
            current_clinic: mockBranchClinics[0],
            message: 'Branch switched successfully'
          }
        });
      }
      if (url.includes('/branch-clinic-list')) {
        return Promise.resolve({
          data: {
            id: 4,
            ...data,
            created_at: new Date().toISOString()
          }
        });
      }
      return Promise.resolve({ data: { success: true } });
    });
  });

  describe('End-to-End Branch Management Workflows', () => {
    test('should complete branch creation workflow', async () => {
      const mockNavigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
        setOptions: jest.fn(),
      };

      const { getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <CreateBranchScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(queryByText('Create New Branch')).toBeTruthy();
      });

      // Fill in branch details
      const nameInput = getByTestId('branch-name-input');
      const registrationInput = getByTestId('branch-registration-input');
      const addressInput = getByTestId('branch-address-input');
      const phoneInput = getByTestId('branch-phone-input');
      const emailInput = getByTestId('branch-email-input');

      fireEvent.changeText(nameInput, 'Test Branch');
      fireEvent.changeText(registrationInput, 'TB001');
      fireEvent.changeText(addressInput, '123 Test St');
      fireEvent.changeText(phoneInput, '+1234567890');
      fireEvent.changeText(emailInput, 'test@branch.com');

      // Select parent clinic
      const parentClinicPicker = getByTestId('parent-clinic-picker');
      fireEvent.press(parentClinicPicker);

      // Submit form
      const createButton = getByTestId('create-branch-button');
      fireEvent.press(createButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/branch-clinic-list'),
          expect.objectContaining({
            name: 'Test Branch',
            registration_number: 'TB001',
            address: '123 Test St',
            phone_number: '+1234567890',
            email: 'test@branch.com'
          })
        );
      });

      // Verify success message
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Branch created successfully',
        expect.any(Array)
      );
    });

    test('should handle branch switching workflow', async () => {
      const mockNavigation = {
        navigate: jest.fn(),
        setOptions: jest.fn(),
      };

      const { getByTestId, getByText } = render(
        <TestWrapper>
          <BranchManagementScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // Wait for branches to load
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/accessible_clinics')
        );
      });

      // Find and press branch switch button
      const branchSwitchButton = getByTestId('branch-switch-button-2');
      fireEvent.press(branchSwitchButton);

      // Verify switch API call
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/branch_switch'),
          { target_clinic_id: 2 }
        );
      });

      // Verify success feedback
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Branch switched successfully'
      );
    });

    test('should display organization management interface', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <OrganizationManagement organizationId={mockOrganization.id} />
        </TestWrapper>
      );

      // Wait for organization data to load
      await waitFor(() => {
        expect(queryByText('Healthcare Network Inc')).toBeTruthy();
      });

      // Verify organization details are displayed
      expect(getByText('Healthcare Network Inc')).toBeTruthy();
      expect(getByText('HN2025001')).toBeTruthy();
      expect(getByText('contact@healthcare.com')).toBeTruthy();

      // Test adding new administrator
      const addAdminButton = getByTestId('add-admin-button');
      fireEvent.press(addAdminButton);

      // Verify modal opens
      await waitFor(() => {
        expect(queryByText('Add Administrator')).toBeTruthy();
      });
    });
  });

  describe('Cross-Branch Patient Data Access', () => {
    test('should perform cross-branch patient search', async () => {
      const mockNavigation = {
        navigate: jest.fn(),
        setOptions: jest.fn(),
      };

      const { getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <CrossBranchPatientSearch navigation={mockNavigation} />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(queryByText('Search Patients')).toBeTruthy();
      });

      // Perform search
      const searchInput = getByTestId('patient-search-input');
      fireEvent.changeText(searchInput, 'John');

      const searchButton = getByTestId('search-button');
      fireEvent.press(searchButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/cross_branch_patient_search?search_term=John')
        );
      });

      // Verify search results are displayed
      await waitFor(() => {
        expect(queryByText('John Doe')).toBeTruthy();
        expect(queryByText('Jane Smith')).toBeTruthy();
      });

      // Test patient selection
      const patientItem = getByTestId('patient-item-1');
      fireEvent.press(patientItem);

      // Verify navigation to patient details
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'CrossBranchPatientDetails',
        { patientId: 1 }
      );
    });

    test('should display cross-branch patient history', async () => {
      const mockPatientHistory = {
        patient_id: 1,
        patient_name: 'John Doe',
        appointments: [
          {
            id: 1,
            date: '2024-01-15',
            clinic: mockParentClinic,
            doctor: 'Dr. Smith',
            diagnosis: 'Regular checkup'
          }
        ],
        prescriptions: [
          {
            id: 1,
            date: '2024-01-15',
            medication: 'Aspirin',
            dosage: '100mg',
            clinic: mockParentClinic
          }
        ],
        summary: {
          total_visits: 5,
          last_visit: '2024-01-15',
          clinics_visited: [mockParentClinic, mockBranchClinics[0]]
        }
      };

      mockApiClient.get.mockImplementation((url) => {
        if (url.includes('/patient_cross_branch_history')) {
          return Promise.resolve({ data: mockPatientHistory });
        }
        return Promise.resolve({ data: {} });
      });

      const { getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <CrossBranchPatientHistory patientId={1} />
        </TestWrapper>
      );

      // Wait for history to load
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/patient_cross_branch_history/1')
        );
      });

      // Verify patient history is displayed
      await waitFor(() => {
        expect(queryByText('John Doe')).toBeTruthy();
        expect(queryByText('Regular checkup')).toBeTruthy();
        expect(queryByText('Aspirin')).toBeTruthy();
        expect(queryByText('Total Visits: 5')).toBeTruthy();
      });

      // Test timeline view
      const timelineTab = getByTestId('timeline-tab');
      fireEvent.press(timelineTab);

      await waitFor(() => {
        expect(queryByText('Timeline View')).toBeTruthy();
      });
    });

    test('should handle patient branch transfer', async () => {
      const mockTransferValidation = {
        can_transfer: true,
        validation_checks: {
          permissions: true,
          target_clinic_capacity: true,
          patient_consent: true
        },
        potential_issues: []
      };

      mockApiClient.post.mockImplementation((url, data) => {
        if (url.includes('/validate_patient_transfer')) {
          return Promise.resolve({ data: mockTransferValidation });
        }
        if (url.includes('/transfer_patient')) {
          return Promise.resolve({
            data: {
              success: true,
              transfer_id: 'T001',
              message: 'Patient transferred successfully'
            }
          });
        }
        return Promise.resolve({ data: { success: true } });
      });

      const { getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <PatientBranchTransfer 
            patientId={1} 
            currentClinicId={mockParentClinic.id}
            availableClinics={mockBranchClinics}
          />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(queryByText('Transfer Patient')).toBeTruthy();
      });

      // Select target clinic
      const targetClinicPicker = getByTestId('target-clinic-picker');
      fireEvent.press(targetClinicPicker);

      // Fill transfer reason
      const reasonInput = getByTestId('transfer-reason-input');
      fireEvent.changeText(reasonInput, 'Patient relocation');

      // Fill transfer notes
      const notesInput = getByTestId('transfer-notes-input');
      fireEvent.changeText(notesInput, 'Patient moved to downtown area');

      // Validate transfer
      const validateButton = getByTestId('validate-transfer-button');
      fireEvent.press(validateButton);

      // Wait for validation
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/validate_patient_transfer'),
          expect.objectContaining({
            patient_id: 1,
            target_clinic_id: expect.any(Number)
          })
        );
      });

      // Execute transfer
      const transferButton = getByTestId('execute-transfer-button');
      fireEvent.press(transferButton);

      // Verify transfer API call
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/transfer_patient'),
          expect.objectContaining({
            patient_id: 1,
            transfer_reason: 'Patient relocation',
            transfer_notes: 'Patient moved to downtown area'
          })
        );
      });

      // Verify success message
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Patient transferred successfully'
      );
    });
  });

  describe('Consolidated Reporting Dashboard', () => {
    test('should display consolidated reporting dashboard', async () => {
      const mockNavigation = {
        navigate: jest.fn(),
        setOptions: jest.fn(),
      };

      const { getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <ConsolidatedReportingScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // Wait for reports to load
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/consolidated_reports')
        );
      });

      // Verify dashboard elements are displayed
      await waitFor(() => {
        expect(queryByText('Consolidated Reports')).toBeTruthy();
        expect(queryByText('Total Patients: 150')).toBeTruthy();
        expect(queryByText('Total Appointments: 75')).toBeTruthy();
        expect(queryByText('Total Revenue: $25,000')).toBeTruthy();
      });

      // Test branch selection for filtering
      const branchFilter = getByTestId('branch-filter-picker');
      fireEvent.press(branchFilter);

      // Test date range selection
      const dateRangePicker = getByTestId('date-range-picker');
      fireEvent.press(dateRangePicker);

      // Test report export
      const exportButton = getByTestId('export-report-button');
      fireEvent.press(exportButton);

      // Verify export options are shown
      await waitFor(() => {
        expect(queryByText('Export Options')).toBeTruthy();
      });
    });

    test('should generate custom reports', async () => {
      const mockCustomReport = {
        report_id: 'CR001',
        report_name: 'Custom Performance Report',
        data: {
          metrics: {
            patient_satisfaction: 4.5,
            appointment_efficiency: 85,
            revenue_growth: 12
          },
          charts: [
            {
              type: 'line',
              title: 'Patient Volume Trend',
              data: [10, 15, 12, 18, 20, 25]
            }
          ]
        },
        generated_at: new Date().toISOString()
      };

      mockApiClient.post.mockImplementation((url, data) => {
        if (url.includes('/generate_custom_report')) {
          return Promise.resolve({ data: mockCustomReport });
        }
        return Promise.resolve({ data: { success: true } });
      });

      const { getByTestId, getByText, queryByText } = render(
        <TestWrapper>
          <ConsolidatedReportingScreen navigation={{}} />
        </TestWrapper>
      );

      // Open custom report modal
      const customReportButton = getByTestId('custom-report-button');
      fireEvent.press(customReportButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(queryByText('Create Custom Report')).toBeTruthy();
      });

      // Fill report configuration
      const reportNameInput = getByTestId('report-name-input');
      fireEvent.changeText(reportNameInput, 'Custom Performance Report');

      // Select metrics
      const patientCountMetric = getByTestId('metric-patient-count');
      fireEvent.press(patientCountMetric);

      const revenueMetric = getByTestId('metric-revenue');
      fireEvent.press(revenueMetric);

      // Generate report
      const generateButton = getByTestId('generate-report-button');
      fireEvent.press(generateButton);

      // Verify API call
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/generate_custom_report'),
          expect.objectContaining({
            report_name: 'Custom Performance Report',
            metrics: expect.arrayContaining(['patient_count', 'revenue'])
          })
        );
      });

      // Verify report is displayed
      await waitFor(() => {
        expect(queryByText('Custom Performance Report')).toBeTruthy();
        expect(queryByText('Patient Satisfaction: 4.5')).toBeTruthy();
      });
    });
  });

  describe('Performance and User Experience', () => {
    test('should handle loading states properly', async () => {
      // Mock slow API response
      mockApiClient.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { accessible_clinics: [] } }), 1000)
        )
      );

      const { getByTestId, queryByText } = render(
        <TestWrapper>
          <BranchManagementScreen navigation={{}} />
        </TestWrapper>
      );

      // Verify loading indicator is shown
      expect(queryByText('Loading branches...')).toBeTruthy();

      // Wait for loading to complete
      await waitFor(() => {
        expect(queryByText('Loading branches...')).toBeFalsy();
      }, { timeout: 2000 });
    });

    test('should handle error states gracefully', async () => {
      // Mock API error
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      const { getByTestId, queryByText } = render(
        <TestWrapper>
          <BranchManagementScreen navigation={{}} />
        </TestWrapper>
      );

      // Wait for error to be handled
      await waitFor(() => {
        expect(queryByText('Error loading branches')).toBeTruthy();
      });

      // Test retry functionality
      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);

      // Verify retry attempt
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });

    test('should provide offline functionality', async () => {
      // Mock offline state
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'cached_branches') {
          return Promise.resolve(JSON.stringify(mockBranchClinics));
        }
        if (key === 'cached_patients') {
          return Promise.resolve(JSON.stringify(mockPatients));
        }
        return Promise.resolve(null);
      });

      // Mock network error
      mockApiClient.get.mockRejectedValue(new Error('Network unavailable'));

      const { getByTestId, queryByText } = render(
        <TestWrapper>
          <BranchManagementScreen navigation={{}} />
        </TestWrapper>
      );

      // Wait for offline data to load
      await waitFor(() => {
        expect(queryByText('Offline Mode')).toBeTruthy();
        expect(queryByText('Downtown Branch')).toBeTruthy();
      });

      // Verify cached data is displayed
      expect(queryByText('Uptown Branch')).toBeTruthy();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('should work consistently across different screen sizes', async () => {
      // Mock different screen dimensions
      const mockDimensions = [
        { width: 375, height: 667 }, // iPhone SE
        { width: 414, height: 896 }, // iPhone 11
        { width: 768, height: 1024 }, // iPad
      ];

      for (const dimensions of mockDimensions) {
        // Mock Dimensions API
        jest.doMock('react-native', () => ({
          ...jest.requireActual('react-native'),
          Dimensions: {
            get: () => dimensions
          }
        }));

        const { getByTestId, queryByText } = render(
          <TestWrapper>
            <BranchManagementScreen navigation={{}} />
          </TestWrapper>
        );

        // Verify responsive layout
        await waitFor(() => {
          expect(queryByText('Branch Management')).toBeTruthy();
        });

        // Verify components adapt to screen size
        const branchList = getByTestId('branch-list');
        expect(branchList).toBeTruthy();
      }
    });

    test('should handle different platform-specific behaviors', async () => {
      // Test iOS-specific behavior
      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Platform: {
          OS: 'ios',
          select: (obj) => obj.ios
        }
      }));

      const { getByTestId } = render(
        <TestWrapper>
          <BranchContextIndicator currentBranch={mockBranchClinics[0]} />
        </TestWrapper>
      );

      // Verify iOS-specific styling
      const contextIndicator = getByTestId('branch-context-indicator');
      expect(contextIndicator).toBeTruthy();

      // Test Android-specific behavior
      jest.doMock('react-native', () => ({
        ...jest.requireActual('react-native'),
        Platform: {
          OS: 'android',
          select: (obj) => obj.android
        }
      }));

      const { getByTestId: getByTestIdAndroid } = render(
        <TestWrapper>
          <BranchContextIndicator currentBranch={mockBranchClinics[0]} />
        </TestWrapper>
      );

      // Verify Android-specific styling
      const contextIndicatorAndroid = getByTestIdAndroid('branch-context-indicator');
      expect(contextIndicatorAndroid).toBeTruthy();
    });
  });

  describe('Accessibility and Usability', () => {
    test('should provide proper accessibility labels', async () => {
      const { getByLabelText, getByTestId } = render(
        <TestWrapper>
          <BranchSelector 
            branches={mockBranchClinics}
            selectedBranch={mockBranchClinics[0]}
            onBranchSelect={jest.fn()}
          />
        </TestWrapper>
      );

      // Verify accessibility labels
      expect(getByLabelText('Select branch')).toBeTruthy();
      expect(getByLabelText('Downtown Branch')).toBeTruthy();
      expect(getByLabelText('Uptown Branch')).toBeTruthy();
    });

    test('should support keyboard navigation', async () => {
      const mockOnSelect = jest.fn();

      const { getByTestId } = render(
        <TestWrapper>
          <BranchSelector 
            branches={mockBranchClinics}
            selectedBranch={mockBranchClinics[0]}
            onBranchSelect={mockOnSelect}
          />
        </TestWrapper>
      );

      // Simulate keyboard navigation
      const branchSelector = getByTestId('branch-selector');
      
      // Test focus
      fireEvent(branchSelector, 'focus');
      
      // Test selection with keyboard
      fireEvent(branchSelector, 'keyPress', { nativeEvent: { key: 'Enter' } });
      
      expect(mockOnSelect).toHaveBeenCalled();
    });
  });
});

// Performance testing utilities
describe('Performance Tests', () => {
  test('should render branch list efficiently with large datasets', async () => {
    // Create large dataset
    const largeBranchList = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `Branch ${index + 1}`,
      registration_number: `BR${String(index + 1).padStart(3, '0')}`,
      address: `${index + 1} Branch St`,
      phone_number: `+123456${String(index).padStart(4, '0')}`,
      email: `branch${index + 1}@healthcare.com`,
      clinic_type: 'branch'
    }));

    mockApiClient.get.mockResolvedValue({
      data: {
        accessible_clinics: largeBranchList,
        current_clinic: largeBranchList[0]
      }
    });

    const startTime = Date.now();

    const { getByTestId } = render(
      <TestWrapper>
        <BranchManagementScreen navigation={{}} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByTestId('branch-list')).toBeTruthy();
    });

    const renderTime = Date.now() - startTime;
    
    // Assert render time is reasonable (less than 2 seconds)
    expect(renderTime).toBeLessThan(2000);
  });

  test('should handle rapid user interactions without performance degradation', async () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <TestWrapper>
        <BranchSelector 
          branches={mockBranchClinics}
          selectedBranch={mockBranchClinics[0]}
          onBranchSelect={mockOnPress}
        />
      </TestWrapper>
    );

    const branchSelector = getByTestId('branch-selector');

    // Simulate rapid clicks
    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      fireEvent.press(branchSelector);
    }
    const endTime = Date.now();

    // Verify all interactions were handled
    expect(mockOnPress).toHaveBeenCalledTimes(10);
    
    // Verify response time is reasonable
    const avgResponseTime = (endTime - startTime) / 10;
    expect(avgResponseTime).toBeLessThan(100); // Less than 100ms per interaction
  });
});
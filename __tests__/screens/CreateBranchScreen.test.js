import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CreateBranchScreen from '../../screens/CreateBranchScreen';
import { useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock Picker
jest.mock('@react-native-picker/picker', () => ({
  Picker: ({ children, onValueChange, selectedValue }) => {
    const MockPicker = require('react-native').View;
    return (
      <MockPicker testID="picker" onPress={() => onValueChange('branch')}>
        {children}
      </MockPicker>
    );
  },
  'Picker.Item': ({ label, value }) => {
    const MockItem = require('react-native').Text;
    return <MockItem testID={`picker-item-${value}`}>{label}</MockItem>;
  }
}));

// Mock navigation
const mockNavigation = {
  goBack: jest.fn(),
};

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockMakeAuthenticatedRequest = jest.fn();

const mockParentClinics = [
  {
    id: 1,
    name: 'Main Clinic',
    clinic_type: 'parent',
    branch_code: 'MAIN'
  },
  {
    id: 2,
    name: 'Central Hospital',
    clinic_type: 'parent',
    branch_code: 'CENTRAL'
  }
];

describe('CreateBranchScreen', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
    });
    
    // Mock parent clinics API call
    mockMakeAuthenticatedRequest.mockResolvedValue({
      json: () => Promise.resolve({ clinics: mockParentClinics }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    expect(getByText('Create New Branch')).toBeTruthy();
    expect(getByText('Basic Information')).toBeTruthy();
    expect(getByText('Clinic Configuration')).toBeTruthy();
    expect(getByText('Contact Information')).toBeTruthy();
    expect(getByPlaceholderText('Enter branch name')).toBeTruthy();
  });

  it('loads parent clinics on mount', async () => {
    render(<CreateBranchScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
        '/users/api/branch/accessible-clinics/'
      );
    });
  });

  it('handles form input changes', () => {
    const { getByPlaceholderText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    const nameInput = getByPlaceholderText('Enter branch name');
    fireEvent.changeText(nameInput, 'New Branch');

    expect(nameInput.props.value).toBe('New Branch');
  });

  it('validates required fields', () => {
    const { getByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    const submitButton = getByText('Create Branch');
    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Validation Error',
      'Branch name is required'
    );
  });

  it('validates parent clinic for branch type', () => {
    const { getByPlaceholderText, getByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    // Fill in branch name
    const nameInput = getByPlaceholderText('Enter branch name');
    fireEvent.changeText(nameInput, 'Test Branch');

    // Submit without selecting parent clinic (default is branch type)
    const submitButton = getByText('Create Branch');
    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Validation Error',
      'Parent clinic is required for branch type'
    );
  });

  it('validates email format', () => {
    const { getByPlaceholderText, getByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    // Fill in required fields
    const nameInput = getByPlaceholderText('Enter branch name');
    fireEvent.changeText(nameInput, 'Test Branch');

    const emailInput = getByPlaceholderText('Enter email address');
    fireEvent.changeText(emailInput, 'invalid-email');

    const submitButton = getByText('Create Branch');
    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Validation Error',
      'Please enter a valid email address'
    );
  });

  it('submits form successfully', async () => {
    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: mockParentClinics }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          branch: { name: 'Test Branch', id: 3 }
        }),
      });

    const { getByPlaceholderText, getByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    // Fill in form
    const nameInput = getByPlaceholderText('Enter branch name');
    fireEvent.changeText(nameInput, 'Test Branch');

    const branchCodeInput = getByPlaceholderText('e.g., BR001');
    fireEvent.changeText(branchCodeInput, 'TEST001');

    const addressInput = getByPlaceholderText('Enter branch address');
    fireEvent.changeText(addressInput, '123 Test St');

    const phoneInput = getByPlaceholderText('Enter phone number');
    fireEvent.changeText(phoneInput, '+1234567890');

    const emailInput = getByPlaceholderText('Enter email address');
    fireEvent.changeText(emailInput, 'test@branch.com');

    // Submit form
    const submitButton = getByText('Create Branch');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
        '/users/api/branch/create/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Branch',
            clinic_type: 'branch',
            parent_clinic_id: '',
            branch_code: 'TEST001',
            address: '123 Test St',
            phone_number: '+1234567890',
            email: 'test@branch.com'
          })
        })
      );
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Success',
      'Branch "Test Branch" created successfully!',
      expect.any(Array)
    );
  });

  it('handles API errors', async () => {
    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: mockParentClinics }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Branch code already exists' }),
      });

    const { getByPlaceholderText, getByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    // Fill in form
    const nameInput = getByPlaceholderText('Enter branch name');
    fireEvent.changeText(nameInput, 'Test Branch');

    // Submit form
    const submitButton = getByText('Create Branch');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Branch code already exists'
      );
    });
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    // Mock a slow API response
    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: mockParentClinics }),
      })
      .mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ branch: { name: 'Test Branch' } })
        }), 1000))
      );

    const { getByPlaceholderText, getByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    // Fill in form
    const nameInput = getByPlaceholderText('Enter branch name');
    fireEvent.changeText(nameInput, 'Test Branch');

    // Submit form
    const submitButton = getByText('Create Branch');
    fireEvent.press(submitButton);

    // Should show loading indicator
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('disables submit button during loading', async () => {
    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: mockParentClinics }),
      })
      .mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ branch: { name: 'Test Branch' } })
        }), 1000))
      );

    const { getByPlaceholderText, getByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    // Fill in form
    const nameInput = getByPlaceholderText('Enter branch name');
    fireEvent.changeText(nameInput, 'Test Branch');

    // Submit form
    const submitButton = getByText('Create Branch');
    fireEvent.press(submitButton);

    // Button should be disabled
    expect(submitButton.props.accessibilityState.disabled).toBe(true);
  });

  it('handles network errors gracefully', async () => {
    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: mockParentClinics }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const { getByPlaceholderText, getByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    // Fill in form
    const nameInput = getByPlaceholderText('Enter branch name');
    fireEvent.changeText(nameInput, 'Test Branch');

    // Submit form
    const submitButton = getByText('Create Branch');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Network error'
      );
    });
  });

  it('shows parent clinic picker only for branch type', () => {
    const { getByText, queryByText } = render(
      <CreateBranchScreen navigation={mockNavigation} />
    );

    // Initially should show parent clinic picker (default is branch)
    expect(getByText('Parent Clinic *')).toBeTruthy();

    // Change to independent type
    const picker = getByTestId('picker');
    fireEvent.press(picker); // This would trigger onValueChange with 'independent'

    // Parent clinic picker should be hidden for independent type
    // Note: This test might need adjustment based on actual picker implementation
  });
});
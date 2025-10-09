import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import BranchPermissionsManager from '../../components/BranchPermissionsManager';
import { useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockMakeAuthenticatedRequest = jest.fn();

const mockUserBranchAccess = [
  {
    id: 1,
    user: { id: 2, first_name: 'John', last_name: 'Doe' },
    clinic: { id: 1, name: 'Main Clinic' },
    access_type: 'full',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    granted_by: { first_name: 'Admin', last_name: 'User' }
  },
  {
    id: 2,
    user: { id: 3, first_name: 'Jane', last_name: 'Smith' },
    clinic: { id: 1, name: 'Main Clinic' },
    access_type: 'read_only',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    granted_by: { first_name: 'Admin', last_name: 'User' }
  }
];

const mockAvailableBranches = [
  {
    id: 1,
    name: 'Main Clinic',
    clinic_type: 'parent',
    branch_code: 'MAIN'
  },
  {
    id: 2,
    name: 'Branch A',
    clinic_type: 'branch',
    branch_code: 'BR001'
  }
];

describe('BranchPermissionsManager', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
    });
    
    // Mock API responses
    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ results: mockUserBranchAccess }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: mockAvailableBranches }),
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when visible', () => {
    const { getByText } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    expect(getByText('Branch Permissions')).toBeTruthy();
    expect(getByText('Test User')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <BranchPermissionsManager
        visible={false}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    expect(queryByText('Branch Permissions')).toBeNull();
  });

  it('loads user branch access and available branches on mount', async () => {
    render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
        '/users/api/branch-access/?user=1'
      );
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
        '/users/api/branch/accessible-clinics/'
      );
    });
  });

  it('displays existing branch access correctly', async () => {
    const { getByText } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(getByText('Main Clinic')).toBeTruthy();
      expect(getByText('Branch A')).toBeTruthy();
    });
  });

  it('handles access level changes', async () => {
    mockMakeAuthenticatedRequest.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        id: 1, 
        access_type: 'read_only',
        is_active: true 
      }),
    });

    const { getByTestId } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(getByTestId('access-switch-1')).toBeTruthy();
    });

    fireEvent(getByTestId('access-switch-1'), 'onValueChange', false);

    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
        '/users/api/branch-access/1/',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            access_type: 'full',
            is_active: false
          })
        })
      );
    });
  });

  it('handles new access creation', async () => {
    mockMakeAuthenticatedRequest.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        id: 3, 
        access_type: 'read_only',
        is_active: true 
      }),
    });

    const { getByTestId } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(getByTestId('access-switch-2')).toBeTruthy();
    });

    // Enable access for Branch A (which user doesn't have access to yet)
    fireEvent(getByTestId('access-switch-2'), 'onValueChange', true);

    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
        '/users/api/branch-access/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            user: 1,
            clinic: 2,
            access_type: 'read_only',
            is_active: true
          })
        })
      );
    });
  });

  it('handles access removal', async () => {
    mockMakeAuthenticatedRequest.mockResolvedValue({
      ok: true,
    });

    const { getByTestId } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(getByTestId('remove-access-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('remove-access-1'));

    // Confirm removal in alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove Access',
      'Are you sure you want to remove this branch access?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Remove' })
      ])
    );

    // Simulate user confirming removal
    const alertCall = Alert.alert.mock.calls[0];
    const removeAction = alertCall[2].find(action => action.text === 'Remove');
    await removeAction.onPress();

    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
        '/users/api/branch-access/1/',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  it('displays correct access type colors', async () => {
    const { getByTestId } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      const fullAccessButton = getByTestId('access-type-full-1');
      const readOnlyAccessButton = getByTestId('access-type-read_only-1');
      const emergencyAccessButton = getByTestId('access-type-emergency-1');

      expect(fullAccessButton.props.style).toContain({ borderColor: '#4CAF50' });
      expect(readOnlyAccessButton.props.style).toContain({ borderColor: '#FF9800' });
      expect(emergencyAccessButton.props.style).toContain({ borderColor: '#f44336' });
    });
  });

  it('handles API errors gracefully', async () => {
    mockMakeAuthenticatedRequest.mockRejectedValue(
      new Error('Network error')
    );

    render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load user branch access'
      );
    });
  });

  it('calls onClose when close button is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={mockOnClose}
        userId={1}
        userName="Test User"
      />
    );

    fireEvent.press(getByTestId('close-button'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state while updating permissions', async () => {
    // Mock a slow API response
    mockMakeAuthenticatedRequest.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ ok: true }), 1000))
    );

    const { getByTestId, getByText } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(getByTestId('access-switch-1')).toBeTruthy();
    });

    fireEvent(getByTestId('access-switch-1'), 'onValueChange', false);

    expect(getByText('Updating permissions...')).toBeTruthy();
  });

  it('displays empty state when no branches available', async () => {
    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ results: [] }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: [] }),
      });

    const { getByText } = render(
      <BranchPermissionsManager
        visible={true}
        onClose={jest.fn()}
        userId={1}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(getByText('No branches available')).toBeTruthy();
    });
  });
});
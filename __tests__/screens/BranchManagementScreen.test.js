import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import BranchManagementScreen from '../../screens/BranchManagementScreen';
import { useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock components
jest.mock('../../components/BranchSelector', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ onBranchChange, showCreateButton }) => (
    <View testID="branch-selector">
      <Text>Branch Selector</Text>
      {showCreateButton && (
        <TouchableOpacity 
          testID="create-branch-button"
          onPress={() => onBranchChange({ id: 2, name: 'New Branch' })}
        >
          <Text>Create Branch</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

jest.mock('../../components/BranchContextIndicator', () => {
  const { View, Text } = require('react-native');
  return ({ onBranchPress }) => (
    <View testID="branch-context-indicator">
      <Text>Current Branch Context</Text>
    </View>
  );
});

jest.mock('../../components/BranchHierarchyVisualization', () => {
  const { View, Text } = require('react-native');
  return ({ clinicId, onBranchSelect }) => (
    <View testID="branch-hierarchy">
      <Text>Branch Hierarchy for Clinic {clinicId}</Text>
    </View>
  );
});

jest.mock('../../components/OrganizationManagement', () => {
  const { Modal, View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, onClose }) => (
    <Modal visible={visible} testID="organization-management-modal">
      <View>
        <Text>Organization Management</Text>
        <TouchableOpacity testID="close-org-modal" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

jest.mock('../../components/BranchPermissionsManager', () => {
  const { Modal, View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, onClose, userId, userName }) => (
    <Modal visible={visible} testID="permissions-modal">
      <View>
        <Text>Permissions for {userName}</Text>
        <TouchableOpacity testID="close-permissions-modal" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockMakeAuthenticatedRequest = jest.fn();

const mockBranchData = {
  branch_stats: [
    {
      clinic: {
        id: 1,
        name: 'Main Clinic',
        clinic_type: 'parent',
        branch_code: 'MAIN',
        address: '123 Main St, City'
      },
      total_users: 25,
      active_users: 20,
      total_patients: 150
    },
    {
      clinic: {
        id: 2,
        name: 'Branch A',
        clinic_type: 'branch',
        branch_code: 'BR001',
        address: '456 Branch Ave, City'
      },
      total_users: 10,
      active_users: 8,
      total_patients: 75
    }
  ],
  current_clinic: {
    id: 1,
    name: 'Main Clinic',
    clinic_type: 'parent'
  }
};

describe('BranchManagementScreen', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      user: { id: 1, name: 'Test User' },
      makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
    });
    
    mockMakeAuthenticatedRequest.mockResolvedValue({
      json: () => Promise.resolve(mockBranchData),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const { getByText } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    expect(getByText('Loading branch data...')).toBeTruthy();
  });

  it('loads and displays branch data', async () => {
    const { getByText } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Branch Management')).toBeTruthy();
      expect(getByText('Main Clinic')).toBeTruthy();
      expect(getByText('Branch A')).toBeTruthy();
    });

    expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
      '/users/api/branch/dashboard-data/'
    );
  });

  it('displays branch statistics correctly', async () => {
    const { getByText } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('25')).toBeTruthy(); // total_users for Main Clinic
      expect(getByText('20')).toBeTruthy(); // active_users for Main Clinic
      expect(getByText('150')).toBeTruthy(); // total_patients for Main Clinic
    });
  });

  it('shows current branch indicator', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('branch-context-indicator')).toBeTruthy();
    });
  });

  it('shows branch selector when multiple branches exist', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('branch-selector')).toBeTruthy();
    });
  });

  it('shows branch hierarchy when multiple branches exist', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('branch-hierarchy')).toBeTruthy();
    });
  });

  it('handles branch switching', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('switch-branch-2')).toBeTruthy();
    });

    fireEvent.press(getByTestId('switch-branch-2'));

    // Should reload data after branch switch
    expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(2);
  });

  it('navigates to create branch screen', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('create-branch-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('create-branch-button'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateBranchScreen');
  });

  it('opens organization management modal', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('org-management-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('org-management-button'));

    expect(getByTestId('organization-management-modal')).toBeTruthy();
  });

  it('opens permissions modal for branch management', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('manage-permissions-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('manage-permissions-1'));

    expect(getByTestId('permissions-modal')).toBeTruthy();
  });

  it('closes organization management modal', async () => {
    const { getByTestId, queryByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('org-management-button')).toBeTruthy();
    });

    // Open modal
    fireEvent.press(getByTestId('org-management-button'));
    expect(getByTestId('organization-management-modal')).toBeTruthy();

    // Close modal
    fireEvent.press(getByTestId('close-org-modal'));
    
    await waitFor(() => {
      expect(queryByTestId('organization-management-modal')).toBeNull();
    });
  });

  it('closes permissions modal', async () => {
    const { getByTestId, queryByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('manage-permissions-1')).toBeTruthy();
    });

    // Open modal
    fireEvent.press(getByTestId('manage-permissions-1'));
    expect(getByTestId('permissions-modal')).toBeTruthy();

    // Close modal
    fireEvent.press(getByTestId('close-permissions-modal'));
    
    await waitFor(() => {
      expect(queryByTestId('permissions-modal')).toBeNull();
    });
  });

  it('handles pull-to-refresh', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('scroll-view')).toBeTruthy();
    });

    // Simulate pull-to-refresh
    fireEvent(getByTestId('scroll-view'), 'onRefresh');

    // Should make another API call
    await waitFor(() => {
      expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(2);
    });
  });

  it('displays empty state when no branches available', async () => {
    mockMakeAuthenticatedRequest.mockResolvedValue({
      json: () => Promise.resolve({
        branch_stats: [],
        current_clinic: null
      }),
    });

    const { getByText } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('No branches available')).toBeTruthy();
      expect(getByText('Contact your administrator to get access to branches')).toBeTruthy();
    });
  });

  it('handles API errors gracefully', async () => {
    mockMakeAuthenticatedRequest.mockRejectedValue(
      new Error('Network error')
    );

    render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load branch data'
      );
    });
  });

  it('shows correct branch type badges', async () => {
    const { getByText } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Main Branch')).toBeTruthy();
      expect(getByText('Branch')).toBeTruthy();
    });
  });

  it('shows current branch indicator correctly', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      // Main Clinic should show as current
      expect(getByTestId('current-badge-1')).toBeTruthy();
      // Branch A should show switch button
      expect(getByTestId('switch-branch-2')).toBeTruthy();
    });
  });

  it('handles branch change from selector', async () => {
    const { getByTestId } = render(
      <BranchManagementScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByTestId('create-branch-button')).toBeTruthy();
    });

    // Simulate branch change from selector
    fireEvent.press(getByTestId('create-branch-button'));

    // Should reload data with new branch context
    expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(2);
  });
});
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BranchProvider, useBranch } from '../../contexts/BranchContext';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

// Test component to access context
const TestComponent = () => {
  const branch = useBranch();
  return (
    <Text testID="test-component">
      {JSON.stringify({
        currentBranch: branch.currentBranch?.name,
        accessibleBranches: branch.accessibleBranches.length,
        loading: branch.loading,
        canAccessMultipleBranches: branch.canAccessMultipleBranches(),
        canManageBranches: branch.canManageBranches(),
      })}
    </Text>
  );
};

describe('BranchContext', () => {
  const mockMakeAuthenticatedRequest = jest.fn();
  const mockUser = { id: 1, role: 'ADMIN' };

  beforeEach(() => {
    useAuth.mockReturnValue({
      makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
      user: mockUser,
    });

    mockMakeAuthenticatedRequest.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.getItem.mockClear();
  });

  it('initializes with loading state', () => {
    const { getByTestId } = render(
      <BranchProvider>
        <TestComponent />
      </BranchProvider>
    );

    const testComponent = getByTestId('test-component');
    const data = JSON.parse(testComponent.props.children);
    expect(data.loading).toBe(true);
  });

  it('loads current branch context and accessible branches', async () => {
    const mockCurrentBranch = { id: 1, name: 'Main Clinic', clinic_type: 'parent' };
    const mockAccessibleBranches = [
      { id: 1, name: 'Main Clinic', clinic_type: 'parent' },
      { id: 2, name: 'Branch 1', clinic_type: 'branch' }
    ];

    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ current_clinic: mockCurrentBranch })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: mockAccessibleBranches })
      });

    const { getByTestId } = render(
      <BranchProvider>
        <TestComponent />
      </BranchProvider>
    );

    await waitFor(() => {
      const testComponent = getByTestId('test-component');
      const data = JSON.parse(testComponent.props.children);
      expect(data.loading).toBe(false);
      expect(data.currentBranch).toBe('Main Clinic');
      expect(data.accessibleBranches).toBe(2);
      expect(data.canAccessMultipleBranches).toBe(true);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('currentBranchId', '1');
  });

  it('handles API errors gracefully', async () => {
    mockMakeAuthenticatedRequest
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    const { getByTestId } = render(
      <BranchProvider>
        <TestComponent />
      </BranchProvider>
    );

    await waitFor(() => {
      const testComponent = getByTestId('test-component');
      const data = JSON.parse(testComponent.props.children);
      expect(data.loading).toBe(false);
      expect(data.currentBranch).toBe(undefined);
      expect(data.accessibleBranches).toBe(0);
    });
  });

  it('determines branch management permissions correctly', async () => {
    const testCases = [
      { role: 'ADMIN', canManage: true },
      { role: 'SUPERUSER', canManage: true },
      { role: 'CLINIC_ADMIN', canManage: true },
      { role: 'DOCTOR', canManage: false },
      { role: 'PATIENT', canManage: false },
    ];

    for (const testCase of testCases) {
      useAuth.mockReturnValue({
        makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
        user: { id: 1, role: testCase.role },
      });

      mockMakeAuthenticatedRequest
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ current_clinic: null })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ clinics: [] })
        });

      const { getByTestId, unmount } = render(
        <BranchProvider>
          <TestComponent />
        </BranchProvider>
      );

      await waitFor(() => {
        const testComponent = getByTestId('test-component');
        const data = JSON.parse(testComponent.props.children);
        expect(data.canManageBranches).toBe(testCase.canManage);
      });

      unmount();
      mockMakeAuthenticatedRequest.mockClear();
    }
  });

  it('throws error when useBranch is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useBranch must be used within a BranchProvider');

    console.error = originalError;
  });
});

describe('BranchContext switchBranch', () => {
  const mockMakeAuthenticatedRequest = jest.fn();
  const mockUser = { id: 1, role: 'ADMIN' };

  let contextValue;
  const TestComponentWithSwitch = () => {
    contextValue = useBranch();
    return <Text>Test</Text>;
  };

  beforeEach(() => {
    useAuth.mockReturnValue({
      makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
      user: mockUser,
    });

    mockMakeAuthenticatedRequest.mockClear();
    AsyncStorage.setItem.mockClear();
  });

  it('switches branch successfully', async () => {
    const mockCurrentBranch = { id: 1, name: 'Main Clinic' };
    const mockNewBranch = { id: 2, name: 'Branch 1' };

    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ current_clinic: mockCurrentBranch })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: [mockCurrentBranch, mockNewBranch] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clinic: mockNewBranch })
      });

    render(
      <BranchProvider>
        <TestComponentWithSwitch />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    let result;
    await act(async () => {
      result = await contextValue.switchBranch(2);
    });

    expect(result.success).toBe(true);
    expect(result.clinic.name).toBe('Branch 1');
    expect(result.message).toBe('Switched to Branch 1');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('currentBranchId', '2');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('currentClinicId', '2');
  });

  it('handles switch branch error', async () => {
    const mockCurrentBranch = { id: 1, name: 'Main Clinic' };

    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ current_clinic: mockCurrentBranch })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: [mockCurrentBranch] })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Access denied' })
      });

    render(
      <BranchProvider>
        <TestComponentWithSwitch />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    let result;
    await act(async () => {
      result = await contextValue.switchBranch(2);
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Access denied');
  });

  it('prevents switching to same branch', async () => {
    const mockCurrentBranch = { id: 1, name: 'Main Clinic' };

    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ current_clinic: mockCurrentBranch })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ clinics: [mockCurrentBranch] })
      });

    render(
      <BranchProvider>
        <TestComponentWithSwitch />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    let result;
    await act(async () => {
      result = await contextValue.switchBranch(1);
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid branch or already selected');
  });
});
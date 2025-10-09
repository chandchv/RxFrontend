import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BranchHierarchyVisualization from '../../components/BranchHierarchyVisualization';
import { useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

const mockMakeAuthenticatedRequest = jest.fn();

const mockHierarchyData = {
  clinic: {
    id: 1,
    name: 'Main Clinic',
    clinic_type: 'parent',
    branch_code: 'MAIN',
    stats: {
      total_users: 25,
      total_appointments: 150
    },
    branches: [
      {
        id: 2,
        name: 'Branch A',
        clinic_type: 'branch',
        branch_code: 'BR001',
        stats: {
          total_users: 10,
          total_appointments: 50
        },
        branches: []
      },
      {
        id: 3,
        name: 'Branch B',
        clinic_type: 'branch',
        branch_code: 'BR002',
        stats: {
          total_users: 8,
          total_appointments: 30
        },
        branches: []
      }
    ]
  }
};

describe('BranchHierarchyVisualization', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
    });
    
    mockMakeAuthenticatedRequest.mockResolvedValue({
      json: () => Promise.resolve(mockHierarchyData),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const { getByText } = render(
      <BranchHierarchyVisualization clinicId={1} />
    );

    expect(getByText('Loading hierarchy...')).toBeTruthy();
  });

  it('loads and displays hierarchy data', async () => {
    const { getByText } = render(
      <BranchHierarchyVisualization clinicId={1} />
    );

    await waitFor(() => {
      expect(getByText('Main Clinic')).toBeTruthy();
      expect(getByText('Branch A')).toBeTruthy();
      expect(getByText('Branch B')).toBeTruthy();
    });

    expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
      '/users/api/branch/hierarchy/1/'
    );
  });

  it('displays branch statistics correctly', async () => {
    const { getByText } = render(
      <BranchHierarchyVisualization clinicId={1} />
    );

    await waitFor(() => {
      expect(getByText('25 users')).toBeTruthy();
      expect(getByText('150 appointments')).toBeTruthy();
      expect(getByText('2 branches')).toBeTruthy();
    });
  });

  it('handles branch selection', async () => {
    const mockOnBranchSelect = jest.fn();
    const { getByText } = render(
      <BranchHierarchyVisualization 
        clinicId={1} 
        onBranchSelect={mockOnBranchSelect}
      />
    );

    await waitFor(() => {
      expect(getByText('Branch A')).toBeTruthy();
    });

    fireEvent.press(getByText('Branch A'));
    expect(mockOnBranchSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        name: 'Branch A',
        clinic_type: 'branch'
      })
    );
  });

  it('handles node expansion and collapse', async () => {
    const { getByTestId } = render(
      <BranchHierarchyVisualization clinicId={1} />
    );

    await waitFor(() => {
      expect(getByTestId('expand-button-1')).toBeTruthy();
    });

    // Initially expanded (auto-expand root)
    expect(getByTestId('branches-container-1')).toBeTruthy();

    // Collapse
    fireEvent.press(getByTestId('expand-button-1'));
    expect(() => getByTestId('branches-container-1')).toThrow();

    // Expand again
    fireEvent.press(getByTestId('expand-button-1'));
    expect(getByTestId('branches-container-1')).toBeTruthy();
  });

  it('displays empty state when no hierarchy data', async () => {
    mockMakeAuthenticatedRequest.mockResolvedValue({
      json: () => Promise.resolve({ clinic: null }),
    });

    const { getByText } = render(
      <BranchHierarchyVisualization clinicId={1} />
    );

    await waitFor(() => {
      expect(getByText('No hierarchy data available')).toBeTruthy();
    });
  });

  it('handles API errors gracefully', async () => {
    mockMakeAuthenticatedRequest.mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = render(
      <BranchHierarchyVisualization clinicId={1} />
    );

    await waitFor(() => {
      expect(getByText('No hierarchy data available')).toBeTruthy();
    });
  });

  it('applies correct styling for different clinic types', async () => {
    const { getByTestId } = render(
      <BranchHierarchyVisualization clinicId={1} />
    );

    await waitFor(() => {
      const parentIcon = getByTestId('clinic-icon-1');
      const branchIcon = getByTestId('clinic-icon-2');
      
      expect(parentIcon.props.style).toContain({ backgroundColor: '#4CAF50' });
      expect(branchIcon.props.style).toContain({ backgroundColor: '#2196F3' });
    });
  });

  it('renders connection lines correctly', async () => {
    const { getByTestId } = render(
      <BranchHierarchyVisualization clinicId={1} />
    );

    await waitFor(() => {
      expect(getByTestId('connection-line-2')).toBeTruthy();
      expect(getByTestId('connection-line-3')).toBeTruthy();
    });
  });
});
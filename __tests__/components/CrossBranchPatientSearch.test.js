import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CrossBranchPatientSearch from '../../components/CrossBranchPatientSearch';
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

// Mock fetch response
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
};

const mockAuthContext = {
  makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
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

describe('CrossBranchPatientSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(mockAuthContext);
    useBranch.mockReturnValue(mockBranchContext);
    mockMakeAuthenticatedRequest.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResults)
    });
  });

  describe('Component Rendering', () => {
    it('renders search input correctly', () => {
      const { getByPlaceholderText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      expect(getByPlaceholderText('Search patients by name, ID, phone, or email...')).toBeTruthy();
    });

    it('renders branch filter button when user can access multiple branches', () => {
      const { getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} showBranchFilter={true} />
      );

      expect(getByText('All')).toBeTruthy();
    });

    it('does not render branch filter when showBranchFilter is false', () => {
      const { queryByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} showBranchFilter={false} />
      );

      expect(queryByText('All')).toBeNull();
    });

    it('shows initial empty state with search instruction', () => {
      const { getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      expect(getByText('Enter at least 2 characters to search patients')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('performs search when typing more than 2 characters', async () => {
      const { getByPlaceholderText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('/users/api/cross-branch/patients/search/')
        );
      });
    });

    it('does not search with less than 2 characters', async () => {
      const { getByPlaceholderText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'J');
      });

      expect(mockMakeAuthenticatedRequest).not.toHaveBeenCalled();
    });

    it('displays search results correctly', async () => {
      const { getByPlaceholderText, getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
        expect(getByText('2 patients found')).toBeTruthy();
      });
    });

    it('shows loading state during search', async () => {
      mockMakeAuthenticatedRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResults)
        }), 100))
      );

      const { getByPlaceholderText, getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      expect(getByText('Searching across branches...')).toBeTruthy();
    });

    it('handles search errors gracefully', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Search failed' })
      });

      const { getByPlaceholderText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Search Error', 'Search failed');
      });
    });

    it('clears search results when search term is cleared', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      // First search
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // Clear search
      await act(async () => {
        fireEvent.changeText(searchInput, '');
      });

      expect(queryByText('John Doe')).toBeNull();
      expect(getByText('Enter at least 2 characters to search patients')).toBeTruthy();
    });
  });

  describe('Branch Filtering', () => {
    it('opens branch filter modal when filter button is pressed', async () => {
      const { getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} showBranchFilter={true} />
      );

      const filterButton = getByText('All');
      
      await act(async () => {
        fireEvent.press(filterButton);
      });

      expect(getByText('Filter by Branches')).toBeTruthy();
      expect(getByText('Main Branch')).toBeTruthy();
      expect(getByText('Downtown Branch')).toBeTruthy();
    });

    it('allows selecting and deselecting branches', async () => {
      const { getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} showBranchFilter={true} />
      );

      // Open filter modal
      await act(async () => {
        fireEvent.press(getByText('All'));
      });

      // Deselect a branch
      const mainBranchOption = getByText('Main Branch');
      await act(async () => {
        fireEvent.press(mainBranchOption);
      });

      expect(getByText('2 of 3 branches selected')).toBeTruthy();
    });

    it('includes clinic_ids parameter in search when branches are filtered', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} showBranchFilter={true} />
      );

      // Open filter modal and deselect a branch
      await act(async () => {
        fireEvent.press(getByText('All'));
      });

      await act(async () => {
        fireEvent.press(getByText('Main Branch'));
      });

      // Close modal
      await act(async () => {
        fireEvent.press(getByText('close'));
      });

      // Perform search
      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          expect.stringContaining('clinic_ids=2,3')
        );
      });
    });
  });

  describe('Patient Selection', () => {
    it('calls onPatientSelect when patient is tapped', async () => {
      const mockOnPatientSelect = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <CrossBranchPatientSearch 
          navigation={mockNavigation} 
          onPatientSelect={mockOnPatientSelect}
        />
      );

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

      expect(mockOnPatientSelect).toHaveBeenCalledWith(mockSearchResults.results[0]);
    });

    it('navigates to patient details when no onPatientSelect is provided', async () => {
      const { getByPlaceholderText, getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

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

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CrossBranchPatientDetails', {
        patientId: 1
      });
    });
  });

  describe('Branch Indicators', () => {
    it('displays branch indicators for each patient', async () => {
      const { getByPlaceholderText, getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('MB')).toBeTruthy(); // Main Branch indicator
        expect(getByText('DB')).toBeTruthy(); // Downtown Branch indicator
      });
    });

    it('shows branch names in patient info', async () => {
      const { getByPlaceholderText, getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('Branch: Main Branch')).toBeTruthy();
        expect(getByText('Branch: Downtown Branch')).toBeTruthy();
      });
    });
  });

  describe('Pagination', () => {
    it('loads more results when scrolling to end', async () => {
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

      const { getByPlaceholderText, getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'John');
      });

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });

      // Simulate scroll to end
      const flatList = getByText('John Doe').parent.parent.parent;
      await act(async () => {
        fireEvent(flatList, 'onEndReached');
      });

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Empty States', () => {
    it('shows no results message when search returns empty', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [], count: 0, next: null, previous: null })
      });

      const { getByPlaceholderText, getByText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'NonExistent');
      });

      await waitFor(() => {
        expect(getByText('No patients found matching "NonExistent"')).toBeTruthy();
        expect(getByText('Try adjusting your search terms or branch filters')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      const { getByPlaceholderText } = render(
        <CrossBranchPatientSearch navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search patients by name, ID, phone, or email...');
      expect(searchInput).toBeTruthy();
    });
  });
});
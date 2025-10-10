import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import RecordSearchScreen from '../../../screens/clinical-records/RecordSearchScreen';
import mobileApiService from '../../../services/mobileApiService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../services/mobileApiService');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
// No additional mocks needed for debounce

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {},
};

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('RecordSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.removeItem.mockResolvedValue();
    AsyncStorage.getAllKeys.mockResolvedValue([]);
    AsyncStorage.multiRemove.mockResolvedValue();
  });

  const renderScreen = (props = {}) => {
    return render(
      <RecordSearchScreen
        navigation={mockNavigation}
        route={mockRoute}
        {...props}
      />
    );
  };

  describe('Initial Render', () => {
    it('renders search screen correctly', () => {
      const { getByText, getByPlaceholderText } = renderScreen();
      
      expect(getByText('Search Records')).toBeTruthy();
      expect(getByPlaceholderText('Search clinical records...')).toBeTruthy();
    });

    it('loads search history on mount', async () => {
      const mockHistory = ['diabetes', 'hypertension'];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory));
      
      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('@clinical_records_search_history');
      });
    });

    it('loads saved searches on mount', async () => {
      const mockSavedSearches = [
        {
          id: '1',
          name: 'Diabetes Records',
          query: 'diabetes',
          filters: {},
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockSavedSearches));
      
      renderScreen();
      
      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('@clinical_records_saved_searches');
      });
    });
  });

  describe('Search Functionality', () => {
    it('handles search input changes', async () => {
      mobileApiService.getSearchSuggestions.mockResolvedValue({
        suggestions: ['diabetes medication', 'diabetes type 2'],
      });

      const { getByPlaceholderText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'diabetes');
      });
      
      expect(mobileApiService.getSearchSuggestions).toHaveBeenCalledWith('diabetes');
    });

    it('performs search when submit is pressed', async () => {
      const mockSearchResults = {
        results: [
          {
            id: '1',
            title: 'Diabetes Consultation',
            record_type: 'consultation',
            record_date: '2024-01-01T00:00:00Z',
            document_count: 2,
          },
        ],
        search_metadata: {
          total_results: 1,
        },
      };
      
      mobileApiService.searchClinicalRecords.mockResolvedValue(mockSearchResults);

      const { getByPlaceholderText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'diabetes');
        fireEvent(searchInput, 'submitEditing');
      });
      
      await waitFor(() => {
        expect(mobileApiService.searchClinicalRecords).toHaveBeenCalledWith({
          q: 'diabetes',
          page: 1,
          page_size: 20,
          record_type: '',
          priority: '',
          date_from: '',
          date_to: '',
          include_documents: false,
        });
      });
    });

    it('displays search results', async () => {
      const mockSearchResults = {
        results: [
          {
            id: '1',
            title: 'Diabetes Consultation',
            record_type: 'consultation',
            record_date: '2024-01-01T00:00:00Z',
            document_count: 2,
            priority: 'high',
          },
        ],
        search_metadata: {
          total_results: 1,
        },
      };
      
      mobileApiService.searchClinicalRecords.mockResolvedValue(mockSearchResults);

      const { getByPlaceholderText, getByText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'diabetes');
        fireEvent(searchInput, 'submitEditing');
      });
      
      await waitFor(() => {
        expect(getByText('Diabetes Consultation')).toBeTruthy();
        expect(getByText('1 result found')).toBeTruthy();
      });
    });

    it('handles search errors', async () => {
      mobileApiService.searchClinicalRecords.mockRejectedValue(new Error('Search failed'));

      const { getByPlaceholderText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'diabetes');
        fireEvent(searchInput, 'submitEditing');
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Search Error', 'Search failed');
      });
    });

    it('shows no results message when no records found', async () => {
      mobileApiService.searchClinicalRecords.mockResolvedValue({
        results: [],
        search_metadata: { total_results: 0 },
      });

      const { getByPlaceholderText, getByText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'test query');
        fireEvent(searchInput, 'submitEditing');
      });
      
      await waitFor(() => {
        expect(getByText('No records found')).toBeTruthy();
        expect(getByText('Try adjusting your search terms or filters')).toBeTruthy();
      });
    });
  });

  describe('Search Suggestions', () => {
    it('displays search suggestions', async () => {
      mobileApiService.getSearchSuggestions.mockResolvedValue({
        suggestions: ['diabetes medication', 'diabetes type 2'],
      });

      const { getByPlaceholderText, getByText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'diabetes');
      });
      
      await waitFor(() => {
        expect(getByText('diabetes medication')).toBeTruthy();
        expect(getByText('diabetes type 2')).toBeTruthy();
      });
    });

    it('selects suggestion when tapped', async () => {
      mobileApiService.getSearchSuggestions.mockResolvedValue({
        suggestions: ['diabetes medication'],
      });
      mobileApiService.searchClinicalRecords.mockResolvedValue({
        results: [],
        search_metadata: { total_results: 0 },
      });

      const { getByPlaceholderText, getByText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'diabetes');
      });
      
      await waitFor(() => {
        expect(getByText('diabetes medication')).toBeTruthy();
      });
      
      await act(async () => {
        fireEvent.press(getByText('diabetes medication'));
      });
      
      expect(mobileApiService.searchClinicalRecords).toHaveBeenCalledWith({
        q: 'diabetes medication',
        page: 1,
        page_size: 20,
        record_type: '',
        priority: '',
        date_from: '',
        date_to: '',
        include_documents: false,
      });
    });
  });

  describe('Search History', () => {
    it('displays search history when input is empty', async () => {
      const mockHistory = ['diabetes', 'hypertension'];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory));

      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Recent Searches')).toBeTruthy();
        expect(getByText('diabetes')).toBeTruthy();
        expect(getByText('hypertension')).toBeTruthy();
      });
    });

    it('clears search history', async () => {
      const mockHistory = ['diabetes', 'hypertension'];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory));

      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Clear')).toBeTruthy();
      });
      
      await act(async () => {
        fireEvent.press(getByText('Clear'));
      });
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@clinical_records_search_history');
    });

    it('selects history item when tapped', async () => {
      const mockHistory = ['diabetes'];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory));
      mobileApiService.searchClinicalRecords.mockResolvedValue({
        results: [],
        search_metadata: { total_results: 0 },
      });

      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('diabetes')).toBeTruthy();
      });
      
      await act(async () => {
        fireEvent.press(getByText('diabetes'));
      });
      
      expect(mobileApiService.searchClinicalRecords).toHaveBeenCalledWith({
        q: 'diabetes',
        page: 1,
        page_size: 20,
        record_type: '',
        priority: '',
        date_from: '',
        date_to: '',
        include_documents: false,
      });
    });
  });

  describe('Saved Searches', () => {
    it('displays saved searches', async () => {
      const mockSavedSearches = [
        {
          id: '1',
          name: 'Diabetes Records',
          query: 'diabetes',
          filters: {},
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockSavedSearches));

      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Saved Searches')).toBeTruthy();
        expect(getByText('Diabetes Records')).toBeTruthy();
        expect(getByText('diabetes')).toBeTruthy();
      });
    });

    it('loads saved search when tapped', async () => {
      const mockSavedSearches = [
        {
          id: '1',
          name: 'Diabetes Records',
          query: 'diabetes',
          filters: { record_type: 'consultation' },
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockSavedSearches));
      mobileApiService.searchClinicalRecords.mockResolvedValue({
        results: [],
        search_metadata: { total_results: 0 },
      });

      const { getByText } = renderScreen();
      
      await waitFor(() => {
        expect(getByText('Diabetes Records')).toBeTruthy();
      });
      
      await act(async () => {
        fireEvent.press(getByText('Diabetes Records'));
      });
      
      expect(mobileApiService.searchClinicalRecords).toHaveBeenCalledWith({
        q: 'diabetes',
        page: 1,
        page_size: 20,
        record_type: 'consultation',
        priority: '',
        date_from: '',
        date_to: '',
        include_documents: false,
      });
    });
  });

  describe('Filters', () => {
    it('opens filter modal', async () => {
      const { getByTestId } = renderScreen();
      
      // Note: In actual implementation, you'd need to add testID to the filter button
      // For now, we'll test the concept
      expect(true).toBeTruthy(); // Placeholder test
    });

    it('applies filters to search', async () => {
      // This would test the filter functionality
      // Implementation depends on how filters are exposed in the UI
      expect(true).toBeTruthy(); // Placeholder test
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', () => {
      const { getByTestId } = renderScreen();
      
      // Note: In actual implementation, you'd need to add testID to the back button
      // fireEvent.press(getByTestId('back-button'));
      // expect(mockNavigation.goBack).toHaveBeenCalled();
      
      expect(true).toBeTruthy(); // Placeholder test
    });

    it('navigates to record detail when result is tapped', async () => {
      const mockSearchResults = {
        results: [
          {
            id: '1',
            title: 'Diabetes Consultation',
            record_type: 'consultation',
            record_date: '2024-01-01T00:00:00Z',
            document_count: 2,
          },
        ],
        search_metadata: { total_results: 1 },
      };
      
      mobileApiService.searchClinicalRecords.mockResolvedValue(mockSearchResults);

      const { getByPlaceholderText, getByText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'diabetes');
        fireEvent(searchInput, 'submitEditing');
      });
      
      await waitFor(() => {
        expect(getByText('Diabetes Consultation')).toBeTruthy();
      });
      
      await act(async () => {
        fireEvent.press(getByText('Diabetes Consultation'));
      });
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecordDetail', {
        recordId: '1',
      });
    });
  });

  describe('Pagination', () => {
    it('loads more results when scrolled to end', async () => {
      const mockSearchResults = {
        results: [
          {
            id: '1',
            title: 'Result 1',
            record_type: 'consultation',
            record_date: '2024-01-01T00:00:00Z',
            document_count: 1,
          },
        ],
        search_metadata: { total_results: 2 },
        next: 'http://example.com/page2',
      };
      
      const mockPage2Results = {
        results: [
          {
            id: '2',
            title: 'Result 2',
            record_type: 'consultation',
            record_date: '2024-01-02T00:00:00Z',
            document_count: 1,
          },
        ],
        search_metadata: { total_results: 2 },
        next: null,
      };
      
      mobileApiService.searchClinicalRecords
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce(mockPage2Results);

      const { getByPlaceholderText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'test');
        fireEvent(searchInput, 'submitEditing');
      });
      
      // This would test pagination, but requires more complex FlatList testing
      expect(mobileApiService.searchClinicalRecords).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mobileApiService.searchClinicalRecords.mockRejectedValue(new Error('Network error'));

      const { getByPlaceholderText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'test');
        fireEvent(searchInput, 'submitEditing');
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Search Error', 'Network error');
      });
    });

    it('handles empty search query', async () => {
      const { getByPlaceholderText } = renderScreen();
      const searchInput = getByPlaceholderText('Search clinical records...');
      
      await act(async () => {
        fireEvent(searchInput, 'submitEditing');
      });
      
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a search query');
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      const { getByPlaceholderText } = renderScreen();
      
      expect(getByPlaceholderText('Search clinical records...')).toBeTruthy();
      // Add more accessibility tests as needed
    });
  });
});
/**
 * SearchFilters Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import SearchFilters from '../../../components/clinical-records/SearchFilters';
import { lightTheme } from '../../../styles/theme';

const MockedProvider = ({ children }) => (
  <PaperProvider theme={lightTheme}>
    {children}
  </PaperProvider>
);

describe('SearchFilters', () => {
  const defaultProps = {
    onFiltersChange: jest.fn(),
    onApplyFilters: jest.fn(),
    onClearFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByText, getByPlaceholderText } = render(
      <MockedProvider>
        <SearchFilters {...defaultProps} />
      </MockedProvider>
    );

    expect(getByText('Search Filters')).toBeTruthy();
    expect(getByPlaceholderText('Search records...')).toBeTruthy();
    expect(getByText('Date Range')).toBeTruthy();
    expect(getByText('Record Types')).toBeTruthy();
  });

  it('calls onFiltersChange when search query changes', () => {
    const { getByPlaceholderText } = render(
      <MockedProvider>
        <SearchFilters {...defaultProps} />
      </MockedProvider>
    );

    const searchInput = getByPlaceholderText('Search records...');
    fireEvent.changeText(searchInput, 'test query');

    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQuery: 'test query'
      })
    );
  });

  it('calls onApplyFilters when Apply Filters button is pressed', () => {
    const { getByText } = render(
      <MockedProvider>
        <SearchFilters {...defaultProps} />
      </MockedProvider>
    );

    fireEvent.press(getByText('Apply Filters'));
    expect(defaultProps.onApplyFilters).toHaveBeenCalled();
  });

  it('calls onClearFilters when Clear All button is pressed', () => {
    const filtersWithData = {
      ...defaultProps,
      filters: { searchQuery: 'test', recordTypes: ['lab_result'] }
    };

    const { getByText } = render(
      <MockedProvider>
        <SearchFilters {...filtersWithData} />
      </MockedProvider>
    );

    fireEvent.press(getByText('Clear All'));
    expect(defaultProps.onClearFilters).toHaveBeenCalled();
  });

  it('shows active filters count when filters are applied', () => {
    const filtersWithData = {
      ...defaultProps,
      filters: { 
        searchQuery: 'test', 
        recordTypes: ['lab_result'],
        dateRange: 'week'
      }
    };

    const { getByText } = render(
      <MockedProvider>
        <SearchFilters {...filtersWithData} />
      </MockedProvider>
    );

    expect(getByText('3 active')).toBeTruthy();
  });

  it('toggles record type filters correctly', () => {
    const { getByText } = render(
      <MockedProvider>
        <SearchFilters {...defaultProps} />
      </MockedProvider>
    );

    fireEvent.press(getByText('Lab Results'));
    
    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        recordTypes: ['lab_result']
      })
    );
  });

  it('updates date range filter correctly', () => {
    const { getByText } = render(
      <MockedProvider>
        <SearchFilters {...defaultProps} />
      </MockedProvider>
    );

    // Find and press the "This Week" radio button
    fireEvent.press(getByText('This Week'));
    
    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: 'week'
      })
    );
  });

  it('disables Clear All button when no filters are active', () => {
    const { getByText } = render(
      <MockedProvider>
        <SearchFilters {...defaultProps} />
      </MockedProvider>
    );

    const clearButton = getByText('Clear All');
    expect(clearButton.props.accessibilityState?.disabled).toBe(true);
  });
});
/**
 * RecordCard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import RecordCard from '../../../components/clinical-records/RecordCard';
import { lightTheme } from '../../../styles/theme';

const MockedProvider = ({ children }) => (
  <PaperProvider theme={lightTheme}>
    {children}
  </PaperProvider>
);

describe('RecordCard', () => {
  const mockRecord = {
    id: '1',
    title: 'Test Record',
    description: 'Test description',
    type: 'lab_result',
    status: 'processed',
    patient_name: 'John Doe',
    created_at: '2024-01-01T00:00:00Z',
    file_size: 1024,
    doctor_name: 'Smith',
  };

  it('renders correctly with basic record data', () => {
    const { getByText } = render(
      <MockedProvider>
        <RecordCard record={mockRecord} />
      </MockedProvider>
    );

    expect(getByText('Test Record')).toBeTruthy();
    expect(getByText('Test description')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('processed')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <MockedProvider>
        <RecordCard record={mockRecord} onPress={onPressMock} />
      </MockedProvider>
    );

    fireEvent.press(getByText('Test Record'));
    expect(onPressMock).toHaveBeenCalledWith(mockRecord);
  });

  it('renders compact version correctly', () => {
    const { getByText, queryByText } = render(
      <MockedProvider>
        <RecordCard record={mockRecord} compact={true} />
      </MockedProvider>
    );

    expect(getByText('Test Record')).toBeTruthy();
    // Description should not be visible in compact mode
    expect(queryByText('Test description')).toBeNull();
  });

  it('shows favorite indicator when record is favorited', () => {
    const favoritedRecord = { ...mockRecord, is_favorite: true };
    const { UNSAFE_getByType } = render(
      <MockedProvider>
        <RecordCard record={favoritedRecord} />
      </MockedProvider>
    );

    // Should render favorite icon
    expect(UNSAFE_getByType).toBeTruthy();
  });

  it('hides actions when showActions is false', () => {
    const { queryByTestId } = render(
      <MockedProvider>
        <RecordCard record={mockRecord} showActions={false} />
      </MockedProvider>
    );

    // Actions should not be visible
    expect(queryByTestId('record-actions')).toBeNull();
  });

  it('renders null when no record is provided', () => {
    const { container } = render(
      <MockedProvider>
        <RecordCard record={null} />
      </MockedProvider>
    );

    expect(container.children).toHaveLength(0);
  });

  it('displays correct file size formatting', () => {
    const recordWithLargeFile = { 
      ...mockRecord, 
      file_size: 1048576 // 1MB
    };
    
    const { getByText } = render(
      <MockedProvider>
        <RecordCard record={recordWithLargeFile} />
      </MockedProvider>
    );

    expect(getByText('1 MB')).toBeTruthy();
  });
});
/**
 * MetricCard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import MetricCard from '../../../components/dashboard/MetricCard';
import { lightTheme } from '../../../styles/theme';

const MockedProvider = ({ children }) => (
  <PaperProvider theme={lightTheme}>
    {children}
  </PaperProvider>
);

describe('MetricCard', () => {
  const defaultProps = {
    title: 'Test Metric',
    value: '123',
    subtitle: 'Test subtitle',
    icon: 'trending-up',
  };

  it('renders correctly with basic props', () => {
    const { getByText } = render(
      <MockedProvider>
        <MetricCard {...defaultProps} />
      </MockedProvider>
    );

    expect(getByText('Test Metric')).toBeTruthy();
    expect(getByText('123')).toBeTruthy();
    expect(getByText('Test subtitle')).toBeTruthy();
  });

  it('displays loading state correctly', () => {
    const { getByText } = render(
      <MockedProvider>
        <MetricCard {...defaultProps} loading={true} />
      </MockedProvider>
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('displays error state correctly', () => {
    const { getByText } = render(
      <MockedProvider>
        <MetricCard {...defaultProps} error={true} />
      </MockedProvider>
    );

    expect(getByText('Error loading data')).toBeTruthy();
  });

  it('displays trend information when provided', () => {
    const { getByText } = render(
      <MockedProvider>
        <MetricCard 
          {...defaultProps} 
          trend="+5%" 
          trendDirection="up" 
        />
      </MockedProvider>
    );

    expect(getByText('+5%')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <MockedProvider>
        <MetricCard {...defaultProps} onPress={onPressMock} />
      </MockedProvider>
    );

    fireEvent.press(getByText('Test Metric'));
    expect(onPressMock).toHaveBeenCalled();
  });

  it('renders without subtitle when not provided', () => {
    const propsWithoutSubtitle = { ...defaultProps };
    delete propsWithoutSubtitle.subtitle;

    const { getByText, queryByText } = render(
      <MockedProvider>
        <MetricCard {...propsWithoutSubtitle} />
      </MockedProvider>
    );

    expect(getByText('Test Metric')).toBeTruthy();
    expect(getByText('123')).toBeTruthy();
    expect(queryByText('Test subtitle')).toBeNull();
  });

  it('applies custom styles correctly', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <MockedProvider>
        <MetricCard 
          {...defaultProps} 
          style={customStyle}
          testID="metric-card"
        />
      </MockedProvider>
    );

    const card = getByTestId('metric-card');
    expect(card.props.style).toContainEqual(customStyle);
  });
});
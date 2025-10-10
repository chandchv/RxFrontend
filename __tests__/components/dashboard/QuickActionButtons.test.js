/**
 * QuickActionButtons Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import QuickActionButtons from '../../../components/dashboard/QuickActionButtons';
import { lightTheme } from '../../../styles/theme';

const MockedProvider = ({ children }) => (
  <PaperProvider theme={lightTheme}>
    {children}
  </PaperProvider>
);

describe('QuickActionButtons', () => {
  const mockActions = [
    { id: 'action1', label: 'Action 1', icon: 'add', type: 'primary' },
    { id: 'action2', label: 'Action 2', icon: 'edit', type: 'secondary' },
    { id: 'action3', label: 'Action 3', icon: 'delete', type: 'error', disabled: true },
  ];

  it('renders correctly with custom actions', () => {
    const { getByText } = render(
      <MockedProvider>
        <QuickActionButtons actions={mockActions} />
      </MockedProvider>
    );

    expect(getByText('Action 1')).toBeTruthy();
    expect(getByText('Action 2')).toBeTruthy();
    expect(getByText('Action 3')).toBeTruthy();
  });

  it('renders title when showTitle is true', () => {
    const { getByText } = render(
      <MockedProvider>
        <QuickActionButtons 
          actions={mockActions} 
          title="Custom Actions"
          showTitle={true}
        />
      </MockedProvider>
    );

    expect(getByText('Custom Actions')).toBeTruthy();
  });

  it('hides title when showTitle is false', () => {
    const { queryByText } = render(
      <MockedProvider>
        <QuickActionButtons 
          actions={mockActions} 
          title="Custom Actions"
          showTitle={false}
        />
      </MockedProvider>
    );

    expect(queryByText('Custom Actions')).toBeNull();
  });

  it('calls onActionPress when action button is pressed', () => {
    const onActionPressMock = jest.fn();
    const { getByText } = render(
      <MockedProvider>
        <QuickActionButtons 
          actions={mockActions} 
          onActionPress={onActionPressMock}
        />
      </MockedProvider>
    );

    fireEvent.press(getByText('Action 1'));
    expect(onActionPressMock).toHaveBeenCalledWith(mockActions[0]);
  });

  it('does not call onActionPress for disabled actions', () => {
    const onActionPressMock = jest.fn();
    const { getByText } = render(
      <MockedProvider>
        <QuickActionButtons 
          actions={mockActions} 
          onActionPress={onActionPressMock}
        />
      </MockedProvider>
    );

    fireEvent.press(getByText('Action 3'));
    expect(onActionPressMock).not.toHaveBeenCalled();
  });

  it('displays loading state correctly', () => {
    const { getByText } = render(
      <MockedProvider>
        <QuickActionButtons actions={mockActions} loading={true} />
      </MockedProvider>
    );

    expect(getByText('Loading actions...')).toBeTruthy();
  });

  it('renders default actions when no actions provided', () => {
    const { getByText } = render(
      <MockedProvider>
        <QuickActionButtons />
      </MockedProvider>
    );

    // Should render default doctor actions
    expect(getByText('New Appointment')).toBeTruthy();
    expect(getByText('Patient Records')).toBeTruthy();
  });

  it('displays badge when action has badge property', () => {
    const actionsWithBadge = [
      { id: 'action1', label: 'Messages', icon: 'message', type: 'primary', badge: '5' },
    ];

    const { getByText } = render(
      <MockedProvider>
        <QuickActionButtons actions={actionsWithBadge} />
      </MockedProvider>
    );

    expect(getByText('5')).toBeTruthy();
  });

  it('arranges actions in correct number of columns', () => {
    const { getByText } = render(
      <MockedProvider>
        <QuickActionButtons 
          actions={mockActions} 
          columns={2}
        />
      </MockedProvider>
    );

    // All actions should still be rendered
    expect(getByText('Action 1')).toBeTruthy();
    expect(getByText('Action 2')).toBeTruthy();
    expect(getByText('Action 3')).toBeTruthy();
  });
});
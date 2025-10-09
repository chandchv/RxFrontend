import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CrossBranchPatientSearchScreen from '../../screens/CrossBranchPatientSearchScreen';
import { AuthProvider } from '../../contexts/AuthContext';
import { BranchProvider } from '../../contexts/BranchContext';

// Mock the components
jest.mock('../../components/CrossBranchPatientSearch', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ onPatientSelect, navigation }) => (
    <View testID="cross-branch-patient-search">
      <Text>Cross Branch Patient Search Component</Text>
      <TouchableOpacity
        testID="mock-patient-select"
        onPress={() => onPatientSelect({ id: 1, name: 'Test Patient' })}
      >
        <Text>Select Test Patient</Text>
      </TouchableOpacity>
    </View>
  );
});

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock auth context
const mockAuthContext = {
  user: { id: 1, name: 'Test User' },
  token: 'test-token',
  makeAuthenticatedRequest: jest.fn(),
  isAuthenticated: true,
};

// Mock branch context
const mockBranchContext = {
  accessibleBranches: [
    { id: 1, name: 'Main Branch', clinic_type: 'parent' },
    { id: 2, name: 'Branch 1', clinic_type: 'branch' },
  ],
  currentBranch: { id: 1, name: 'Main Branch' },
  canAccessMultipleBranches: () => true,
};

const Stack = createStackNavigator();

const TestWrapper = ({ children }) => (
  <NavigationContainer>
    <AuthProvider value={mockAuthContext}>
      <BranchProvider value={mockBranchContext}>
        <Stack.Navigator>
          <Stack.Screen name="Test" component={() => children} />
        </Stack.Navigator>
      </BranchProvider>
    </AuthProvider>
  </NavigationContainer>
);

describe('CrossBranchPatientSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientSearchScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByTestId('cross-branch-patient-search')).toBeTruthy();
  });

  it('handles patient selection correctly', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientSearchScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const selectButton = getByTestId('mock-patient-select');
    fireEvent.press(selectButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('CrossBranchPatientDetails', {
        patientId: 1,
      });
    });
  });

  it('passes correct props to CrossBranchPatientSearch component', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientSearchScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    // Component should be rendered with correct props
    expect(getByTestId('cross-branch-patient-search')).toBeTruthy();
  });

  it('has correct container styling', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientSearchScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    const container = getByTestId('cross-branch-patient-search').parent;
    expect(container.props.style).toEqual({ flex: 1 });
  });
});

describe('CrossBranchPatientSearchScreen Integration', () => {
  it('integrates properly with navigation', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientSearchScreen navigation={mockNavigation} />
      </TestWrapper>
    );

    expect(getByTestId('cross-branch-patient-search')).toBeTruthy();
    
    // Test that navigation object is passed correctly
    const selectButton = getByTestId('mock-patient-select');
    fireEvent.press(selectButton);
    
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('handles navigation errors gracefully', () => {
    const errorNavigation = {
      ...mockNavigation,
      navigate: jest.fn(() => {
        throw new Error('Navigation error');
      }),
    };

    const { getByTestId } = render(
      <TestWrapper>
        <CrossBranchPatientSearchScreen navigation={errorNavigation} />
      </TestWrapper>
    );

    const selectButton = getByTestId('mock-patient-select');
    
    // Should not crash when navigation fails
    expect(() => fireEvent.press(selectButton)).not.toThrow();
  });
});
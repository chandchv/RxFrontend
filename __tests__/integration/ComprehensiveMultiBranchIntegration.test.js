import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert } from 'react-native';

// Import screens and components
import BranchManagementScreen from '../../screens/BranchManagementScreen';
import CreateBranchScreen from '../../screens/CreateBranchScreen';
import CrossBranchPatientSearchScreen from '../../screens/CrossBranchPatientSearchScreen';
import CrossBranchPatientDetails from '../../screens/CrossBranchPatientDetails';
import ConsolidatedReportingScreen from '../../screens/ConsolidatedReportingScreen';

// Import components
import BranchSelector from '../../components/BranchSelector';
import BranchPermissionsManager from '../../components/BranchPermissionsManager';
import CrossBranchPatientSearch from '../../components/CrossBranchPatientSearch';
import CrossBranchPatientHistory from '../../components/CrossBranchPatientHistory';
import PatientBranchTransfer from '../../components/PatientBranchTransfer';
import OrganizationManagement from '../../components/OrganizationManagement';

// Import contexts
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { BranchProvider, useBranch } from '../../contexts/BranchContext';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
  PieChart: 'PieChart',
}));

// Mock Picker
jest.mock('@react-native-picker/picker', () => ({
  Picker: ({ children, onValueChange, selectedValue }) => {
    const MockPicker = require('react-native').View;
    return (
      <MockPicker testID="picker" onPress={() => onValueChange('branch')}>
        {children}
      </MockPicker>
    );
  },
  'Picker.Item': ({ label, value }) => {
    const MockItem = require('react-native').Text;
    return <MockItem testID={`picker-item-${value}`}>{label}</MockItem>;
  }
}));

// Mock navigation
const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
});

const Stack = createStackNavigator();

// Mock data
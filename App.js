import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './contexts/AuthContext';
import { BranchProvider } from './contexts/BranchContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MobileDashboardProvider } from './contexts/MobileDashboardContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <PaperProvider>
        <ThemeProvider>
          <AuthProvider>
            <BranchProvider>
              <NotificationProvider>
                <MobileDashboardProvider>
                  <AppNavigator />
                </MobileDashboardProvider>
              </NotificationProvider>
            </BranchProvider>
          </AuthProvider>
        </ThemeProvider>
      </PaperProvider>
    </NavigationContainer>
  );
}

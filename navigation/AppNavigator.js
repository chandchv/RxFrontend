import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import PatientSignupScreen from '../screens/PatientSignupScreen';
import DoctorNavigator from './DoctorNavigator';
import PatientNavigator from './PatientNavigator';
import AdminNavigator from './AdminNavigator';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: false 
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="PatientSignup" component={PatientSignupScreen} />
        </>
      ) : (
        <>
          {(user.role === 'DOCTOR' || user.user_type === 'doctor') && (
            <Stack.Screen name="DoctorFlow" component={DoctorNavigator} />
          )}
          {(user.role === 'PATIENT' || user.user_type === 'patient') && (
            <Stack.Screen name="PatientFlow" component={PatientNavigator} />
          )}
          {(user.role === 'SUPERUSER' || user.role === 'ADMIN') && (
            <Stack.Screen name="AdminFlow" component={AdminNavigator} />
          )}
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
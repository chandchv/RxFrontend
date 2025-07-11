import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import CustomDrawer from '../components/CustomDrawer';
import PatientDashboard from '../screens/patient/PatientDashboard';
import AppointmentsList from '../screens/patient/AppointmentsList';
import CreateAppointment from '../screens/patient/CreateAppointment';
import PrescriptionDetailScreen from '../screens/patient/PrescriptionDetailScreen';
import PatientMedicalHistory from '../screens/patient/PatientMedicalHistory';
import PatientBilling from '../screens/patient/PatientBilling';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppointmentDetails from '../screens/patient/AppointmentDetails';
import CreateAppointmentPatient from '../screens/patient/CreateAppointmentPatient';
import EditProfile from '../screens/patient/EditProfile';
import MedicalHistory from '../screens/patient/MedicalHistory';

// Import the new screens
import PharmacyHomeScreen from '../screens/pharmacy/PharmacyHomeScreen';
import PrescriptionDetailsScreen from '../screens/pharmacy/PrescriptionDetailsScreen';
import LabHomeScreen from '../screens/lab/LabHomeScreen';
import BillingHomeScreen from '../screens/billing/BillingHomeScreen';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Create stack navigators for each section
const PharmacyStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="PharmacyHome" 
        component={PharmacyHomeScreen} 
        options={{ title: 'Pharmacy' }} 
      />
      <Stack.Screen 
        name="PrescriptionDetails" 
        component={PrescriptionDetailsScreen} 
        options={{ title: 'Prescription Details' }} 
      />
    </Stack.Navigator>
  );
};

const LabStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="LabHome" 
        component={LabHomeScreen} 
        options={{ title: 'Laboratory' }} 
      />
      {/* Additional lab screens will be added here */}
    </Stack.Navigator>
  );
};

const BillingStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="BillingHome" 
        component={BillingHomeScreen} 
        options={{ title: 'Billing' }} 
      />
      {/* Additional billing screens will be added here */}
    </Stack.Navigator>
  );
};

const PatientNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="PatientDashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="PatientDashboard" 
        component={PatientDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="PrescriptionDetailScreen" 
        component={PrescriptionDetailScreen}
        options={{ title: 'Prescription Details' }}
      />
      <Stack.Screen 
        name="AppointmentsList" 
        component={AppointmentsList}
        options={{ title: 'My Appointments' }}
      />
      <Stack.Screen 
        name="AppointmentDetails" 
        component={AppointmentDetails}
        options={{ title: 'Appointment Details' }}
      />
      <Stack.Screen 
        name="CreateAppointmentPatient" 
        component={CreateAppointmentPatient}
        options={{ title: 'Book Appointment' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfile}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen 
        name="MedicalHistory" 
        component={MedicalHistory}
        options={{ title: 'Medical History' }}
      />
    </Stack.Navigator>
  );
};

export default PatientNavigator; 
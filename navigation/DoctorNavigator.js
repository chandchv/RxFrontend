import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import DoctorDashboard from '../screens/Dashboard-doctor';
import AppointmentsList from '../screens/doctor/AppointmentsList';
import FullCalendar from '../screens/doctor/FullCalendar';
import AddPatientScreen from '../screens/doctor/AddPatientScreen';
import AppointmentDetails from '../screens/doctor/AppointmentDetails';
import CreateAppointment from '../screens/appointment/CreateAppointment';
import CreatePrescription from '../screens/doctor/CreatePrescription';
import PatientDashboard from '../screens/doctor/PatientDashboard';
import PatientDetails from '../screens/doctor/PatientDetails';
import PatientRecords from '../screens/doctor/PatientRecords';
import PrescriptionScreen from '../screens/doctor/PrescriptionScreen';
import TestResults from '../screens/doctor/TestResults';
import VitalsScreen from '../screens/doctor/VitalsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Dashboard Stack
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DoctorDashboard" component={DoctorDashboard} />
    <Stack.Screen name="AppointmentsList" component={AppointmentsList} />
    <Stack.Screen name="FullCalendar" component={FullCalendar} />
    <Stack.Screen name="CreateAppointment" component={CreateAppointment} />
    <Stack.Screen name="CreatePrescription" component={CreatePrescription} />
    <Stack.Screen name="AppointmentDetail" component={AppointmentDetails} />
    <Stack.Screen name="PatientDetail" component={PatientDetails} />
    <Stack.Screen name="PatientRecords" component={PatientRecords} />
    <Stack.Screen name="Prescription" component={PrescriptionScreen} />
    <Stack.Screen name="TestResults" component={TestResults} />
    <Stack.Screen name="Vitals" component={VitalsScreen} />
  </Stack.Navigator>
);

// Appointments Stack
const AppointmentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AppointmentsList" component={AppointmentsList} />
    <Stack.Screen name="AppointmentDetails" component={AppointmentDetails} />
    <Stack.Screen name="CreateAppointment" component={CreateAppointment} />
    <Stack.Screen name="CreatePrescription" component={CreatePrescription} />
    <Stack.Screen name="PatientDetails" component={PatientDetails} />
    <Stack.Screen name="PatientRecords" component={PatientRecords} />
    <Stack.Screen name="Prescription" component={PrescriptionScreen} />
    <Stack.Screen name="TestResults" component={TestResults} />
    <Stack.Screen name="Vitals" component={VitalsScreen} />
  </Stack.Navigator>
);

// Patients Stack
const PatientsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PatientDashboard" component={PatientDashboard} />
    <Stack.Screen name="AddPatient" component={AddPatientScreen} />
    <Stack.Screen name="PatientDetails" component={PatientDetails} />
    <Stack.Screen name="PatientRecords" component={PatientRecords} />
    <Stack.Screen name="Prescription" component={PrescriptionScreen} />
    <Stack.Screen name="TestResults" component={TestResults} />
    <Stack.Screen name="Vitals" component={VitalsScreen} />
  </Stack.Navigator>
);

// Calendar Stack
const CalendarStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FullCalendar" component={FullCalendar} />
    <Stack.Screen name="CreateAppointment" component={CreateAppointment} />
    <Stack.Screen name="AppointmentDetail" component={AppointmentDetails} />
    <Stack.Screen name="PatientDetail" component={PatientDetails} />
    <Stack.Screen name="PatientRecords" component={PatientRecords} />
    <Stack.Screen name="Prescription" component={PrescriptionScreen} />
    <Stack.Screen name="TestResults" component={TestResults} />
    <Stack.Screen name="Vitals" component={VitalsScreen} />
  </Stack.Navigator>
);

const DoctorNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Appointments':
              iconName = 'event';
              break;
            case 'Patients':
              iconName = 'people';
              break;
            case 'Calendar':
              iconName = 'calendar-today';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen 
        name="Appointments" 
        component={AppointmentsStack}
        options={{
          tabBarLabel: 'Appointments',
        }}
      />
      <Tab.Screen 
        name="Patients" 
        component={PatientsStack}
        options={{
          tabBarLabel: 'Patients',
        }}
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarStack}
        options={{
          tabBarLabel: 'Calendar',
        }}
      />
    </Tab.Navigator>
  );
};

export default DoctorNavigator; 
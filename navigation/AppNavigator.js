import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuth } from '../contexts/AuthContext'; // Make sure you have this context

// Import your screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import Dashboard from '../screens/Dashboard';
import PatientScreen from '../screens/Patient';
import DoctorInfo from '../screens/DoctorInfo';
import AppointmentsScreen from '../screens/appointment/AppointmentsScreen';
import AppointmentsList from '../screens/doctor/AppointmentsList';
import PrescriptionsScreen from '../screens/PrescriptionsScreen';
import DoctorDashboard from '../screens/doctor/DoctorDashboard';
import PatientDashboard from '../screens/patient/PatientDashboard';
import ClinicManagementScreen from '../screens/ClinicManagementScreen';
import AddDoctorProfileScreen from '../screens/AddDoctorProfileScreen';
import AddStaffScreen from '../screens/AddStaffScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PrescriptionDetailScreen from '../screens/patient/PrescriptionDetailScreen';
import PatientDetails from '../screens/doctor/PatientDetails';
import PatientDetailsScreen from '../screens/PatientDetails';
import PatientMedicalHistory from '../screens/patient/PatientMedicalHistory';
//import PatientListScreen from '../screens/patient/PatientListScreen';

import pastAppointments from '../screens/appointment/PastAppointments';
import CreateAppointmentPatient from '../screens/patient/CreateAppointment';
import PatientBilling from '../screens/patient/PatientBilling';
import CreateAppointmentDoctor from '../screens/doctor/CreateAppointment';
import StaffDashboard from '../screens/staff/StaffDashboard';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AppointmentDetails from '../screens/doctor/AppointmentDetails';
import CreatePrescription from '../screens/doctor/CreatePrescription';
import PatientListScreen from '../screens/doctor/PatientListScreen';
import AddPatientScreen from '../screens/doctor/AddPatientScreen';
import PrescriptionListScreen from '../screens/doctor/PrescriptionListScreen';
import ClinicAdminDashboard from '../screens/admin/ClinicAdminDashboard';
import DoctorManagement from '../screens/admin/DoctorManagement';
import PatientManagement from '../screens/admin/PatientManagement';
import AppointmentManagement from '../screens/admin/AppointmentManagement';
import StaffManagement from '../screens/admin/StaffManagement';
import ClinicReports from '../screens/admin/ClinicReports';
import ClinicSettings from '../screens/admin/ClinicSettings';
import EditDoctor from '../screens/admin/EditDoctor';
import Generateslots from '../screens/doctor/Generateslots';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Patient Stack Navigator
const PatientStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="PatientList" component={PatientListScreen} />
    <Stack.Screen name="MedicalHistory" component={PatientMedicalHistory} />
    <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
    <Stack.Screen name="AppointmentList" component={AppointmentsScreen} />
    <Stack.Screen name="AppointmentDetails" component={AppointmentDetails} />
    <Stack.Screen name="CreateAppointment" component={CreateAppointmentPatient} />
    <Stack.Screen name="PatientDashboard" component={PatientDashboard} />
    <Stack.Screen name="PatientBilling" component={PatientBilling} />
    <Stack.Screen name="PatientDetailsScreen" component={PatientDetailsScreen} />
    <Stack.Screen name="PatientScreen" component={PatientScreen} />   
  </Stack.Navigator>
);

// Appointment Stack Navigator
const AppointmentStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AppointmentList" component={AppointmentsScreen} />
    <Stack.Screen name="AppointmentDetails" component={AppointmentDetails} />
    
  </Stack.Navigator>
);

// Doctor Stack Navigator
const DoctorStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="DoctorDashboard" 
      component={DoctorDashboard}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="DoctorProfile"
      component={DoctorInfo}
      options={{ title: 'My Profile' }}
    />
    <Stack.Screen 
      name="AppointmentsList"
      component={AppointmentsList}
      options={{ title: 'Appointments' }}
    />
    <Stack.Screen 
      name="CreateAppointment"
      component={CreateAppointmentDoctor}
      options={{ title: 'Create Appointment' }}
    />
    <Stack.Screen 
      name="PatientList"
      component={PatientListScreen}
      options={{ title: 'My Patients' }}
    />
    <Stack.Screen 
      name="AddPatient"
      component={AddPatientScreen}
      options={{ title: 'Add New Patient' }}
    />
    <Stack.Screen 
      name="PrescriptionList"
      component={PrescriptionListScreen}
      options={{ title: 'Prescriptions' }}
    />
    <Stack.Screen 
      name="AppointmentDetails" 
      component={AppointmentDetails}
      options={{ title: 'Appointment Details' }}
    />
    <Stack.Screen 
      name="CreatePrescription" 
      component={CreatePrescription}
      options={{ title: 'Create Prescription' }}
    />
    <Stack.Screen 
      name="PatientDetailsScreen"
      component={PatientDetailsScreen}
      options={{ title: 'Patient Details' }}
    />
    <Stack.Screen 
      name="GenerateSlots"
      component={Generateslots}
      options={{ title: 'Generate Slots' }}
    />
  </Stack.Navigator>
);
const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="AdminDashboard" 
      component={AdminDashboard} 
    />
    <Stack.Screen 
      name="EditDoctor" 
      component={EditDoctor} 
    />
    <Stack.Screen name="AddStaffScreen" component={AddStaffScreen} />
  </Stack.Navigator>
);

// Tab Navigator for main content
const TabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="DoctorDashboard" component={DoctorDashboard} />
    <Tab.Screen name="Patients" component={PatientStack} />
    <Tab.Screen name="AppointmentsScreen" component={AppointmentStack} />
    <Tab.Screen name="PastAppointments" component={pastAppointments} />
  </Tab.Navigator>
);

// Drawer Navigator wrapping the Tab Navigator
const DrawerNavigator = () => (
  <Drawer.Navigator>
    <Drawer.Screen 
      name="MainTabs" 
      component={TabNavigator}
      options={{ headerShown: false }}
    />
    <Drawer.Screen name="Profile" component={ProfileScreen} />
    <Drawer.Screen name="ClinicManagement" component={ClinicManagementScreen} />
    {/* Add other drawer screens here */}
  </Drawer.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0066cc',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!user ? (
        // Auth Routes
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : user.is_superuser || user.role === 'ADMIN' ? (
        // Admin/Superuser Routes
        <>
          <Stack.Screen 
            name="AddStaffScreen" 
            component={AddStaffScreen}
            options={{ title: 'Add Staff' }} />
          <Stack.Screen 
            name="ClinicAdminDashboard" 
            component={ClinicAdminDashboard}
            options={{ title: 'Clinic Dashboard' }}
          />
          <Stack.Screen 
            name="DoctorManagement" 
            component={DoctorManagement}
            options={{ title: 'Manage Doctors' }}
          />
          <Stack.Screen 
            name="PatientManagement" 
            component={PatientManagement}
            options={{ title: 'Manage Patients' }}
          />
          <Stack.Screen 
            name="AppointmentManagement" 
            component={AppointmentManagement}
            options={{ title: 'Manage Appointments' }}
          />
          <Stack.Screen 
            name="StaffManagement" 
            component={StaffManagement}
            options={{ title: 'Manage Staff' }}
          />
          <Stack.Screen 
            name="ClinicReports" 
            component={ClinicReports}
            options={{ title: 'Reports' }}
          />
          <Stack.Screen 
            name="ClinicSettings" 
            component={ClinicSettings}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen 
            name="EditDoctor" 
            component={EditDoctor}
            options={{ title: 'Edit Doctor' }}
          />
        </>
      ) : user.role === 'DOCTOR' ? (
        // Doctor Routes
        <>
          <Stack.Screen 
            name="DoctorDashboard" 
            component={DoctorDashboard}
            options={{ title: 'Doctor Dashboard' }}
          />
          <Stack.Screen 
            name="DoctorProfile"
            component={DoctorInfo}
            options={{ title: 'My Profile' }}
          />
          <Stack.Screen 
            name="PatientListScreen" 
            component={PatientListScreen}
            options={{ title: 'My Patients' }}
          />
          <Stack.Screen 
            name="PatientDetails" 
            component={PatientDetails}
            options={{ title: 'Patient Details' }}
          />
          <Stack.Screen 
            name="AddPatientScreen"
            component={AddPatientScreen}
            options={{ title: 'Add New Patient' }}
          />
          <Stack.Screen 
            name = "AppointmentsList"
            component = {AppointmentsList}
            options = {{title: "Appointments"}}
          />
          <Stack.Screen 
            name = "CreateAppointment"
            component = {CreateAppointmentDoctor}
            options = {{title: "Create Appointment"}}
          />
          <Stack.Screen 
            name="GenerateSlots"
            component={Generateslots}
            options={{ title: 'Generate Slots' }}
          />
        </>
      ) : (
        // Patient Routes
        <>
          <Stack.Screen 
            name="PatientDashboard" 
            component={PatientDashboard}
            options={{ title: 'Patient Dashboard' }}
          />
        </>
      )}
      {/* Auth Screens */}
      <Stack.Screen 
        name="Signup" 
        component={SignupScreen}
        options={{ headerShown: false }}
      />
      
      {/* Dashboard Screens */}
      <Stack.Screen 
        name="StaffDashboard" 
        component={StaffDashboard}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboard}
        options={{ headerShown: false }}
      />
      
      {/* Main App Screen (Drawer) */}
      <Stack.Screen 
        name="MainApp" 
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      {/* Other Modal Screens */}
      <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
      
      <Stack.Screen name="AddDoctorProfile" component={AddDoctorProfileScreen} />
      <Stack.Screen name="AddStaffScreen" component={AddStaffScreen} />
      <Stack.Screen 
        name="AppointmentDetails" 
        component={AppointmentDetails}
        options={{
          title: 'Appointment Details',
          headerStyle: {
            backgroundColor: '#0066cc',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen 
        name="CreatePrescription" 
        component={CreatePrescription}
        options={{
          title: 'Create Prescription',
          headerStyle: {
            backgroundColor: '#0066cc',
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator; 
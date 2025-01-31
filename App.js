import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CustomDrawer from './components/CustomDrawer';
import LoginScreen from './screens/LoginScreen';
import DoctorDashboard from './screens/doctor/DoctorDashboard';
import PatientDashboard from './screens/patient/PatientDashboard';
import ClinicAdminDashboard from './screens/admin/ClinicAdminDashboard';
import PatientManagement from './screens/admin/PatientManagement';
import DoctorManagement from './screens/admin/DoctorManagement';
import ClinicSettings from './screens/admin/ClinicSettings';
import ClinicReports from './screens/admin/ClinicReports';
import StaffManagement from './screens/admin/StaffManagement';
import EditDoctor from './screens/admin/EditDoctor';
import AppointmentManagement from './screens/admin/AppointmentManagement';
import AppointmentsList from './screens/doctor/AppointmentsList';
import Generateslots from './screens/doctor/Generateslots';
import PatientListScreen from './screens/doctor/PatientListScreen';
import PrescriptionListScreen from './screens/doctor/PrescriptionListScreen';
import CreateAppointment from './screens/doctor/CreateAppointment';
import CreateAppointmentPatient from './screens/patient/CreateAppointment';
import AppointmentDetails from './screens/doctor/AppointmentDetails';
import AddPatientScreen from './screens/doctor/AddPatientScreen';
import DoctorProfile from './screens/DoctorInfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SignupScreen from './screens/SignupScreen';
import AddStaffScreen from './screens/AddStaffScreen';
import Appointments from './screens/appointment/Appointments';
import ProfileScreen from './screens/ProfileScreen';
import EditPatient from './screens/admin/EditPatient';
import PatientDetails from './screens/doctor/PatientDetails';
import PrescriptionDetailScreen from './screens/patient/PrescriptionDetailScreen';
import PrescriptionHistoryScreen from './screens/PrescriptionHistoryScreen';
import AppointmentsListPatient from './screens/patient/AppointmentsList';
import AddDoctorProfileScreen from './screens/admin/AddDoctorProfileScreen';
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const PatientDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawer {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        drawerActiveTintColor: '#2196F3',
        drawerInactiveTintColor: '#666',
      }}
    >
      <Drawer.Screen 
        name="PatientDashboard" 
        component={PatientDashboard}
        options={{
          title: 'Dashboard',
          drawerIcon: ({color}) => <Icon name="dashboard" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="PatientAppointments" 
        component={AppointmentsListPatient}
        options={{
          title: 'My Appointments',
          drawerIcon: ({color}) => <Icon name="event" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="CreateAppointmentPatient" 
        component={CreateAppointmentPatient}
        options={{
          title: 'Create Appointment',
          drawerIcon: ({color}) => <Icon name="event" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="ProfileScreen" 
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          drawerIcon: ({color}) => <Icon name="person" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="PrescriptionDetailScreen" 
        component={PrescriptionDetailScreen}
        options={{
          title: 'Prescription Details',
          drawerIcon: ({color}) => <Icon name="description" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="PrescriptionHistoryScreen" 
        component={PrescriptionHistoryScreen}
        options={{
          title: 'Prescription History',
          drawerIcon: ({color}) => <Icon name="history" size={24} color={color} />,
        }}
      />
    </Drawer.Navigator>
  );
};

const DoctorDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawer {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: '#2196F3',
        drawerInactiveTintColor: '#666',
      }}
    >
      <Drawer.Screen 
        name="PatientDetails" 
        component={PatientDetails}
        options={{
          title: 'Patient Details',
          drawerIcon: ({color}) => <Icon name="person" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="DoctorDashboard" 
        component={DoctorDashboard}
        options={{
          title: 'Dashboard',
          drawerIcon: ({color}) => (
            <Icon name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="AppointmentsList" 
        component={AppointmentsList}
        options={{
          title: 'Appointments',
          drawerIcon: ({color}) => (
            <Icon name="event" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="GenerateSlots" 
        component={Generateslots}
        options={{
          title: 'Manage Slots',
          drawerIcon: ({color}) => (
            <Icon name="schedule" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="PatientListScreen" 
        component={PatientListScreen}
        options={{
          title: 'Patients',
          drawerIcon: ({color}) => (
            <Icon name="people" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="PrescriptionListScreen" 
        component={PrescriptionListScreen}
        options={{
          title: 'Prescriptions',
          drawerIcon: ({color}) => (
            <Icon name="description" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DoctorProfile" 
        component={DoctorProfile}
        options={{
          title: 'Doctor Profile'
        }}
      />
    </Drawer.Navigator>
  );
};

const AdminDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawer {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        drawerActiveTintColor: '#2196F3',
        drawerInactiveTintColor: '#666',
      }}
    >
      <Drawer.Screen 
        name="AdminDashboard" 
        component={ClinicAdminDashboard}
        options={{
          title: 'Admin Dashboard',
          drawerIcon: ({color}) => <Icon name="dashboard" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="AddDoctor" 
        component={AddDoctorProfileScreen}
        options={{
          title: 'Add Doctor',
          drawerIcon: ({color}) => <Icon name="people" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="PatientManagement" 
        component={PatientManagement}
        options={{
          title: 'Patient Management',
          drawerIcon: ({color}) => <Icon name="people" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="DoctorManagement" 
        component={DoctorManagement}
        options={{
          title: 'Doctor Management',
          drawerIcon: ({color}) => <Icon name="people" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="ClinicSettings" 
        component={ClinicSettings}
        options={{
          title: 'Clinic Settings',
          drawerIcon: ({color}) => <Icon name="settings" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="ClinicReports" 
        component={ClinicReports}
        options={{
          title: 'Clinic Reports',
          drawerIcon: ({color}) => <Icon name="bar-chart" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="StaffManagement" 
        component={StaffManagement}
        options={{
          title: 'Staff Management',
          drawerIcon: ({color}) => <Icon name="people" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="EditDoctor" 
        component={EditDoctor}
        options={{
          title: 'Edit Doctor',
        }}
      />
      <Drawer.Screen 
        name="AppointmentManagement" 
        component={AppointmentManagement}
        options={{
          title: 'Appointment Management',
          drawerIcon: ({color}) => <Icon name="event" size={24} color={color} />,
        }}
      />
      <Drawer.Screen 
        name="EditPatient" 
        component={EditPatient}
        options={{
          title: 'Edit Patient',
        }}
      />
    </Drawer.Navigator>
    

  );
};

const Navigation = () => {
  const { isLoggedIn, user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            {/* Choose navigator based on user role */}
            {(user?.role === 'SUPERUSER' || user?.role === 'CLINIC_ADMIN') ? (
              <Stack.Screen 
                name="AdminDrawer" 
                component={AdminDrawerNavigator} 
              />
            ) : user?.role === 'DOCTOR' ? (
              <Stack.Screen 
                name="DoctorDrawer" 
                component={DoctorDrawerNavigator} 
              />
            ) : (
              <Stack.Screen 
                name="PatientDrawer" 
                component={PatientDrawerNavigator} 
              />
            )}
            
            {/* Common modal screens */}
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen 
                name="AppointmentDetails" 
                component={AppointmentDetails}
                options={{
                  headerShown: true,
                  title: 'Appointment Details',
                  headerStyle: { backgroundColor: '#2196F3' },
                  headerTintColor: '#fff',
                }}
                initialParams={{ appointmentId: null }}
              />
              <Stack.Screen 
                name="CreateAppointment" 
                component={CreateAppointment}
                options={{
                  headerShown: true,
                  title: 'Create Appointment',
                  headerStyle: { backgroundColor: '#2196F3' },
                  headerTintColor: '#fff',
                }}
              />
              <Stack.Screen 
                name="AddPatientScreen" 
                component={AddPatientScreen}
                options={{
                  headerShown: true,
                  title: 'Add Patient',
                  headerStyle: { backgroundColor: '#2196F3' },
                  headerTintColor: '#fff',
                }}
              />
              <Stack.Screen 
                name="AddStaffScreen" 
                component={AddStaffScreen}
                options={{
                  headerShown: true,
                  title: 'Add Staff',
                  headerStyle: { backgroundColor: '#2196F3' },
                  headerTintColor: '#fff',
                }}
              />
              <Stack.Screen 
                name="EditPatient" 
                component={EditPatient}
                options={{
                  title: 'Edit Patient',
                }}
              />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
};

export default App;

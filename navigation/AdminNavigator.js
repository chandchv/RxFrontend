import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import CustomDrawer from '../components/CustomDrawer';
import AdminDashboard from '../screens/admin/ClinicAdminDashboard';
import DoctorManagement from '../screens/admin/DoctorManagement';
import PatientManagement from '../screens/admin/PatientManagement';
import StaffManagement from '../screens/admin/StaffManagement';
import AppointmentManagement from '../screens/admin/AppointmentManagement';
import ClinicSettings from '../screens/admin/ClinicSettings';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EditDoctor from '../screens/admin/EditDoctor';
import AddDoctor from '../screens/admin/AddDoctor';
import EditPatient from '../screens/admin/EditPatient';
import LabManagement from '../screens/admin/LabManagement';
import ClinicReports from '../screens/admin/ClinicReports';
import LabDashboard from '../screens/lab/LabDashboard';
import PharmacyDashboard from '../screens/pharmacy/PharmacyDashboard';
import BillingDashboard from '../screens/billing/BillingDashboard';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

const AdminDrawerNavigator = () => {
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
        name="AdminDashboard" 
        component={AdminDashboard}
        options={{
          title: 'Dashboard',
          drawerIcon: ({color, size}) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="DoctorsList" 
        component={DoctorManagement}
        options={{
          title: 'Doctors',
          drawerIcon: ({color, size}) => (
            <Icon name="medical-services" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="PatientsList" 
        component={PatientManagement}
        options={{
          title: 'Patients',
          drawerIcon: ({color, size}) => (
            <Icon name="people" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Appointments" 
        component={AppointmentManagement}
        options={{
          title: 'Appointments',
          drawerIcon: ({color, size}) => (
            <Icon name="event" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="StaffManagement" 
        component={StaffManagement}
        options={{
          title: 'Staff Management',
          drawerIcon: ({color, size}) => (
            <Icon name="people" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="LabDashboard" 
        component={LabDashboard}
        options={{
          title: 'Laboratory',
          drawerIcon: ({color, size}) => (
            <Icon name="science" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="PharmacyDashboard" 
        component={PharmacyDashboard}
        options={{
          title: 'Pharmacy',
          drawerIcon: ({color, size}) => (
            <Icon name="local-pharmacy" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="BillingDashboard" 
        component={BillingDashboard}
        options={{
          title: 'Billing',
          drawerIcon: ({color, size}) => (
            <Icon name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="ClinicReports" 
        component={ClinicReports}
        options={{
          title: 'Clinic Reports',
          drawerIcon: ({color, size}) => (
            <Icon name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="ClinicSettings" 
        component={ClinicSettings}
        options={{
          title: 'Clinic Settings',
          drawerIcon: ({color, size}) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// Main navigator that combines drawer and stack
const AdminNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminDrawer" component={AdminDrawerNavigator} />
      <Stack.Screen name="EditDoctor" component={EditDoctor} />
      <Stack.Screen name="EditPatient" component={EditPatient} />
      <Stack.Screen name="AddDoctor" component={AddDoctor} />
    </Stack.Navigator>
  );
};

export default AdminNavigator; 
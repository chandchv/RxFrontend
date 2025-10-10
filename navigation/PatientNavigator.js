import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Import additional screens for comprehensive navigation
import LabResultsScreen from '../screens/patient/LabResultsScreen';
import MessagesScreen from '../screens/patient/MessagesScreen';
import NotificationsScreen from '../screens/patient/NotificationsScreen';
import HealthOverviewScreen from '../screens/patient/HealthOverviewScreen';
import MedicationAdherenceScreen from '../screens/patient/MedicationAdherenceScreen';
import EmergencyInfoScreen from '../screens/patient/EmergencyInfoScreen';
import ContactDoctorScreen from '../screens/patient/ContactDoctorScreen';

// Import the new screens
import PharmacyHomeScreen from '../screens/pharmacy/PharmacyHomeScreen';
import PrescriptionDetailsScreen from '../screens/pharmacy/PrescriptionDetailsScreen';
import LabHomeScreen from '../screens/lab/LabHomeScreen';
import BillingHomeScreen from '../screens/billing/BillingHomeScreen';

// Import Clinical Records screens
import ClinicalRecordsDashboardScreen from '../screens/clinical-records/ClinicalRecordsDashboardScreen';
import ClinicalRecordsListScreen from '../screens/clinical-records/ClinicalRecordsListScreen';
import ClinicalRecordDetailScreen from '../screens/clinical-records/ClinicalRecordDetailScreen';
import RecordSearchScreen from '../screens/clinical-records/RecordSearchScreen';
import DocumentViewerScreen from '../screens/clinical-records/DocumentViewerScreen';

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

// Custom Drawer Content for Patient
const CustomPatientDrawer = (props) => {
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'userToken',
                'refreshToken',
                'user',
                'role',
                'doctorId',
                'patientId',
                'clinicId',
                'userType'
              ]);
              props.navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.drawerContainer}>
      <DrawerContentScrollView {...props}>
        <View style={styles.drawerHeader}>
          <Icon name="local-hospital" size={40} color="#2196F3" />
          <Text style={styles.drawerTitle}>Patient Portal</Text>
        </View>
        
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Icon name="logout" size={24} color="#F44336" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

// Stack Navigator for Patient Screens
const PatientStack = () => {
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
        name="PatientDashboard" 
        component={PatientDashboard}
        options={{ 
          title: 'Patient Dashboard',
          headerShown: true
        }}
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
      <Stack.Screen 
        name="ClinicalRecordsDashboard" 
        component={ClinicalRecordsDashboardScreen}
        options={{ title: 'Clinical Records' }}
      />
      <Stack.Screen 
        name="ClinicalRecordsList" 
        component={ClinicalRecordsListScreen}
        options={{ title: 'My Records' }}
      />
      <Stack.Screen 
        name="ClinicalRecordDetail" 
        component={ClinicalRecordDetailScreen}
        options={{ title: 'Record Details' }}
      />
      <Stack.Screen 
        name="RecordSearch" 
        component={RecordSearchScreen}
        options={{ title: 'Search Records' }}
      />
      <Stack.Screen 
        name="DocumentViewer" 
        component={DocumentViewerScreen}
        options={{ title: 'Document Viewer' }}
      />
      
      {/* Additional Patient Screens */}
      <Stack.Screen 
        name="LabResults" 
        component={LabResultsScreen}
        options={{ title: 'Lab Results' }}
      />
      <Stack.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen 
        name="HealthOverview" 
        component={HealthOverviewScreen}
        options={{ title: 'Health Overview' }}
      />
      <Stack.Screen 
        name="MedicationAdherence" 
        component={MedicationAdherenceScreen}
        options={{ title: 'Medication Adherence' }}
      />
      <Stack.Screen 
        name="EmergencyInfo" 
        component={EmergencyInfoScreen}
        options={{ title: 'Emergency Information' }}
      />
      <Stack.Screen 
        name="ContactDoctor" 
        component={ContactDoctorScreen}
        options={{ title: 'Contact Doctor' }}
      />
    </Stack.Navigator>
  );
};

// Main Patient Navigator using Drawer
const PatientNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomPatientDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#2196F3',
        drawerInactiveTintColor: '#666',
        drawerLabelStyle: {
          marginLeft: -20,
        },
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={PatientStack}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="My Appointments" 
        component={AppointmentsList}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="event" size={24} color={color} />
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen 
        name="My Prescriptions" 
        component={PrescriptionDetailScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="description" size={24} color={color} />
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen 
        name="Medical History" 
        component={MedicalHistory}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="history" size={24} color={color} />
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen 
        name="Lab Results" 
        component={LabResultsScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="science" size={24} color={color} />
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="message" size={24} color={color} />
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen 
        name="Health Overview" 
        component={HealthOverviewScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="favorite" size={24} color={color} />
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen 
        name="Book Appointment" 
        component={CreateAppointmentPatient}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="add-circle" size={24} color={color} />
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }}
      />
      <Drawer.Screen 
        name="Emergency Info" 
        component={EmergencyInfoScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="local-hospital" size={24} color={color} />
          ),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#F44336',
          },
          headerTintColor: '#fff',
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 8,
  },
  logoutButton: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoutText: {
    marginLeft: 32,
    color: '#F44336',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PatientNavigator; 
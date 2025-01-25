import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import your screens
import DashboardScreen from '../screens/Dashboard';
import ClinicManagementScreen from '../screens/ClinicManagementScreen';
import PrescriptionScreen from '../screens/PrescriptionScreen';
import PrescriptionDetailScreen from '../screens/patient/PrescriptionDetailScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DoctorDashboard from '../screens/DoctorDashboard';
import PatientDashboard from '../screens/patient/PatientDashboard';
import CreateAppointment from '../screens/doctor/CreateAppointment';
import CreatePatientAppointment from '../screens/patient/CreateAppointment';
import PastAppointments from '../screens/PastAppointments';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
  const navigation = useNavigation();

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
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userType');
              navigation.reset({
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
          <Icon name="medical-services" size={40} color="#0066cc" />
          <Text style={styles.drawerTitle}>Rx App</Text>
        </View>
        
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Icon name="logout" size={24} color="#FF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const DrawerNavigator = () => {
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    const getUserType = async () => {
      const type = await AsyncStorage.getItem('userType');
      setUserType(type);
    };
    getUserType();
  }, []);

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0066cc',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerActiveTintColor: '#0066cc',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: {
          marginLeft: -20,
        },
      }}
    >
      {userType === 'doctor' && (
        <Drawer.Screen 
          name="Doctor Dashboard" 
          component={DoctorDashboard}
          options={{
            drawerIcon: ({ color }) => (
              <Icon name="dashboard" size={24} color={color} />
            ),
          }}
        />
      )}
      {userType === 'patient' && (
        <Drawer.Screen 
          name="Patient Dashboard" 
          component={PatientDashboard}
          options={{
            drawerIcon: ({ color }) => (
              <Icon name="dashboard" size={24} color={color} />
            ),
          }}
        />
      )}
      {userType === 'admin' && (
        <Drawer.Screen 
          name="Admin Dashboard" 
          component={DashboardScreen} // Assuming this is the admin dashboard
          options={{
            drawerIcon: ({ color }) => (
              <Icon name="dashboard" size={24} color={color} />
            ),
          }}
        />

        
      )}
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="person" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Clinic Management" 
        component={ClinicManagementScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="business" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Appointments" 
        component={AppointmentsScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="event" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Prescriptions" 
        component={PrescriptionScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="description" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="CreateAppointment" 
        component={CreateAppointment}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="add" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="CreatePatientAppointment" 
        component={CreatePatientAppointment}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="add" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="PastAppointments" 
        component={PastAppointments}
        options={{
          drawerIcon: ({ color }) => (
            <Icon name="history" size={24} color={color} />
          ),
        }}
        
      />
      {/* Add other screens as needed */}
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
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066cc',
    marginTop: 8,
  },
  logoutButton: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 32,
    color: '#FF4444',
    fontWeight: 'bold',
  },
});

export default DrawerNavigator; 
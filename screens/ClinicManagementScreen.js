import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const ClinicManagementScreen = ({ route, navigation }) => {
  const { clinicId } = route.params;
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClinicData();
  }, []);

  const fetchClinicData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const [doctorsResponse, staffResponse, appointmentsResponse] = await Promise.all([
        fetch(`${API_URL}/api/${clinicId}/doctors/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/clinics/${clinicId}/staff/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/clinics/${clinicId}/appointments/`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!doctorsResponse.ok || !staffResponse.ok || !appointmentsResponse.ok) {
        throw new Error('Failed to fetch clinic data');
      }

      const [doctorsData, staffData, appointmentsData] = await Promise.all([
        doctorsResponse.json(),
        staffResponse.json(),
        appointmentsResponse.json(),
      ]);

      setDoctors(doctorsData);
      setStaff(staffData);
      setAppointments(appointmentsData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = () => {
    navigation.navigate('AddDoctorProfileScreen', { clinicId });
  };

  const handleAddStaff = () => {
    navigation.navigate('AddStaffScreen', { clinicId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Clinic</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Doctors</Text>
        {doctors.map((doctor) => (
          <View key={doctor.id} style={styles.card}>
            <Text style={styles.cardTitle}>{doctor.name}</Text>
            <Text style={styles.cardDetail}>Specialization: {doctor.specialization}</Text>
          </View>
        ))}
        <Pressable style={styles.addButton} onPress={handleAddDoctor}>
          <Text style={styles.buttonText}>Add Doctor</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Staff</Text>
        {staff.map((staffMember) => (
          <View key={staffMember.id} style={styles.card}>
            <Text style={styles.cardTitle}>{staffMember.name}</Text>
            <Text style={styles.cardDetail}>Role: {staffMember.role}</Text>
          </View>
        ))}
        <Pressable style={styles.addButton} onPress={handleAddStaff}>
          <Text style={styles.buttonText}>Add Staff</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointments</Text>
        {appointments.map((appointment) => (
          <View key={appointment.id} style={styles.card}>
            <Text style={styles.cardTitle}>Patient: {appointment.patient_name}</Text>
            <Text style={styles.cardDetail}>Date: {appointment.appointment_date}</Text>
            <Text style={styles.cardDetail}>Status: {appointment.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardDetail: {
    color: '#666',
    marginBottom: 3,
  },
  addButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ClinicManagementScreen; 
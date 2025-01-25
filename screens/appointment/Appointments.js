import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, Alert, Platform, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppointmentScreen = ({ navigation }) => {
    const [selectedPatient, setSelectedPatient] = useState('');
    const [patients, setPatients] = useState([]);
    const [doctor, setDoctor] = useState('');
    const [appointmentDate, setAppointmentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [symptoms, setSymptoms] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [medications, setMedications] = useState('');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch patients when component mounts
    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            console.log('Fetching patients with token:', token); // Debug log
            
            const response = await fetch(`${API_URL}/api/patients/`, {  // Updated endpoint
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            console.log('Patient response status:', response.status); // Debug log
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Patients data:', data); // Debug log
            
            if (Array.isArray(data)) {
                setPatients(data);
            } else if (data.results && Array.isArray(data.results)) {
                setPatients(data.results);
            } else {
                throw new Error('Invalid patients data format');
            }
        } catch (error) {
            console.error('Error fetching patients:', error);
            Alert.alert('Error', 'Failed to fetch patients list');
        }
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setAppointmentDate(selectedDate);
        }
    };

    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const newDateTime = new Date(appointmentDate);
            newDateTime.setHours(selectedTime.getHours());
            newDateTime.setMinutes(selectedTime.getMinutes());
            setAppointmentDate(newDateTime);
        }
    };

    const handleSubmit = async () => {
        if (!selectedPatient) {
            Alert.alert('Error', 'Please select a patient');
            return;
        }

        const appointmentData = {
            patient: selectedPatient,
            doctor,
            appointment_date: appointmentDate.toISOString(),
            symptoms,
            diagnosis,
            medications,
        };

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/api/appointments/create/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentData),
            });

            if (response.ok) {
                Alert.alert('Success', 'Appointment created successfully');
                // Reset form
                setSelectedPatient('');
                setDoctor('');
                setAppointmentDate(new Date());
                setSymptoms('');
                setDiagnosis('');
                setMedications('');
            } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.error || 'Failed to create appointment');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error or server not responding');
        }
    };

    return (
        <ScrollView style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Button title="Retry" onPress={() => {
                        setLoading(true);
                        setError(null);
                        fetchPatients();
                        fetchAppointments();
                    }} />
                </View>
            ) : (
                <>
                    <Text style={styles.title}>Create Appointment</Text>

                    <Text style={styles.label}>Select Patient:</Text>
                    <Picker
                        selectedValue={selectedPatient}
                        onValueChange={(itemValue) => setSelectedPatient(itemValue)}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select a patient" value="" />
                        {patients.map((patient) => (
                            <Picker.Item
                                key={patient.id}
                                label={`${patient.first_name} ${patient.last_name}`}
                                value={patient.id}
                            />
                        ))}
                    </Picker>

                    <TextInput
                        style={styles.input}
                        placeholder="Doctor's Name"
                        value={doctor}
                        onChangeText={setDoctor}
                    />

                    <View style={styles.dateTimeContainer}>
                        <Button
                            title="Select Date"
                            onPress={() => setShowDatePicker(true)}
                        />
                        <Button
                            title="Select Time"
                            onPress={() => setShowTimePicker(true)}
                        />
                        <Text style={styles.dateTimeText}>
                            Selected: {appointmentDate.toLocaleString()}
                        </Text>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={appointmentDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                            value={appointmentDate}
                            mode="time"
                            display="default"
                            onChange={handleTimeChange}
                        />
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="Symptoms"
                        value={symptoms}
                        onChangeText={setSymptoms}
                        multiline
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Diagnosis"
                        value={diagnosis}
                        onChangeText={setDiagnosis}
                        multiline
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Medications"
                        value={medications}
                        onChangeText={setMedications}
                        multiline
                    />

                    <Button title="Create Appointment" onPress={handleSubmit} />
                    <Button title="Back to Dashboard" onPress={() => navigation.goBack()} />
                </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        marginBottom: 15,
        borderRadius: 5,
    },
    picker: {
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
    },
    dateTimeContainer: {
        marginBottom: 15,
    },
    dateTimeText: {
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
});

export default AppointmentScreen;
import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, Alert, Platform, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';

const CreateAppointmentPatient = ({ navigation }) => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [reason, setReason] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [medications, setMedications] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);

    useEffect(() => {
        fetchDoctors();
    }, []);

    useEffect(() => {
        if (selectedDoctor && selectedDate) {
            fetchAvailableSlots();
        }
    }, [selectedDoctor, selectedDate]);

    const fetchDoctors = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/api/doctors/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to fetch doctors');
            const data = await response.json();
            setDoctors(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching doctors:', error);
            setError('Failed to load doctors list');
            setLoading(false);
        }
    };

    const fetchAvailableSlots = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const formattedDate = selectedDate.toISOString().split('T')[0];
            
            console.log('API URL:', API_URL); // Debug log
            console.log('Full URL:', `${API_URL}/api/appointments/available-slots/${selectedDoctor}/${formattedDate}/`); // Debug log
            console.log('Token:', token); // Debug log
            
            const response = await fetch(
                `${API_URL}/api/appointments/available-slots/${selectedDoctor}/${formattedDate}/`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                }
            ).catch(error => {
                console.error('Network error details:', error);
                throw new Error('Network request failed: ' + error.message);
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response status:', response.status);
                console.error('Response headers:', response.headers);
                console.error('Error response:', errorText);
                throw new Error(`Failed to fetch slots: ${response.status}`);
            }

            const data = await response.json();
            console.log('Available slots response:', data);
            setAvailableSlots(data.available_slots || []);
            setSelectedSlot(null);
        } catch (error) {
            console.error('Error fetching slots:', error);
            console.error('Error details:', error.message);
            Alert.alert(
                'Error', 
                'Failed to load available slots. Please check your internet connection and try again.'
            );
        }
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setSelectedDate(selectedDate);
        }
    };

    const handleSubmit = async () => {
        if (!selectedDoctor || !selectedSlot) {
            Alert.alert('Error', 'Please select both doctor and time slot');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('userToken');
            const formattedDate = selectedDate.toISOString().split('T')[0];

            const response = await fetch(`${API_URL}/api/appointments/create/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctor: selectedDoctor,
                    appointment_date: formattedDate,
                    appointment_time: selectedSlot,
                    reason: reason || ''
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response status:', response.status);
                console.error('Error response:', errorText);
                throw new Error('Failed to create appointment');
            }

            const data = await response.json();
            console.log('Appointment created:', data);
            Alert.alert('Success', 'Appointment created successfully');
            navigation.goBack();

        } catch (error) {
            console.error('Error creating appointment:', error);
            Alert.alert(
                'Error', 
                'Failed to create appointment. Please try again.'
            );
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <Button title="Retry" onPress={fetchDoctors} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Book an Appointment</Text>

            <Text style={styles.label}>Select Doctor:</Text>
            <Picker
                selectedValue={selectedDoctor}
                onValueChange={(itemValue) => setSelectedDoctor(itemValue)}
                style={styles.picker}
            >
                <Picker.Item label="Select a doctor" value="" />
                {doctors.map((doctor) => (
                    <Picker.Item
                        key={doctor.id}
                        label={`Dr. ${doctor.user_name}`}
                        value={doctor.id}
                    />
                ))}
            </Picker>

            <Text style={styles.label}>Select Date:</Text>
            <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
            >
                <Text>{selectedDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                />
            )}

            {availableSlots.length > 0 && (
                <View style={styles.slotsContainer}>
                    <Text style={styles.label}>Available Time Slots:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {availableSlots.map((slot) => (
                            <TouchableOpacity
                                key={slot}
                                style={[
                                    styles.slotButton,
                                    selectedSlot === slot && styles.selectedSlot
                                ]}
                                onPress={() => setSelectedSlot(slot)}
                            >
                                <Text style={[
                                    styles.slotText,
                                    selectedSlot === slot && styles.selectedSlotText
                                ]}>
                                    {slot}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <TextInput
                style={styles.input}
                placeholder="Reason for Appointment"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
            />

            <TouchableOpacity
                style={[styles.submitButton, (!selectedDoctor || !selectedSlot) && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={!selectedDoctor || !selectedSlot}
            >
                <Text style={styles.submitButtonText}>Book Appointment</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        marginBottom: 20,
        borderRadius: 8,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    picker: {
        marginBottom: 20,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    dateButton: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    slotsContainer: {
        marginBottom: 20,
    },
    slotButton: {
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginRight: 10,
        minWidth: 100,
        alignItems: 'center',
    },
    selectedSlot: {
        backgroundColor: '#2196F3',
    },
    slotText: {
        color: '#333',
    },
    selectedSlotText: {
        color: '#fff',
    },
    submitButton: {
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.5,
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
});

export default CreateAppointmentPatient;
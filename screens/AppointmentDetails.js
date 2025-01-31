import React, { useEffect } from 'react';
import { Alert } from 'react-native';

const AppointmentDetails = ({ route, navigation }) => {
  const appointmentId = route.params?.appointmentId;

  useEffect(() => {
    if (!appointmentId) {
      Alert.alert('Error', 'No appointment selected');
      navigation.goBack();
    }
  }, [appointmentId]);

  // ... rest of the component
};

export default AppointmentDetails; 
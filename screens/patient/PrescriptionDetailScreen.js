import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

const PrescriptionDetailScreen = ({ route }) => {
  const { prescriptionId } = route.params;
  const [prescription, setPrescription] = useState(null);
  const [clinicDetails, setClinicDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescriptionDetails();
  }, []);

  const fetchPrescriptionDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/users/api/patients/prescriptions/${prescriptionId}/details/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Prescription not found');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prescription details');
      }

      const data = await response.json();
      // Ensure items is always an array
      data.items = data.medicines || [];
      setPrescription(data);
      
      // Fetch clinic details using clinic_id from prescription
      if (data.clinic_id) {
        const clinicResponse = await fetch(`${API_URL}/users/api/clinic/profile/${data.clinic_id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        });
        
        if (!clinicResponse.ok) {
          console.error('Failed to fetch clinic details:', data.clinic_id);
          setClinicDetails(null);
          return;
        }
        
        const clinicData = await clinicResponse.json();
        setClinicDetails(clinicData);
      }
    } catch (error) {
      console.error('Error fetching prescription details:', error);
      Alert.alert('Error', error.message || 'Failed to fetch prescription details');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !prescription) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Doctor and Hospital Info */}
      <View style={styles.header}>
        <View style={styles.doctorSection}>
          <Text style={styles.doctorName}>Dr. {prescription.doctor_name || 'N/A'}</Text>
          <Text style={styles.qualification}>{prescription.doctor_qualification || 'N/A'}</Text>
          <Text style={styles.regNo}>Reg. No: {prescription.doctor_registration_number || 'N/A'}</Text>
        </View>

        {clinicDetails && (
          <View style={styles.clinicSection}>
            {clinicDetails?.logo_url && (
              <Image 
                source={{ uri: clinicDetails.logo_url }} 
                style={styles.logo}
              />
            )}
            <Text style={styles.hospitalName}>{clinicDetails?.name || 'N/A'}</Text>
            <Text style={styles.hospitalAddress}>
              {clinicDetails?.address || 'N/A'}
            </Text>
            <Text style={styles.hospitalContact}>
              Ph: {clinicDetails?.phone_number || 'N/A'}
              {clinicDetails?.timing && `, Timing: ${clinicDetails.timing}`}
            </Text>
            {clinicDetails?.closed_on && (
              <Text>Closed: {clinicDetails.closed_on}</Text>
            )}
          </View>
        )}
      </View>

      {/* Date */}
      <Text style={styles.date}>Date: {prescription.created_at || 'N/A'}</Text>

      {/* Patient Details */}
      <View style={styles.patientSection}>
        <Text style={styles.patientHeader}>
          ID: {prescription.id} - {prescription.patient_type || 'Regular'} ({prescription.patient_gender || 'N/A'}) / {prescription.patient_age || 'N/A'} Y    
          {prescription.patient_mobile && `Mob. No.: ${prescription.patient_mobile}`}
        </Text>
        <Text>Address: {prescription.patient_address || 'N/A'}</Text>
        <Text>
          Weight (Kg): {prescription.patient_weight || 'N/A'}, 
          Height (Cm): {prescription.patient_height || 'N/A'} 
          {prescription.patient_bmi && `(B.M.I. = ${prescription.patient_bmi})`}, 
          BP: {prescription.patient_bp || 'N/A'}
        </Text>
      </View>

      {/* Complaints and Findings Section */}
      <View style={styles.twoColumnSection}>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Chief Complaints</Text>
          <Text style={styles.contentText}>{prescription.chief_complaints || 'None'}</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Clinical Findings</Text>
          <Text style={styles.contentText}>{prescription.clinical_findings || 'None'}</Text>
        </View>
      </View>

      {/* Diagnosis */}
      <View style={styles.diagnosisSection}>
        <Text style={styles.sectionTitle}>Diagnosis:</Text>
        <Text style={styles.contentText}>{prescription.diagnosis || 'None'}</Text>
      </View>

      {/* Medications */}
      <View style={styles.medicationSection}>
        <View style={styles.medicationHeader}>
          <Text style={[styles.columnHeader, styles.medicineNameColumn]}>Medicine</Text>
          <Text style={[styles.columnHeader, styles.dosageColumn]}>Dosage</Text>
          <Text style={[styles.columnHeader, styles.durationColumn]}>Duration</Text>
        </View>
        {prescription.items && prescription.items.length > 0 ? (
          prescription.items.map((medicine, index) => (
            <View key={index} style={styles.medicationRow}>
              <View style={styles.medicineNameColumn}>
                <Text style={styles.medicineName}>{medicine.name}</Text>
                <Text style={styles.genericName}>{medicine.instructions}</Text>
              </View>
              <Text style={styles.dosageColumn}>{medicine.dosage}</Text>
              <Text style={styles.durationColumn}>{medicine.duration}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.contentText}>No medications prescribed</Text>
        )}
      </View>

      {/* Advice */}
      <View style={styles.adviceSection}>
        <Text style={styles.sectionTitle}>Advice:</Text>
        <Text style={styles.contentText}>{prescription.advice || 'None'}</Text>
      </View>

      {/* Follow Up */}
      <View style={styles.followUpSection}>
        <Text style={styles.followUpText}>
          Follow Up: {prescription.follow_up_date || 'Not specified'}
        </Text>
      </View>

      <Text style={styles.footnote}>
        Substitute with equivalent Generics as required.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  doctorSection: {
    flex: 1,
  },
  clinicSection: {
    flex: 2,
    alignItems: 'flex-end',
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: 5,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  qualification: {
    fontSize: 14,
  },
  regNo: {
    fontSize: 14,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0000FF',
  },
  hospitalAddress: {
    fontSize: 12,
    textAlign: 'right',
  },
  hospitalContact: {
    fontSize: 12,
    textAlign: 'right',
  },
  date: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  patientSection: {
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  patientHeader: {
    fontWeight: 'bold',
  },
  twoColumnSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 10,
  },
  column: {
    flex: 1,
    paddingRight: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  medicationSection: {
    marginVertical: 10,
  },
  medicationHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
  },
  medicationRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  medicineNameColumn: {
    flex: 2,
  },
  dosageColumn: {
    flex: 1,
    paddingHorizontal: 5,
  },
  durationColumn: {
    flex: 1,
  },
  columnHeader: {
    fontWeight: 'bold',
    flex: 1,
  },
  medicineName: {
    fontWeight: 'bold',
  },
  genericName: {
    fontSize: 12,
    color: '#666',
  },
  adviceSection: {
    marginVertical: 10,
  },
  followUpSection: {
    marginVertical: 10,
  },
  footnote: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
  },
  contentText: {
    fontSize: 14,
  },
});

export default PrescriptionDetailScreen; 
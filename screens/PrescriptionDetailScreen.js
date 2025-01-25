import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
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
      const response = await fetch(`${API_URL}/api/patient/prescriptions_detail/${prescriptionId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setPrescription(data);
      
      // Fetch clinic details using clinic_id from prescription
      if (data.clinic_id) {
        const clinicResponse = await fetch(`${API_URL}/api/clinics/${data.clinic_id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const clinicData = await clinicResponse.json();
        setClinicDetails(clinicData);
      }
    } catch (error) {
      console.error('Error:', error);
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
          <Text style={styles.doctorName}>Dr. {prescription.doctor_name}</Text>
          <Text style={styles.qualification}>{prescription.doctor_qualification}</Text>
          <Text style={styles.regNo}>Reg. No: {prescription.doctor_registration_number}</Text>
        </View>

        <View style={styles.clinicSection}>
          {clinicDetails?.logo_url && (
            <Image 
              source={{ uri: clinicDetails.logo_url }} 
              style={styles.logo}
            />
          )}
          <Text style={styles.hospitalName}>{clinicDetails?.name}</Text>
          <Text style={styles.hospitalAddress}>
            {clinicDetails?.address}
          </Text>
          <Text style={styles.hospitalContact}>
            Ph: {clinicDetails?.phone_number}
            {clinicDetails?.timing && `, Timing: ${clinicDetails.timing}`}
          </Text>
          {clinicDetails?.closed_on && (
            <Text>Closed: {clinicDetails.closed_on}</Text>
          )}
        </View>
      </View>

      {/* Date */}
      <Text style={styles.date}>Date: {prescription.date}</Text>

      {/* Patient Details */}
      <View style={styles.patientSection}>
        <Text style={styles.patientHeader}>
          ID: {prescription.id} - {prescription.patient_type} ({prescription.patient_gender}) / {prescription.patient_age} Y    
          {prescription.patient_mobile && `Mob. No.: ${prescription.patient_mobile}`}
        </Text>
        <Text>Address: {prescription.patient_address}</Text>
        <Text>
          Weight (Kg): {prescription.patient_weight}, 
          Height (Cm): {prescription.patient_height} 
          {prescription.patient_bmi && `(B.M.I. = ${prescription.patient_bmi})`}, 
          BP: {prescription.patient_bp}
        </Text>
      </View>

      {/* Complaints and Findings Section */}
      <View style={styles.twoColumnSection}>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Chief Complaints</Text>
          <Text style={styles.contentText}>{prescription.chief_complaints}</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Clinical Findings</Text>
          <Text style={styles.contentText}>{prescription.clinical_findings}</Text>
        </View>
      </View>

      {/* Diagnosis */}
      <View style={styles.diagnosisSection}>
        <Text style={styles.sectionTitle}>Diagnosis:</Text>
        <Text style={styles.contentText}>{prescription.diagnosis}</Text>
      </View>

      {/* Medications */}
      <View style={styles.medicationSection}>
        <Text style={styles.sectionTitle}>R</Text>
        <View style={styles.medicationHeader}>
          <Text style={styles.columnHeader}>Medicine Name</Text>
          <Text style={styles.columnHeader}>Dosage</Text>
          <Text style={styles.columnHeader}>Duration</Text>
        </View>
        {prescription.items.map((item, index) => (
          <View key={index} style={styles.medicationRow}>
            <View style={styles.medicineNameColumn}>
              <Text style={styles.medicineName}>{index + 1}) {item.medicine}</Text>
              {item.generic_name && (
                <Text style={styles.genericName}>{item.generic_name}</Text>
              )}
            </View>
            <Text style={styles.dosageColumn}>{item.dosage}</Text>
            <Text style={styles.durationColumn}>
              {item.duration} {item.duration_unit}
              {'\n'}(Tot:{item.duration} {item.duration_unit})
            </Text>
          </View>
        ))}
      </View>

      {/* Advice */}
      <View style={styles.adviceSection}>
        <Text style={styles.sectionTitle}>Advice:</Text>
        <Text style={styles.contentText}>{prescription.advice}</Text>
      </View>

      {/* Follow Up */}
      <View style={styles.followUpSection}>
        <Text style={styles.followUpText}>
          Follow Up: {prescription.follow_up_date}
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
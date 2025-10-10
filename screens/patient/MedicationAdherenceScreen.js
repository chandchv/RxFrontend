import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';

const MedicationAdherenceScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [adherenceData, setAdherenceData] = useState({});
  const [medications, setMedications] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);

  useEffect(() => {
    fetchAdherenceData();
  }, []);

  const fetchAdherenceData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/patient/medication-adherence/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAdherenceData(data.adherence || {});
      setMedications(data.medications || []);
      setTodayLogs(data.today_logs || []);

    } catch (error) {
      console.error('Error fetching adherence data:', error);
      Alert.alert('Error', 'Failed to load medication adherence data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logMedication = async (medicationId, taken) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/patient/log-medication/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medication_id: medicationId,
          taken: taken,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchAdherenceData(); // Refresh data
        Alert.alert('Success', `Medication ${taken ? 'logged as taken' : 'marked as missed'}`);
      }
    } catch (error) {
      console.error('Error logging medication:', error);
      Alert.alert('Error', 'Failed to log medication. Please try again.');
    }
  };

  const getAdherenceColor = (percentage) => {
    if (percentage >= 90) return '#4CAF50';
    if (percentage >= 70) return '#FF9800';
    return '#F44336';
  };

  const renderAdherenceCard = (title, value, subtitle, icon, color) => (
    <View style={[styles.adherenceCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.cardHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderMedicationItem = (medication) => (
    <View key={medication.id} style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{medication.name}</Text>
          <Text style={styles.medicationDosage}>{medication.dosage}</Text>
          <Text style={styles.medicationSchedule}>{medication.schedule}</Text>
        </View>
        <View style={styles.medicationActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.takenButton]}
            onPress={() => logMedication(medication.id, true)}
          >
            <Icon name="check" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Taken</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.missedButton]}
            onPress={() => logMedication(medication.id, false)}
          >
            <Icon name="close" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Missed</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.medicationProgress}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${medication.adherence_percentage || 0}%`,
                backgroundColor: getAdherenceColor(medication.adherence_percentage || 0)
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {medication.adherence_percentage || 0}% adherence
        </Text>
      </View>
    </View>
  );

  const renderTodayLog = (log) => (
    <View key={log.id} style={styles.logItem}>
      <View style={styles.logHeader}>
        <Icon 
          name={log.taken ? "check-circle" : "cancel"} 
          size={20} 
          color={log.taken ? "#4CAF50" : "#F44336"} 
        />
        <Text style={styles.logMedication}>{log.medication_name}</Text>
        <Text style={styles.logTime}>{log.time}</Text>
      </View>
      <Text style={styles.logStatus}>
        {log.taken ? 'Taken' : 'Missed'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading medication adherence...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Adherence Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adherence Overview</Text>
        <View style={styles.adherenceGrid}>
          {renderAdherenceCard(
            'Overall Adherence',
            `${adherenceData.overall_percentage || 0}%`,
            'Last 30 days',
            'trending-up',
            getAdherenceColor(adherenceData.overall_percentage || 0)
          )}
          {renderAdherenceCard(
            'Medications Taken',
            `${adherenceData.taken_count || 0}`,
            'Today',
            'check-circle',
            '#4CAF50'
          )}
          {renderAdherenceCard(
            'Medications Missed',
            `${adherenceData.missed_count || 0}`,
            'Today',
            'cancel',
            '#F44336'
          )}
          {renderAdherenceCard(
            'Streak',
            `${adherenceData.current_streak || 0} days`,
            'Current streak',
            'local-fire-department',
            '#FF9800'
          )}
        </View>
      </View>

      {/* Today's Medications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Medications</Text>
        {medications.length > 0 ? (
          medications.map(renderMedicationItem)
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="medication" size={64} color="#ccc" />
            <Text style={styles.noDataText}>No medications scheduled for today</Text>
          </View>
        )}
      </View>

      {/* Today's Log */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Log</Text>
        {todayLogs.length > 0 ? (
          todayLogs.map(renderTodayLog)
        ) : (
          <Text style={styles.noDataText}>No medication logs for today</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="add" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Log Medication</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="history" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>View History</Text>
        </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 15,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  adherenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  adherenceCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  medicationCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  medicationSchedule: {
    fontSize: 14,
    color: '#2196F3',
  },
  medicationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  takenButton: {
    backgroundColor: '#4CAF50',
  },
  missedButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  medicationProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logMedication: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: '#666',
  },
  logStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
});

export default MedicationAdherenceScreen;

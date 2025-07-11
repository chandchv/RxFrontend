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
import { API_URL } from '../../config';

const TestResults = ({ navigation, route }) => {
  const { testId } = route.params;
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestResult();
  }, []);

  const fetchTestResult = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/users/api/test-results/${testId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch test results');
      }

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error('Error fetching test results:', error);
      Alert.alert('Error', 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const getResultStatus = (value, normalRange) => {
    if (!normalRange || !value) return 'normal';
    
    const numValue = parseFloat(value);
    const [min, max] = normalRange.split('-').map(v => parseFloat(v));
    
    if (numValue < min) return 'low';
    if (numValue > max) return 'high';
    return 'normal';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'high': return '#ef4444';
      case 'low': return '#f59e0b';
      case 'normal': return '#10b981';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading test results...</Text>
      </View>
    );
  }

  if (!testResult) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Test results not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Test Results</Text>
        <Text style={styles.subtitle}>
          {testResult.test_name}
        </Text>
        <Text style={styles.testDate}>
          {new Date(testResult.test_date).toLocaleDateString()}
        </Text>
      </View>

      {/* Patient Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>
            {testResult.patient?.first_name} {testResult.patient?.last_name}
          </Text>
          <Text style={styles.patientDetails}>
            Age: {testResult.patient?.age || 'N/A'} • {testResult.patient?.gender || 'N/A'}
          </Text>
          <Text style={styles.patientDetails}>
            Patient ID: {testResult.patient?.id}
          </Text>
        </View>
      </View>

      {/* Test Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Information</Text>
        <View style={styles.testInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Test Name:</Text>
            <Text style={styles.infoValue}>{testResult.test_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Test Date:</Text>
            <Text style={styles.infoValue}>
              {new Date(testResult.test_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lab:</Text>
            <Text style={styles.infoValue}>{testResult.lab_name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: testResult.status === 'completed' ? '#10b981' : '#f59e0b' }]}>
              <Text style={styles.statusText}>{testResult.status}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Test Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Results</Text>
        {testResult.results?.map((result, index) => {
          const status = getResultStatus(result.value, result.normal_range);
          return (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{result.parameter}</Text>
                <View style={[styles.resultStatus, { backgroundColor: getStatusColor(status) }]}>
                  <Text style={styles.resultStatusText}>{status.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.resultDetails}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Value:</Text>
                  <Text style={[styles.resultValue, { color: getStatusColor(status) }]}>
                    {result.value} {result.unit}
                  </Text>
                </View>
                
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Normal Range:</Text>
                  <Text style={styles.resultNormalRange}>
                    {result.normal_range} {result.unit}
                  </Text>
                </View>
              </View>
              
              {result.notes && (
                <Text style={styles.resultNotes}>
                  Notes: {result.notes}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Doctor's Comments */}
      {testResult.doctor_comments && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor's Comments</Text>
          <Text style={styles.commentsText}>{testResult.doctor_comments}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Pressable 
          style={styles.actionButton}
          onPress={() => Alert.alert('Feature Coming Soon', 'Print functionality will be available soon')}
        >
          <Text style={styles.actionButtonText}>Print Results</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => Alert.alert('Feature Coming Soon', 'Share functionality will be available soon')}
        >
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Share</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  testDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  patientInfo: {
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  testInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  resultStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultStatusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  resultDetails: {
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultNormalRange: {
    fontSize: 14,
    color: '#374151',
  },
  resultNotes: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  commentsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButtonText: {
    color: '#374151',
  },
});

export default TestResults; 
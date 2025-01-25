import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const ReportsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year

  useEffect(() => {
    fetchReports();
  }, [selectedPeriod]);

  const fetchReports = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/doctor/reports/?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (title, value, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Icon name={icon} size={24} color={color} />
      <View style={styles.statInfo}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'week' && styles.selectedPeriod]}
          onPress={() => setSelectedPeriod('week')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'week' && styles.selectedPeriodText]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'month' && styles.selectedPeriod]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'month' && styles.selectedPeriodText]}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'year' && styles.selectedPeriod]}
          onPress={() => setSelectedPeriod('year')}
        >
          <Text style={[styles.periodText, selectedPeriod === 'year' && styles.selectedPeriodText]}>
            Year
          </Text>
        </TouchableOpacity>
      </View>

      {reports && (
        <>
          <View style={styles.statsContainer}>
            {renderStatCard('Total Appointments', reports.total_appointments, 'event', '#4CAF50')}
            {renderStatCard('New Patients', reports.new_patients, 'person-add', '#2196F3')}
            {renderStatCard('Prescriptions', reports.total_prescriptions, 'description', '#9C27B0')}
            {renderStatCard('Revenue', `$${reports.revenue}`, 'attach-money', '#F57C00')}
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Appointments Trend</Text>
            <LineChart
              data={{
                labels: reports.appointment_trend.labels,
                datasets: [{
                  data: reports.appointment_trend.data
                }]
              }}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
                style: {
                  borderRadius: 16
                }
              }}
              style={styles.chart}
            />
          </View>

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Performance Summary</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Average Daily Appointments</Text>
              <Text style={styles.summaryValue}>{reports.avg_daily_appointments}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Completion Rate</Text>
              <Text style={styles.summaryValue}>{reports.completion_rate}%</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Patient Satisfaction</Text>
              <Text style={styles.summaryValue}>{reports.patient_satisfaction}%</Text>
            </View>
          </View>
        </>
      )}
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
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedPeriod: {
    backgroundColor: '#0066cc',
  },
  periodText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedPeriodText: {
    color: '#fff',
  },
  statsContainer: {
    padding: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  statInfo: {
    marginLeft: 16,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default ReportsScreen; 
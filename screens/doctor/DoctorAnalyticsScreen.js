import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const DoctorAnalyticsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, quarter, year
  const [selectedMetric, setSelectedMetric] = useState('appointments');

  const { width } = Dimensions.get('window');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/doctor/analytics/?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalytics(data.analytics || {});

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMetricCard = (title, value, icon, color, subtitle = '', trend = null) => (
    <View style={[styles.metricCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.metricHeader}>
        <Icon name={icon} size={24} color={color} />
        <View style={styles.metricInfo}>
          <Text style={styles.metricTitle}>{title}</Text>
          {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
        </View>
        {trend && (
          <View style={[styles.trendContainer, { backgroundColor: trend > 0 ? '#e8f5e9' : '#ffebee' }]}>
            <Icon 
              name={trend > 0 ? 'trending-up' : 'trending-down'} 
              size={16} 
              color={trend > 0 ? '#4CAF50' : '#F44336'} 
            />
            <Text style={[styles.trendText, { color: trend > 0 ? '#4CAF50' : '#F44336' }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );

  const renderChartCard = (title, data, type) => (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartContainer}>
        {/* Simple bar chart representation */}
        {data && data.length > 0 ? (
          <View style={styles.barChart}>
            {data.map((item, index) => (
              <View key={index} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: (item.value / Math.max(...data.map(d => d.value))) * 100,
                      backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>{item.label}</Text>
                <Text style={styles.barValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="bar-chart" size={48} color="#ccc" />
            <Text style={styles.noDataText}>No data available</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPeriodButton = (title, value) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        selectedPeriod === value && styles.activePeriodButton
      ]}
      onPress={() => setSelectedPeriod(value)}
    >
      <Text style={[
        styles.periodButtonText,
        selectedPeriod === value && styles.activePeriodButtonText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderMetricButton = (title, value, icon) => (
    <TouchableOpacity
      style={[
        styles.metricButton,
        selectedMetric === value && styles.activeMetricButton
      ]}
      onPress={() => setSelectedMetric(value)}
    >
      <Icon name={icon} size={20} color={selectedMetric === value ? '#0066cc' : '#666'} />
      <Text style={[
        styles.metricButtonText,
        selectedMetric === value && styles.activeMetricButtonText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0066cc', '#004499']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Practice Analytics</Text>
        <Text style={styles.headerSubtitle}>Insights and performance metrics</Text>
      </LinearGradient>

      {/* Period Selection */}
      <View style={styles.periodContainer}>
        <Text style={styles.periodTitle}>Time Period</Text>
        <View style={styles.periodButtons}>
          {renderPeriodButton('Week', 'week')}
          {renderPeriodButton('Month', 'month')}
          {renderPeriodButton('Quarter', 'quarter')}
          {renderPeriodButton('Year', 'year')}
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Appointments',
            analytics.total_appointments || 0,
            'event',
            '#4CAF50',
            selectedPeriod,
            analytics.appointments_trend
          )}
          {renderMetricCard(
            'Active Patients',
            analytics.active_patients || 0,
            'people',
            '#2196F3',
            'registered',
            analytics.patients_trend
          )}
          {renderMetricCard(
            'Prescriptions',
            analytics.total_prescriptions || 0,
            'description',
            '#9C27B0',
            'issued',
            analytics.prescriptions_trend
          )}
          {renderMetricCard(
            'Revenue',
            `$${analytics.revenue || 0}`,
            'attach-money',
            '#FF9800',
            'earned',
            analytics.revenue_trend
          )}
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Avg. Response Time',
            `${analytics.avg_response_time || 0}h`,
            'schedule',
            '#607D8B',
            'to patients'
          )}
          {renderMetricCard(
            'Patient Satisfaction',
            `${analytics.satisfaction_score || 0}%`,
            'star',
            '#FFC107',
            'rating'
          )}
          {renderMetricCard(
            'Appointment Completion',
            `${analytics.completion_rate || 0}%`,
            'check-circle',
            '#4CAF50',
            'rate'
          )}
          {renderMetricCard(
            'No-Show Rate',
            `${analytics.no_show_rate || 0}%`,
            'cancel',
            '#F44336',
            'missed'
          )}
        </View>
      </View>

      {/* Charts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Visualization</Text>
        
        {/* Metric Selection */}
        <View style={styles.metricSelection}>
          {renderMetricButton('Appointments', 'appointments', 'event')}
          {renderMetricButton('Patients', 'patients', 'people')}
          {renderMetricButton('Revenue', 'revenue', 'attach-money')}
          {renderMetricButton('Prescriptions', 'prescriptions', 'description')}
        </View>

        {/* Selected Chart */}
        {selectedMetric === 'appointments' && renderChartCard(
          'Appointments Over Time',
          analytics.appointments_chart,
          'line'
        )}
        
        {selectedMetric === 'patients' && renderChartCard(
          'Patient Demographics',
          analytics.patients_chart,
          'bar'
        )}
        
        {selectedMetric === 'revenue' && renderChartCard(
          'Revenue Trends',
          analytics.revenue_chart,
          'line'
        )}
        
        {selectedMetric === 'prescriptions' && renderChartCard(
          'Prescription Patterns',
          analytics.prescriptions_chart,
          'bar'
        )}
      </View>

      {/* Top Performers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performers</Text>
        
        {/* Most Active Patients */}
        <View style={styles.performerCard}>
          <Text style={styles.performerTitle}>Most Active Patients</Text>
          {analytics.top_patients && analytics.top_patients.length > 0 ? (
            analytics.top_patients.map((patient, index) => (
              <View key={index} style={styles.performerItem}>
                <Text style={styles.performerRank}>#{index + 1}</Text>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{patient.name}</Text>
                  <Text style={styles.performerValue}>{patient.visits} visits</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
        </View>

        {/* Most Prescribed Medications */}
        <View style={styles.performerCard}>
          <Text style={styles.performerTitle}>Most Prescribed Medications</Text>
          {analytics.top_medications && analytics.top_medications.length > 0 ? (
            analytics.top_medications.map((medication, index) => (
              <View key={index} style={styles.performerItem}>
                <Text style={styles.performerRank}>#{index + 1}</Text>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{medication.name}</Text>
                  <Text style={styles.performerValue}>{medication.count} prescriptions</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="download" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Export Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Share Insights</Text>
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
  header: {
    padding: 30,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  periodContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
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
  periodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  periodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#0066cc',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activePeriodButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
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
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricInfo: {
    flex: 1,
    marginLeft: 10,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricSelection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  metricButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  activeMetricButton: {
    backgroundColor: '#e3f2fd',
  },
  metricButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  activeMetricButtonText: {
    color: '#0066cc',
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  chartContainer: {
    height: 200,
    justifyContent: 'center',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  performerCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  performerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  performerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  performerRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
    width: 30,
  },
  performerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  performerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  performerValue: {
    fontSize: 12,
    color: '#666',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: '#0066cc',
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default DoctorAnalyticsScreen;

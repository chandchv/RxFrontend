import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import BranchSelector from '../components/BranchSelector';
import DateRangePicker from '../components/DateRangePicker';
import ReportExporter from '../components/ReportExporter';

const { width: screenWidth } = Dimensions.get('window');

const ConsolidatedReportingScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [accessibleClinics, setAccessibleClinics] = useState([]);
  const [selectedClinics, setSelectedClinics] = useState([]);
  const [reportType, setReportType] = useState('revenue');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  });
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExporter, setShowExporter] = useState(false);

  useEffect(() => {
    loadAccessibleClinics();
  }, []);

  const loadAccessibleClinics = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/reporting/clinics/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load accessible clinics');
      }

      const data = await response.json();
      setAccessibleClinics(data.data.clinics);
      
      // Auto-select all clinics initially
      setSelectedClinics(data.data.clinics.map(clinic => clinic.id));
    } catch (error) {
      console.error('Error loading clinics:', error);
      Alert.alert('Error', 'Failed to load accessible clinics');
    }
  };

  const generateReport = async () => {
    if (selectedClinics.length === 0) {
      Alert.alert('Error', 'Please select at least one branch');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = `${API_URL}/api/reporting/${reportType}/`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clinic_ids: selectedClinics,
          start_date: dateRange.startDate.toISOString().split('T')[0],
          end_date: dateRange.endDate.toISOString().split('T')[0],
          group_by_branch: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const data = await response.json();
      setReportData(data.data);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccessibleClinics();
    if (reportData) {
      await generateReport();
    }
    setRefreshing(false);
  };

  const renderReportTypeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Report Type</Text>
      <View style={styles.reportTypeButtons}>
        {[
          { key: 'revenue', label: 'Revenue', icon: 'attach-money' },
          { key: 'patient-analytics', label: 'Patients', icon: 'people' },
          { key: 'doctor-performance', label: 'Doctors', icon: 'local-hospital' }
        ].map(type => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.reportTypeButton,
              reportType === type.key && styles.activeReportType
            ]}
            onPress={() => setReportType(type.key)}
          >
            <Icon 
              name={type.icon} 
              size={20} 
              color={reportType === type.key ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.reportTypeText,
              reportType === type.key && styles.activeReportTypeText
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderControlButtons = () => (
    <View style={styles.controlsContainer}>
      <TouchableOpacity
        style={styles.controlButton}
        onPress={() => setShowBranchSelector(true)}
      >
        <Icon name="business" size={20} color="#0066cc" />
        <Text style={styles.controlButtonText}>
          Branches ({selectedClinics.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.controlButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Icon name="date-range" size={20} color="#0066cc" />
        <Text style={styles.controlButtonText}>Date Range</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, styles.generateButton]}
        onPress={generateReport}
        disabled={loading}
      >
        <Icon name="assessment" size={20} color="#fff" />
        <Text style={styles.generateButtonText}>Generate</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSummaryStats = () => {
    if (!reportData?.summary) return null;

    const stats = formatSummaryStats(reportData.summary);

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Summary Statistics</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              {stat.change && (
                <Text style={[
                  styles.statChange,
                  stat.change > 0 ? styles.positiveChange : styles.negativeChange
                ]}>
                  {stat.change > 0 ? '+' : ''}{stat.change}%
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const formatSummaryStats = (summary) => {
    if (reportType === 'revenue') {
      return [
        { label: 'Total Revenue', value: `$${formatNumber(summary.total_revenue)}` },
        { label: 'Total Paid', value: `$${formatNumber(summary.total_paid)}` },
        { label: 'Outstanding', value: `$${formatNumber(summary.outstanding_amount)}` },
        { label: 'Collection Rate', value: `${summary.collection_rate.toFixed(1)}%` }
      ];
    } else if (reportType === 'patient-analytics') {
      return [
        { label: 'Total Patients', value: formatNumber(summary.total_patients) },
        { label: 'Active Patients', value: formatNumber(summary.unique_patients_with_appointments) },
        { label: 'Engagement Rate', value: `${summary.patient_engagement_rate.toFixed(1)}%` },
        { label: 'Avg Visits', value: summary.avg_appointments_per_patient.toFixed(1) }
      ];
    } else if (reportType === 'doctor-performance') {
      return [
        { label: 'Consultations', value: formatNumber(summary.total_consultations) },
        { label: 'Total Earnings', value: `$${formatNumber(summary.total_earnings)}` },
        { label: 'Avg Fee', value: `$${formatNumber(summary.avg_consultation_fee)}` },
        { label: 'Completion Rate', value: `${summary.consultation_completion_rate.toFixed(1)}%` }
      ];
    }
    return [];
  };

  const renderCharts = () => {
    if (!reportData?.branch_breakdown) return null;

    const branchData = reportData.branch_breakdown;
    const labels = branchData.map(branch => branch.branch_code || branch.clinic_name.substring(0, 8));
    
    let chartData, chartConfig;

    if (reportType === 'revenue') {
      chartData = {
        labels,
        datasets: [{
          data: branchData.map(branch => parseFloat(branch.revenue || 0))
        }]
      };
    } else if (reportType === 'patient-analytics') {
      chartData = {
        labels,
        datasets: [{
          data: branchData.map(branch => parseInt(branch.patient_count || 0))
        }]
      };
    } else if (reportType === 'doctor-performance') {
      const performanceData = reportData.branch_performance || branchData;
      chartData = {
        labels: performanceData.map(branch => branch.branch_code || branch.clinic_name.substring(0, 8)),
        datasets: [{
          data: performanceData.map(branch => parseFloat(branch.total_earnings || 0))
        }]
      };
    }

    chartConfig = {
      backgroundColor: '#fff',
      backgroundGradientFrom: '#fff',
      backgroundGradientTo: '#fff',
      decimalPlaces: reportType === 'patient-analytics' ? 0 : 2,
      color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#0066cc'
      }
    };

    return (
      <View style={styles.chartsContainer}>
        <Text style={styles.sectionTitle}>Branch Performance</Text>
        
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {reportType === 'revenue' ? 'Revenue by Branch' : 
             reportType === 'patient-analytics' ? 'Patients by Branch' : 
             'Earnings by Branch'}
          </Text>
          <BarChart
            data={chartData}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>

        {branchData.length > 1 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Distribution</Text>
            <PieChart
              data={branchData.map((branch, index) => ({
                name: branch.branch_code || branch.clinic_name.substring(0, 8),
                population: reportType === 'revenue' ? parseFloat(branch.revenue || 0) :
                           reportType === 'patient-analytics' ? parseInt(branch.patient_count || 0) :
                           parseFloat(branch.total_earnings || 0),
                color: `hsl(${(index * 360) / branchData.length}, 70%, 50%)`,
                legendFontColor: '#333',
                legendFontSize: 12
              }))}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>
        )}
      </View>
    );
  };

  const renderBranchBreakdown = () => {
    if (!reportData?.branch_breakdown) return null;

    return (
      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.sectionTitle}>Branch Breakdown</Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => setShowExporter(true)}
          >
            <Icon name="file-download" size={20} color="#0066cc" />
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        {reportData.branch_breakdown.map((branch, index) => (
          <View key={index} style={styles.branchCard}>
            <View style={styles.branchHeader}>
              <Text style={styles.branchName}>{branch.clinic_name}</Text>
              <Text style={styles.branchCode}>{branch.branch_code || 'N/A'}</Text>
            </View>
            
            <View style={styles.branchMetrics}>
              {reportType === 'revenue' && (
                <>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Revenue</Text>
                    <Text style={styles.metricValue}>${formatNumber(branch.revenue)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Bills</Text>
                    <Text style={styles.metricValue}>{formatNumber(branch.bills_count)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Collection Rate</Text>
                    <Text style={styles.metricValue}>{branch.collection_rate.toFixed(1)}%</Text>
                  </View>
                </>
              )}
              
              {reportType === 'patient-analytics' && (
                <>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Patients</Text>
                    <Text style={styles.metricValue}>{formatNumber(branch.patient_count)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Appointments</Text>
                    <Text style={styles.metricValue}>{formatNumber(branch.appointments_count)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Avg Visits</Text>
                    <Text style={styles.metricValue}>{branch.avg_appointments_per_patient.toFixed(1)}</Text>
                  </View>
                </>
              )}
              
              {reportType === 'doctor-performance' && reportData.branch_performance && (
                <>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Earnings</Text>
                    <Text style={styles.metricValue}>${formatNumber(branch.total_earnings)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Doctors</Text>
                    <Text style={styles.metricValue}>{formatNumber(branch.unique_doctors)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Consultations</Text>
                    <Text style={styles.metricValue}>{formatNumber(branch.consultations)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const formatNumber = (num) => {
    return parseFloat(num || 0).toLocaleString();
  };

  if (accessibleClinics.length === 0 && !loading) {
    return (
      <View style={styles.noAccessContainer}>
        <Icon name="lock" size={64} color="#ccc" />
        <Text style={styles.noAccessTitle}>No Access</Text>
        <Text style={styles.noAccessText}>
          You don't have access to any clinics for reporting.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Consolidated Reports</Text>
        <Text style={styles.subtitle}>
          Multi-branch analytics across {accessibleClinics.length} clinics
        </Text>
      </View>

      {renderReportTypeSelector()}
      {renderControlButtons()}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Generating report...</Text>
        </View>
      )}

      {reportData && !loading && (
        <>
          {renderSummaryStats()}
          {renderCharts()}
          {renderBranchBreakdown()}
        </>
      )}

      {!reportData && !loading && (
        <View style={styles.emptyState}>
          <Icon name="assessment" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No Report Generated</Text>
          <Text style={styles.emptyStateText}>
            Select your preferences and generate a report to view analytics.
          </Text>
        </View>
      )}

      {/* Modals */}
      <BranchSelector
        visible={showBranchSelector}
        clinics={accessibleClinics}
        selectedClinics={selectedClinics}
        onSelectionChange={setSelectedClinics}
        onClose={() => setShowBranchSelector(false)}
      />

      <DateRangePicker
        visible={showDatePicker}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClose={() => setShowDatePicker(false)}
      />

      <ReportExporter
        visible={showExporter}
        reportData={reportData}
        reportType={reportType}
        onClose={() => setShowExporter(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0066cc',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  selectorContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reportTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeReportType: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  reportTypeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeReportTypeText: {
    color: '#fff',
  },
  controlsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  generateButton: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  controlButtonText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#0066cc',
  },
  generateButtonText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    margin: '1%',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statChange: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  positiveChange: {
    color: '#28a745',
  },
  negativeChange: {
    color: '#dc3545',
  },
  chartsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  chartCard: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
  },
  breakdownContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  exportButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#0066cc',
  },
  branchCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  branchCode: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  branchMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noAccessText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ConsolidatedReportingScreen;
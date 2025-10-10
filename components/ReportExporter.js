import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system';

const ReportExporter = ({ 
  visible, 
  reportData, 
  reportType, 
  onClose 
}) => {
  const [exporting, setExporting] = useState(false);

  const exportFormats = [
    {
      key: 'json',
      label: 'JSON Format',
      description: 'Machine-readable format for data processing',
      icon: 'code',
      color: '#17a2b8'
    },
    {
      key: 'csv',
      label: 'CSV Format',
      description: 'Spreadsheet format for Excel and other tools',
      icon: 'table-chart',
      color: '#28a745'
    }
  ];

  const exportReport = async (format) => {
    if (!reportData) {
      Alert.alert('Error', 'No report data available to export');
      return;
    }

    setExporting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const filename = `${reportType}_${new Date().toISOString().split('T')[0]}`;
      
      const response = await fetch(`${API_URL}/api/reporting/export/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          report_type: reportType,
          report_data: reportData,
          format: format,
          filename: filename
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get the response as text/blob
      const responseText = await response.text();
      
      // Create a temporary file using Expo FileSystem
      const filePath = `${FileSystem.documentDirectory}${filename}.${format}`;
      await FileSystem.writeAsStringAsync(filePath, responseText, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // Share the file using React Native's Share API
      try {
        await Share.share({
          title: `Export ${reportType} Report`,
          message: `Consolidated ${reportType} report exported as ${format.toUpperCase()}`,
          url: `file://${filePath}`,
        });
      } catch (shareError) {
        console.log('Share failed, showing file info instead:', shareError);
        Alert.alert(
          'Export Complete', 
          `Report saved to: ${filePath}\n\nYou can access this file in your device's documents folder.`
        );
      }
      
      // Clean up the temporary file after sharing
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(filePath);
        } catch (error) {
          console.log('Error cleaning up temp file:', error);
        }
      }, 5000);

      Alert.alert('Success', 'Report exported successfully');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error.message);
    } finally {
      setExporting(false);
    }
  };

  const getReportSummary = () => {
    if (!reportData) return null;

    const summary = reportData.summary || {};
    const branchCount = reportData.branch_breakdown?.length || 0;
    const dateRange = reportData.report_info?.date_range;

    return {
      branchCount,
      dateRange: dateRange ? `${dateRange.start_date} to ${dateRange.end_date}` : 'N/A',
      totalRecords: getTotalRecords(),
      reportSize: getEstimatedSize()
    };
  };

  const getTotalRecords = () => {
    if (!reportData) return 0;
    
    let total = 0;
    if (reportData.branch_breakdown) total += reportData.branch_breakdown.length;
    if (reportData.doctor_performance) total += reportData.doctor_performance.length;
    if (reportData.branch_performance) total += reportData.branch_performance.length;
    
    return total;
  };

  const getEstimatedSize = () => {
    if (!reportData) return '0 KB';
    
    const jsonString = JSON.stringify(reportData);
    const sizeInBytes = new Blob([jsonString]).size;
    
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const reportSummary = getReportSummary();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Export Report</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {reportSummary && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Report Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Report Type</Text>
                  <Text style={styles.summaryValue}>
                    {reportType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Branches</Text>
                  <Text style={styles.summaryValue}>{reportSummary.branchCount}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Date Range</Text>
                  <Text style={styles.summaryValue}>{reportSummary.dateRange}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Records</Text>
                  <Text style={styles.summaryValue}>{reportSummary.totalRecords}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.formatsContainer}>
            <Text style={styles.formatsTitle}>Choose Export Format</Text>
            {exportFormats.map(format => (
              <TouchableOpacity
                key={format.key}
                style={styles.formatOption}
                onPress={() => exportReport(format.key)}
                disabled={exporting}
              >
                <View style={[styles.formatIcon, { backgroundColor: format.color }]}>
                  <Icon name={format.icon} size={24} color="#fff" />
                </View>
                <View style={styles.formatInfo}>
                  <Text style={styles.formatLabel}>{format.label}</Text>
                  <Text style={styles.formatDescription}>{format.description}</Text>
                </View>
                <View style={styles.formatAction}>
                  {exporting ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <Icon name="file-download" size={20} color="#666" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoHeader}>
              <Icon name="info" size={20} color="#0066cc" />
              <Text style={styles.infoTitle}>Export Information</Text>
            </View>
            <Text style={styles.infoText}>
              • Exported files will include all selected branch data
            </Text>
            <Text style={styles.infoText}>
              • Branch identification is preserved in all exports
            </Text>
            <Text style={styles.infoText}>
              • Files can be shared via email, cloud storage, or other apps
            </Text>
            <Text style={styles.infoText}>
              • Estimated file size: {reportSummary?.reportSize || 'N/A'}
            </Text>
          </View>
        </View>

        {exporting && (
          <View style={styles.exportingOverlay}>
            <View style={styles.exportingContainer}>
              <ActivityIndicator size="large" color="#0066cc" />
              <Text style={styles.exportingText}>Preparing export...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  summaryItem: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  formatsContainer: {
    marginBottom: 24,
  },
  formatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  formatIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  formatInfo: {
    flex: 1,
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  formatDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  formatAction: {
    marginLeft: 12,
  },
  infoContainer: {
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#0066cc',
    lineHeight: 18,
    marginBottom: 4,
  },
  exportingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportingContainer: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  exportingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default ReportExporter;
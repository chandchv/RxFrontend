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

const LabResultsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [labResults, setLabResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchLabResults();
  }, []);

  const fetchLabResults = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/patient/lab-results/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLabResults(data.results || []);
      setFilteredResults(data.results || []);

    } catch (error) {
      console.error('Error fetching lab results:', error);
      Alert.alert('Error', 'Failed to load lab results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterResults = (filter) => {
    setSelectedFilter(filter);
    if (filter === 'all') {
      setFilteredResults(labResults);
    } else if (filter === 'abnormal') {
      setFilteredResults(labResults.filter(result => result.status === 'abnormal'));
    } else if (filter === 'recent') {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);
      setFilteredResults(labResults.filter(result => new Date(result.date) >= recentDate));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return '#4CAF50';
      case 'abnormal': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#666';
    }
  };

  const renderFilterButton = (title, filter) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.activeFilterButton
      ]}
      onPress={() => filterResults(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.activeFilterButtonText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderLabResultItem = (result) => (
    <TouchableOpacity
      key={result.id}
      style={styles.resultCard}
      onPress={() => navigation.navigate('LabResultDetail', { resultId: result.id })}
    >
      <View style={styles.resultHeader}>
        <View style={styles.resultInfo}>
          <Text style={styles.resultName}>{result.test_name}</Text>
          <Text style={styles.resultDate}>{result.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) }]}>
          <Text style={styles.statusText}>{result.status}</Text>
        </View>
      </View>
      
      <View style={styles.resultDetails}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Value:</Text>
          <Text style={styles.resultValue}>{result.value}</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Reference Range:</Text>
          <Text style={styles.resultReference}>{result.reference_range}</Text>
        </View>
        {result.doctor_name && (
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Ordered by:</Text>
            <Text style={styles.resultDoctor}>Dr. {result.doctor_name}</Text>
          </View>
        )}
      </View>

      {result.notes && (
        <View style={styles.resultNotes}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{result.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading lab results...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lab Results</Text>
        <TouchableOpacity style={styles.downloadButton}>
          <Icon name="download" size={20} color="#2196F3" />
          <Text style={styles.downloadText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('All', 'all')}
        {renderFilterButton('Abnormal', 'abnormal')}
        {renderFilterButton('Recent', 'recent')}
      </View>

      {/* Results List */}
      <ScrollView style={styles.resultsList}>
        {filteredResults.length > 0 ? (
          filteredResults.map(renderLabResultItem)
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="science" size={64} color="#ccc" />
            <Text style={styles.noDataText}>No lab results found</Text>
            <Text style={styles.noDataSubtext}>
              {selectedFilter === 'abnormal' 
                ? 'No abnormal results' 
                : selectedFilter === 'recent'
                ? 'No recent results'
                : 'No lab results available'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="schedule" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Schedule Test</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="share" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Share Results</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
  },
  downloadText: {
    marginLeft: 4,
    color: '#2196F3',
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultsList: {
    flex: 1,
    padding: 15,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
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
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resultDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  resultDetails: {
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  resultReference: {
    fontSize: 14,
    color: '#666',
  },
  resultDoctor: {
    fontSize: 14,
    color: '#2196F3',
  },
  resultNotes: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default LabResultsScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const LabSelectionModal = ({ visible, onClose, onLabSelect }) => {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchLabs();
    }
  }, [visible]);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/labs/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch labs');
      
      const data = await response.json();
      setLabs(data);
    } catch (error) {
      console.error('Error fetching labs:', error);
      setError('Failed to load labs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLabSelect = (lab) => {
    setSelectedLab(lab);
  };

  const handleConfirm = () => {
    if (!selectedLab) {
      Alert.alert('Error', 'Please select a lab first');
      return;
    }
    onLabSelect(selectedLab);
    onClose();
  };

  const renderLabItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.labItem,
        selectedLab?.id === item.id && styles.selectedLabItem
      ]}
      onPress={() => handleLabSelect(item)}
    >
      <View style={styles.labInfo}>
        <Text style={styles.labName}>{item.name}</Text>
        <Text style={styles.labType}>
          {item.type === 'internal' ? 'Internal Lab' : 'External Lab'}
        </Text>
        {item.address && (
          <Text style={styles.labAddress}>{item.address}</Text>
        )}
      </View>
      <View style={styles.labStatus}>
        <Icon
          name={item.type === 'internal' ? 'business' : 'local-hospital'}
          size={24}
          color={selectedLab?.id === item.id ? '#3f51b5' : '#666'}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Lab</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3f51b5" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={48} color="#f44336" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchLabs}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={labs}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderLabItem}
                contentContainerStyle={styles.labList}
                showsVerticalScrollIndicator={false}
              />
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.modalButtonText}>Select Lab</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  labList: {
    paddingVertical: 8,
  },
  labItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedLabItem: {
    backgroundColor: '#e3f2fd',
  },
  labInfo: {
    flex: 1,
  },
  labName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  labType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  labAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  labStatus: {
    marginLeft: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  confirmButton: {
    backgroundColor: '#4caf50',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    color: '#f44336',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#3f51b5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default LabSelectionModal; 
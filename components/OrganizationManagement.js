import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const OrganizationManagement = ({ visible, onClose }) => {
  const { makeAuthenticatedRequest } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [newOrganization, setNewOrganization] = useState({
    name: '',
    description: '',
    registration_number: '',
    headquarters_address: '',
    contact_email: '',
    contact_phone: ''
  });

  useEffect(() => {
    if (visible) {
      loadOrganizations();
    }
  }, [visible]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('/users/api/organizations/');
      const data = await response.json();
      setOrganizations(data.results || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async () => {
    if (!newOrganization.name.trim()) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    if (!newOrganization.registration_number.trim()) {
      Alert.alert('Error', 'Registration number is required');
      return;
    }

    setCreating(true);
    try {
      const response = await makeAuthenticatedRequest('/users/api/organizations/', {
        method: 'POST',
        body: JSON.stringify(newOrganization)
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations([...organizations, data]);
        setNewOrganization({
          name: '',
          description: '',
          registration_number: '',
          headquarters_address: '',
          contact_email: '',
          contact_phone: ''
        });
        setShowCreateForm(false);
        Alert.alert('Success', 'Organization created successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      Alert.alert('Error', error.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const viewOrganizationDetails = (org) => {
    setSelectedOrg(org);
  };

  const renderOrganizationItem = (org) => (
    <TouchableOpacity
      key={org.id}
      style={styles.orgItem}
      onPress={() => viewOrganizationDetails(org)}
    >
      <View style={styles.orgHeader}>
        <View style={styles.orgIcon}>
          {org.logo ? (
            <Image source={{ uri: org.logo }} style={styles.orgLogo} />
          ) : (
            <Icon name="business" size={24} color="#007AFF" />
          )}
        </View>
        <View style={styles.orgInfo}>
          <Text style={styles.orgName}>{org.name}</Text>
          <Text style={styles.orgRegNumber}>Reg: {org.registration_number}</Text>
          {org.description && (
            <Text style={styles.orgDescription} numberOfLines={2}>
              {org.description}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={20} color="#666" />
      </View>
      
      <View style={styles.orgStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{org.clinics_count || 0}</Text>
          <Text style={styles.statLabel}>Clinics</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{org.administrators_count || 0}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[
            styles.statusBadge,
            org.is_active ? styles.activeBadge : styles.inactiveBadge
          ]}>
            {org.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCreateForm = () => (
    <ScrollView style={styles.createForm}>
      <Text style={styles.formTitle}>Create New Organization</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Organization Name *</Text>
        <TextInput
          style={styles.input}
          value={newOrganization.name}
          onChangeText={(text) => setNewOrganization({...newOrganization, name: text})}
          placeholder="Enter organization name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Registration Number *</Text>
        <TextInput
          style={styles.input}
          value={newOrganization.registration_number}
          onChangeText={(text) => setNewOrganization({...newOrganization, registration_number: text})}
          placeholder="Enter registration number"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={newOrganization.description}
          onChangeText={(text) => setNewOrganization({...newOrganization, description: text})}
          placeholder="Enter organization description"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Headquarters Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={newOrganization.headquarters_address}
          onChangeText={(text) => setNewOrganization({...newOrganization, headquarters_address: text})}
          placeholder="Enter headquarters address"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Contact Email</Text>
        <TextInput
          style={styles.input}
          value={newOrganization.contact_email}
          onChangeText={(text) => setNewOrganization({...newOrganization, contact_email: text})}
          placeholder="Enter contact email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Contact Phone</Text>
        <TextInput
          style={styles.input}
          value={newOrganization.contact_phone}
          onChangeText={(text) => setNewOrganization({...newOrganization, contact_phone: text})}
          placeholder="Enter contact phone"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => setShowCreateForm(false)}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={createOrganization}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderOrganizationDetails = () => (
    <ScrollView style={styles.detailsContainer}>
      <View style={styles.detailsHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedOrg(null)}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.detailsTitle}>{selectedOrg.name}</Text>
      </View>

      <View style={styles.detailsContent}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Registration Number</Text>
          <Text style={styles.detailValue}>{selectedOrg.registration_number}</Text>
        </View>

        {selectedOrg.description && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>{selectedOrg.description}</Text>
          </View>
        )}

        {selectedOrg.headquarters_address && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Headquarters</Text>
            <Text style={styles.detailValue}>{selectedOrg.headquarters_address}</Text>
          </View>
        )}

        {selectedOrg.contact_email && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contact Email</Text>
            <Text style={styles.detailValue}>{selectedOrg.contact_email}</Text>
          </View>
        )}

        {selectedOrg.contact_phone && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contact Phone</Text>
            <Text style={styles.detailValue}>{selectedOrg.contact_phone}</Text>
          </View>
        )}

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={[
            styles.statusBadge,
            selectedOrg.is_active ? styles.activeBadge : styles.inactiveBadge
          ]}>
            {selectedOrg.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Organization Management</Text>
          {!showCreateForm && !selectedOrg && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCreateForm(true)}
            >
              <Icon name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading organizations...</Text>
          </View>
        ) : showCreateForm ? (
          renderCreateForm()
        ) : selectedOrg ? (
          renderOrganizationDetails()
        ) : (
          <ScrollView style={styles.content}>
            {organizations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="business" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No organizations found</Text>
                <Text style={styles.emptySubtext}>
                  Create your first organization to get started
                </Text>
              </View>
            ) : (
              organizations.map(renderOrganizationItem)
            )}
          </ScrollView>
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
    borderBottomColor: '#eee',
    paddingTop: 50,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  orgItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orgIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orgLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orgRegNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  orgDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  orgStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  activeBadge: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  inactiveBadge: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  createForm: {
    flex: 1,
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  detailsContent: {
    flex: 1,
  },
  detailItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
});

export default OrganizationManagement;
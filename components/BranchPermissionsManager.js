import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const BranchPermissionsManager = ({ 
  visible, 
  onClose, 
  userId, 
  userName 
}) => {
  const { makeAuthenticatedRequest } = useAuth();
  const [userBranchAccess, setUserBranchAccess] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      loadUserBranchAccess();
      loadAvailableBranches();
    }
  }, [visible, userId]);

  const loadUserBranchAccess = async () => {
    try {
      const response = await makeAuthenticatedRequest(`/users/api/branch-access/?user=${userId}`);
      const data = await response.json();
      setUserBranchAccess(data.results || []);
    } catch (error) {
      console.error('Error loading user branch access:', error);
      Alert.alert('Error', 'Failed to load user branch access');
    }
  };

  const loadAvailableBranches = async () => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/accessible-clinics/');
      const data = await response.json();
      setAvailableBranches(data.clinics || []);
    } catch (error) {
      console.error('Error loading available branches:', error);
      Alert.alert('Error', 'Failed to load available branches');
    } finally {
      setLoading(false);
    }
  };

  const updateBranchAccess = async (clinicId, accessType, isActive) => {
    setUpdating(true);
    try {
      const existingAccess = userBranchAccess.find(access => access.clinic.id === clinicId);
      
      if (existingAccess) {
        // Update existing access
        const response = await makeAuthenticatedRequest(`/users/api/branch-access/${existingAccess.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            access_type: accessType,
            is_active: isActive
          })
        });

        if (response.ok) {
          const updatedAccess = await response.json();
          setUserBranchAccess(prev => 
            prev.map(access => 
              access.id === existingAccess.id ? updatedAccess : access
            )
          );
        }
      } else if (isActive) {
        // Create new access
        const response = await makeAuthenticatedRequest('/users/api/branch-access/', {
          method: 'POST',
          body: JSON.stringify({
            user: userId,
            clinic: clinicId,
            access_type: accessType,
            is_active: true
          })
        });

        if (response.ok) {
          const newAccess = await response.json();
          setUserBranchAccess(prev => [...prev, newAccess]);
        }
      }
    } catch (error) {
      console.error('Error updating branch access:', error);
      Alert.alert('Error', 'Failed to update branch access');
    } finally {
      setUpdating(false);
    }
  };

  const removeBranchAccess = async (accessId) => {
    Alert.alert(
      'Remove Access',
      'Are you sure you want to remove this branch access?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const response = await makeAuthenticatedRequest(`/users/api/branch-access/${accessId}/`, {
                method: 'DELETE'
              });

              if (response.ok) {
                setUserBranchAccess(prev => prev.filter(access => access.id !== accessId));
                Alert.alert('Success', 'Branch access removed successfully');
              }
            } catch (error) {
              console.error('Error removing branch access:', error);
              Alert.alert('Error', 'Failed to remove branch access');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const getAccessTypeColor = (accessType) => {
    switch (accessType) {
      case 'full':
        return '#4CAF50';
      case 'read_only':
        return '#FF9800';
      case 'emergency':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getAccessTypeLabel = (accessType) => {
    switch (accessType) {
      case 'full':
        return 'Full Access';
      case 'read_only':
        return 'Read Only';
      case 'emergency':
        return 'Emergency Only';
      default:
        return 'Unknown';
    }
  };

  const renderBranchAccessItem = (branch) => {
    const existingAccess = userBranchAccess.find(access => access.clinic.id === branch.id);
    const hasAccess = existingAccess && existingAccess.is_active;

    return (
      <View key={branch.id} style={styles.branchItem}>
        <View style={styles.branchHeader}>
          <View style={styles.branchInfo}>
            <Text style={styles.branchName}>{branch.name}</Text>
            <Text style={styles.branchType}>
              {branch.clinic_type === 'parent' ? 'Main Branch' : 
               branch.clinic_type === 'branch' ? 'Branch' : 'Independent'}
            </Text>
            {branch.branch_code && (
              <Text style={styles.branchCode}>Code: {branch.branch_code}</Text>
            )}
          </View>
          
          <Switch
            value={hasAccess}
            onValueChange={(value) => {
              if (value) {
                updateBranchAccess(branch.id, 'read_only', true);
              } else if (existingAccess) {
                updateBranchAccess(branch.id, existingAccess.access_type, false);
              }
            }}
            disabled={updating}
          />
        </View>

        {hasAccess && (
          <View style={styles.accessControls}>
            <Text style={styles.accessLabel}>Access Level:</Text>
            <View style={styles.accessTypes}>
              {['read_only', 'full', 'emergency'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.accessTypeButton,
                    existingAccess?.access_type === type && styles.selectedAccessType,
                    { borderColor: getAccessTypeColor(type) }
                  ]}
                  onPress={() => updateBranchAccess(branch.id, type, true)}
                  disabled={updating}
                >
                  <Text style={[
                    styles.accessTypeText,
                    existingAccess?.access_type === type && { color: getAccessTypeColor(type) }
                  ]}>
                    {getAccessTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {existingAccess && (
              <View style={styles.accessDetails}>
                <Text style={styles.accessDetailText}>
                  Granted: {new Date(existingAccess.created_at).toLocaleDateString()}
                </Text>
                {existingAccess.granted_by && (
                  <Text style={styles.accessDetailText}>
                    By: {existingAccess.granted_by.first_name} {existingAccess.granted_by.last_name}
                  </Text>
                )}
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeBranchAccess(existingAccess.id)}
                  disabled={updating}
                >
                  <Icon name="delete" size={16} color="#f44336" />
                  <Text style={styles.removeButtonText}>Remove Access</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

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
          <Text style={styles.title}>Branch Permissions</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.userInfo}>
          <Icon name="person" size={24} color="#007AFF" />
          <Text style={styles.userName}>{userName}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading branch permissions...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {availableBranches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="business" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No branches available</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Available Branches</Text>
                {availableBranches.map(renderBranchAccessItem)}
              </>
            )}
          </ScrollView>
        )}

        {updating && (
          <View style={styles.updatingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.updatingText}>Updating permissions...</Text>
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
  placeholder: {
    width: 40,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  branchItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  branchType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  branchCode: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  accessControls: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  accessLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  accessTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accessTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  selectedAccessType: {
    backgroundColor: '#f0f8ff',
  },
  accessTypeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  accessDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  accessDetailText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeButtonText: {
    fontSize: 12,
    color: '#f44336',
    marginLeft: 4,
    fontWeight: '500',
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updatingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default BranchPermissionsManager;
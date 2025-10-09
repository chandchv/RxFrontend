import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import BranchSelector from '../components/BranchSelector';
import BranchContextIndicator from '../components/BranchContextIndicator';
import BranchHierarchyVisualization from '../components/BranchHierarchyVisualization';
import OrganizationManagement from '../components/OrganizationManagement';
import BranchPermissionsManager from '../components/BranchPermissionsManager';

const BranchManagementScreen = ({ navigation }) => {
  const { user, makeAuthenticatedRequest } = useAuth();
  const [branchStats, setBranchStats] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOrgManagement, setShowOrgManagement] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadBranchData();
  }, []);

  const loadBranchData = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('/users/api/branch/dashboard-data/');
      const data = await response.json();
      
      setBranchStats(data.branch_stats || []);
      setCurrentBranch(data.current_clinic);
    } catch (error) {
      console.error('Error loading branch data:', error);
      Alert.alert('Error', 'Failed to load branch data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBranchData();
    setRefreshing(false);
  };

  const handleBranchChange = (newBranch) => {
    setCurrentBranch(newBranch);
    loadBranchData(); // Reload data for new branch context
  };

  const handleCreateBranch = () => {
    navigation.navigate('CreateBranchScreen');
  };

  const handleManagePermissions = (userId, userName) => {
    setSelectedUser({ id: userId, name: userName });
    setShowPermissionsModal(true);
  };

  const getBranchTypeColor = (clinicType) => {
    switch (clinicType) {
      case 'parent':
        return '#4CAF50';
      case 'branch':
        return '#2196F3';
      case 'independent':
        return '#FF9800';
      default:
        return '#666';
    }
  };

  const getBranchTypeLabel = (clinicType) => {
    switch (clinicType) {
      case 'parent':
        return 'Main Branch';
      case 'branch':
        return 'Branch';
      case 'independent':
        return 'Independent';
      default:
        return 'Clinic';
    }
  };

  const renderBranchCard = (stat) => (
    <View key={stat.clinic.id} style={styles.branchCard}>
      <View style={styles.branchHeader}>
        <View style={styles.branchInfo}>
          <Text style={styles.branchName}>{stat.clinic.name}</Text>
          <View style={styles.branchDetails}>
            <View style={[
              styles.branchTypeBadge,
              { backgroundColor: getBranchTypeColor(stat.clinic.clinic_type) }
            ]}>
              <Text style={styles.branchTypeText}>
                {getBranchTypeLabel(stat.clinic.clinic_type)}
              </Text>
            </View>
            {stat.clinic.branch_code && (
              <Text style={styles.branchCode}>• {stat.clinic.branch_code}</Text>
            )}
          </View>
          {stat.clinic.address && (
            <Text style={styles.branchAddress} numberOfLines={2}>
              {stat.clinic.address}
            </Text>
          )}
        </View>
        
        {currentBranch?.id === stat.clinic.id && (
          <View style={styles.currentBadge}>
            <Icon name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.currentText}>Current</Text>
          </View>
        )}
      </View>

      <View style={styles.branchStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stat.total_users}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stat.active_users}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stat.total_patients}</Text>
          <Text style={styles.statLabel}>Patients</Text>
        </View>
      </View>

      <View style={styles.branchActions}>
        {currentBranch?.id !== stat.clinic.id && (
          <TouchableOpacity
            style={[styles.actionButton, styles.switchButton]}
            onPress={() => handleBranchChange(stat.clinic)}
          >
            <Icon name="swap-horiz" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Switch</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.manageButton]}
          onPress={() => handleManagePermissions(stat.clinic.id, stat.clinic.name)}
        >
          <Icon name="settings" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading branch data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Branch Management</Text>
          <TouchableOpacity
            style={styles.orgButton}
            onPress={() => setShowOrgManagement(true)}
          >
            <Icon name="business" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Current Branch Context */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Branch</Text>
          <BranchContextIndicator
            onBranchPress={() => {
              // Could open branch selector or navigate to branch details
            }}
            showSwitchButton={false}
          />
        </View>

        {/* Branch Selector */}
        {branchStats.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Switch Branch</Text>
            <BranchSelector
              onBranchChange={handleBranchChange}
              showCreateButton={true}
            />
          </View>
        )}

        {/* Branch Statistics Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Branch Overview</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateBranch}
            >
              <Icon name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
          
          {branchStats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="business" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No branches available</Text>
              <Text style={styles.emptySubtext}>
                Contact your administrator to get access to branches
              </Text>
            </View>
          ) : (
            branchStats.map(renderBranchCard)
          )}
        </View>

        {/* Branch Hierarchy */}
        {branchStats.length > 1 && currentBranch && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Branch Hierarchy</Text>
            <BranchHierarchyVisualization
              clinicId={currentBranch.id}
              onBranchSelect={(branch) => {
                navigation.navigate('BranchDetails', { branchId: branch.id });
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Organization Management Modal */}
      <OrganizationManagement
        visible={showOrgManagement}
        onClose={() => setShowOrgManagement(false)}
      />

      {/* Branch Permissions Modal */}
      {selectedUser && (
        <BranchPermissionsManager
          visible={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.id}
          userName={selectedUser.name}
        />
      )}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  orgButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  branchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  branchDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  branchTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  branchTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  branchCode: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  branchAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  currentBadge: {
    alignItems: 'center',
  },
  currentText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  branchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  branchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  switchButton: {
    backgroundColor: '#007AFF',
  },
  manageButton: {
    backgroundColor: '#6c757d',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
});

export default BranchManagementScreen;
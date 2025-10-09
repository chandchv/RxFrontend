import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import BranchSelector from '../../components/BranchSelector';
import BranchContextIndicator from '../../components/BranchContextIndicator';
import OrganizationManagement from '../../components/OrganizationManagement';
import BranchPermissionsManager from '../../components/BranchPermissionsManager';
import BranchHierarchyVisualization from '../../components/BranchHierarchyVisualization';

const BranchManagementScreen = ({ navigation }) => {
  const { user, makeAuthenticatedRequest } = useAuth();
  const [currentBranch, setCurrentBranch] = useState(null);
  const [branchStats, setBranchStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showOrgManagement, setShowOrgManagement] = useState(false);
  const [showPermissionsManager, setShowPermissionsManager] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCurrentBranchContext(),
        loadBranchStatistics()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentBranchContext = async () => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/current-context/');
      const data = await response.json();
      setCurrentBranch(data.current_clinic);
    } catch (error) {
      console.error('Error loading current branch context:', error);
    }
  };

  const loadBranchStatistics = async () => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/statistics/');
      const data = await response.json();
      setBranchStats(data);
    } catch (error) {
      console.error('Error loading branch statistics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleBranchChange = (branch) => {
    setCurrentBranch(branch);
    loadBranchStatistics();
  };

  const handleBranchSelect = (branch) => {
    Alert.alert(
      'Branch Selected',
      `Selected: ${branch.name}`,
      [
        { text: 'OK' }
      ]
    );
  };

  const openUserPermissions = (userId, userName) => {
    setSelectedUser({ id: userId, name: userName });
    setShowPermissionsManager(true);
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setShowOrgManagement(true)}
        >
          <Icon name="business" size={32} color="#007AFF" />
          <Text style={styles.actionTitle}>Organizations</Text>
          <Text style={styles.actionSubtitle}>Manage organizations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('CreateBranch')}
        >
          <Icon name="add-business" size={32} color="#4CAF50" />
          <Text style={styles.actionTitle}>Create Branch</Text>
          <Text style={styles.actionSubtitle}>Add new branch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('UserManagement')}
        >
          <Icon name="people" size={32} color="#FF9800" />
          <Text style={styles.actionTitle}>User Access</Text>
          <Text style={styles.actionSubtitle}>Manage permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('BranchReports')}
        >
          <Icon name="analytics" size={32} color="#9C27B0" />
          <Text style={styles.actionTitle}>Reports</Text>
          <Text style={styles.actionSubtitle}>Branch analytics</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBranchStats = () => {
    if (!branchStats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Branch Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="business" size={24} color="#007AFF" />
            <Text style={styles.statNumber}>{branchStats.total_branches || 0}</Text>
            <Text style={styles.statLabel}>Total Branches</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="people" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{branchStats.total_users || 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="event" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{branchStats.total_appointments || 0}</Text>
            <Text style={styles.statLabel}>Appointments</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="trending-up" size={24} color="#9C27B0" />
            <Text style={styles.statNumber}>{branchStats.active_branches || 0}</Text>
            <Text style={styles.statLabel}>Active Branches</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCurrentBranchInfo = () => (
    <View style={styles.currentBranchContainer}>
      <Text style={styles.sectionTitle}>Current Branch Context</Text>
      
      <BranchContextIndicator
        onBranchPress={() => {
          // Could open branch selector or branch details
        }}
        style={styles.branchIndicator}
      />

      {currentBranch && (
        <View style={styles.branchDetails}>
          <View style={styles.detailRow}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.detailText}>
              {currentBranch.address || 'No address provided'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="phone" size={16} color="#666" />
            <Text style={styles.detailText}>
              {currentBranch.phone_number || 'No phone provided'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="email" size={16} color="#666" />
            <Text style={styles.detailText}>
              {currentBranch.email || 'No email provided'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading branch management...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Branch Management</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Icon name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Branch Selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.sectionTitle}>Switch Branch</Text>
          <BranchSelector
            onBranchChange={handleBranchChange}
            showCreateButton={true}
          />
        </View>

        {/* Current Branch Info */}
        {renderCurrentBranchInfo()}

        {/* Branch Statistics */}
        {renderBranchStats()}

        {/* Branch Hierarchy */}
        {currentBranch && (
          <View style={styles.hierarchyContainer}>
            <Text style={styles.sectionTitle}>Branch Hierarchy</Text>
            <BranchHierarchyVisualization
              clinicId={currentBranch.id}
              onBranchSelect={handleBranchSelect}
            />
          </View>
        )}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityPlaceholder}>
            <Icon name="history" size={48} color="#ccc" />
            <Text style={styles.placeholderText}>
              Recent branch activities will appear here
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <OrganizationManagement
        visible={showOrgManagement}
        onClose={() => setShowOrgManagement(false)}
      />

      <BranchPermissionsManager
        visible={showPermissionsManager}
        onClose={() => setShowPermissionsManager(false)}
        userId={selectedUser?.id}
        userName={selectedUser?.name}
      />
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  selectorContainer: {
    marginBottom: 24,
  },
  currentBranchContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  branchIndicator: {
    marginBottom: 16,
  },
  branchDetails: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  hierarchyContainer: {
    marginBottom: 24,
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activityPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default BranchManagementScreen;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const BranchHierarchyVisualization = ({ 
  clinicId, 
  onBranchSelect,
  style = {}
}) => {
  const { makeAuthenticatedRequest } = useAuth();
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  useEffect(() => {
    if (clinicId) {
      loadBranchHierarchy();
    }
  }, [clinicId]);

  const loadBranchHierarchy = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(`/users/api/branch/hierarchy/${clinicId}/`);
      const data = await response.json();
      setHierarchy(data);
      
      // Auto-expand the root node
      if (data.clinic) {
        setExpandedNodes(new Set([data.clinic.id]));
      }
    } catch (error) {
      console.error('Error loading branch hierarchy:', error);
      Alert.alert('Error', 'Failed to load branch hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const toggleNodeExpansion = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getClinicTypeIcon = (clinicType) => {
    switch (clinicType) {
      case 'parent':
        return 'business';
      case 'branch':
        return 'location-on';
      case 'independent':
        return 'store';
      default:
        return 'business';
    }
  };

  const getClinicTypeColor = (clinicType) => {
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

  const renderClinicNode = (clinic, level = 0, isLast = true, parentLines = []) => {
    const hasChildren = clinic.branches && clinic.branches.length > 0;
    const isExpanded = expandedNodes.has(clinic.id);
    const indentWidth = level * 24;

    return (
      <View key={clinic.id} style={styles.nodeContainer}>
        {/* Connection lines */}
        <View style={[styles.connectionContainer, { width: indentWidth }]}>
          {parentLines.map((hasLine, index) => (
            <View
              key={index}
              style={[
                styles.verticalLine,
                { left: index * 24 + 12 },
                !hasLine && styles.hiddenLine
              ]}
            />
          ))}
          {level > 0 && (
            <>
              <View
                style={[
                  styles.horizontalLine,
                  { left: (level - 1) * 24 + 12, width: 12 }
                ]}
              />
              {!isLast && (
                <View
                  style={[
                    styles.verticalLine,
                    { left: (level - 1) * 24 + 12 }
                  ]}
                />
              )}
            </>
          )}
        </View>

        {/* Clinic node */}
        <TouchableOpacity
          style={[
            styles.clinicNode,
            { marginLeft: indentWidth }
          ]}
          onPress={() => {
            if (hasChildren) {
              toggleNodeExpansion(clinic.id);
            }
            if (onBranchSelect) {
              onBranchSelect(clinic);
            }
          }}
        >
          <View style={styles.nodeContent}>
            <View style={styles.nodeHeader}>
              <View style={[
                styles.nodeIcon,
                { backgroundColor: getClinicTypeColor(clinic.clinic_type) }
              ]}>
                <Icon 
                  name={getClinicTypeIcon(clinic.clinic_type)} 
                  size={16} 
                  color="#fff" 
                />
              </View>
              
              <View style={styles.nodeInfo}>
                <Text style={styles.clinicName}>{clinic.name}</Text>
                <View style={styles.nodeDetails}>
                  <Text style={styles.clinicType}>
                    {clinic.clinic_type === 'parent' ? 'Main Branch' : 
                     clinic.clinic_type === 'branch' ? 'Branch' : 'Independent'}
                  </Text>
                  {clinic.branch_code && (
                    <Text style={styles.branchCode}>• {clinic.branch_code}</Text>
                  )}
                </View>
              </View>

              {hasChildren && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => toggleNodeExpansion(clinic.id)}
                >
                  <Icon 
                    name={isExpanded ? 'expand-less' : 'expand-more'} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Clinic stats */}
            <View style={styles.nodeStats}>
              <View style={styles.statItem}>
                <Icon name="people" size={12} color="#666" />
                <Text style={styles.statText}>
                  {clinic.stats?.total_users || 0} users
                </Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="event" size={12} color="#666" />
                <Text style={styles.statText}>
                  {clinic.stats?.total_appointments || 0} appointments
                </Text>
              </View>
              {hasChildren && (
                <View style={styles.statItem}>
                  <Icon name="account-tree" size={12} color="#666" />
                  <Text style={styles.statText}>
                    {clinic.branches.length} branches
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {clinic.branches.map((branch, index) => {
              const isLastChild = index === clinic.branches.length - 1;
              const newParentLines = [...parentLines];
              if (level > 0) {
                newParentLines[level - 1] = !isLast;
              }
              newParentLines[level] = !isLastChild;

              return renderClinicNode(
                branch, 
                level + 1, 
                isLastChild, 
                newParentLines
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading hierarchy...</Text>
      </View>
    );
  }

  if (!hierarchy || !hierarchy.clinic) {
    return (
      <View style={[styles.container, styles.emptyContainer, style]}>
        <Icon name="account-tree" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No hierarchy data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Icon name="account-tree" size={20} color="#007AFF" />
        <Text style={styles.headerTitle}>Branch Hierarchy</Text>
      </View>
      
      <ScrollView 
        style={styles.hierarchyContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderClinicNode(hierarchy.clinic)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  hierarchyContainer: {
    maxHeight: 400,
    padding: 16,
  },
  nodeContainer: {
    position: 'relative',
  },
  connectionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  verticalLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#ddd',
    top: 0,
    bottom: 0,
  },
  horizontalLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#ddd',
    top: 24,
  },
  hiddenLine: {
    backgroundColor: 'transparent',
  },
  clinicNode: {
    marginBottom: 8,
  },
  nodeContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  nodeInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  nodeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  clinicType: {
    fontSize: 11,
    color: '#666',
  },
  branchCode: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
  },
  expandButton: {
    padding: 4,
  },
  nodeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  childrenContainer: {
    marginLeft: 0,
  },
});

export default BranchHierarchyVisualization;
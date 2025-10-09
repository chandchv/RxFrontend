import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { 
  BranchStyles, 
  Colors, 
  getBranchTypeColor, 
  getBranchTypeIcon, 
  getBranchTypeLabel 
} from '../styles/BranchDesignSystem';

const BranchContextIndicator = ({ 
  onBranchPress,
  showSwitchButton = true,
  style = {}
}) => {
  const { makeAuthenticatedRequest } = useAuth();
  const [currentBranch, setCurrentBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentBranchContext();
  }, []);

  const loadCurrentBranchContext = async () => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/current-context/');
      const data = await response.json();
      setCurrentBranch(data.current_clinic);
    } catch (error) {
      console.error('Error loading current branch context:', error);
    } finally {
      setLoading(false);
    }
  };

  // Using design system functions instead of local ones

  if (loading || !currentBranch) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <Icon name="business" size={16} color="#666" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onBranchPress}
      disabled={!showSwitchButton}
      activeOpacity={showSwitchButton ? 0.7 : 1}
    >
      <View style={styles.branchInfo}>
        <View style={styles.branchHeader}>
          <Icon 
            name={getBranchTypeIcon(currentBranch.clinic_type)} 
            size={16} 
            color={getBranchTypeColor(currentBranch.clinic_type)} 
          />
          <Text style={styles.branchName} numberOfLines={1}>
            {currentBranch.name}
          </Text>
        </View>
        
        <View style={styles.branchDetails}>
          <Text style={[
            styles.branchType,
            { color: getBranchTypeColor(currentBranch.clinic_type) }
          ]}>
            {getBranchTypeLabel(currentBranch.clinic_type)}
          </Text>
          
          {currentBranch.branch_code && (
            <Text style={styles.branchCode}>
              • {currentBranch.branch_code}
            </Text>
          )}
        </View>
      </View>

      {showSwitchButton && (
        <Icon name="swap-horiz" size={18} color="#666" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    ...BranchStyles.branchContext,
  },
  loadingContainer: {
    justifyContent: 'center',
  },
  branchInfo: {
    ...BranchStyles.branchContextInfo,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  branchName: {
    ...BranchStyles.branchContextName,
    marginLeft: 6,
    flex: 1,
  },
  branchDetails: {
    ...BranchStyles.branchContextDetails,
  },
  branchType: {
    ...BranchStyles.branchContextType,
  },
  branchCode: {
    ...BranchStyles.branchContextCode,
  },
  loadingText: {
    ...BranchStyles.loadingText,
    fontSize: 12,
    marginLeft: 6,
  },
});

export default BranchContextIndicator;
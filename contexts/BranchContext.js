import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const BranchContext = createContext({});

export const BranchProvider = ({ children }) => {
  const { makeAuthenticatedRequest, user } = useAuth();
  const [currentBranch, setCurrentBranch] = useState(null);
  const [accessibleBranches, setAccessibleBranches] = useState([]);
  const [branchHierarchy, setBranchHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switchingBranch, setSwitchingBranch] = useState(false);

  useEffect(() => {
    if (user) {
      initializeBranchContext();
    }
  }, [user]);

  const initializeBranchContext = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCurrentBranchContext(),
        loadAccessibleBranches()
      ]);
    } catch (error) {
      console.error('Error initializing branch context:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentBranchContext = async () => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/current-context/');
      const data = await response.json();
      
      if (data.current_clinic) {
        setCurrentBranch(data.current_clinic);
        await AsyncStorage.setItem('currentBranchId', data.current_clinic.id.toString());
      }
    } catch (error) {
      console.error('Error loading current branch context:', error);
      // Try to load from storage as fallback
      const storedBranchId = await AsyncStorage.getItem('currentBranchId');
      if (storedBranchId) {
        // Could fetch branch details by ID here
      }
    }
  };

  const loadAccessibleBranches = async () => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/accessible-clinics/');
      const data = await response.json();
      setAccessibleBranches(data.clinics || []);
    } catch (error) {
      console.error('Error loading accessible branches:', error);
      setAccessibleBranches([]);
    }
  };

  const loadBranchHierarchy = async (clinicId) => {
    try {
      const response = await makeAuthenticatedRequest(`/users/api/branch/hierarchy/${clinicId}/`);
      const data = await response.json();
      setBranchHierarchy(data);
      return data;
    } catch (error) {
      console.error('Error loading branch hierarchy:', error);
      return null;
    }
  };

  const switchBranch = async (branchId) => {
    if (!branchId || branchId === currentBranch?.id) {
      return { success: false, error: 'Invalid branch or already selected' };
    }

    setSwitchingBranch(true);
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/switch/', {
        method: 'POST',
        body: JSON.stringify({ clinic_id: branchId })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentBranch(data.clinic);
        
        // Update stored branch context
        await AsyncStorage.setItem('currentBranchId', branchId.toString());
        await AsyncStorage.setItem('currentClinicId', branchId.toString());
        
        return { 
          success: true, 
          clinic: data.clinic,
          message: `Switched to ${data.clinic.name}`
        };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error || 'Failed to switch branch' 
        };
      }
    } catch (error) {
      console.error('Error switching branch:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to switch branch' 
      };
    } finally {
      setSwitchingBranch(false);
    }
  };

  const validateBranchAccess = async (branchId, permission = 'read') => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/validate-access/', {
        method: 'POST',
        body: JSON.stringify({ 
          clinic_id: branchId,
          permission: permission
        })
      });

      const data = await response.json();
      return data.has_access || false;
    } catch (error) {
      console.error('Error validating branch access:', error);
      return false;
    }
  };

  const getBranchStatistics = async () => {
    try {
      const response = await makeAuthenticatedRequest('/users/api/branch/statistics/');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting branch statistics:', error);
      return null;
    }
  };

  const refreshBranchData = async () => {
    await Promise.all([
      loadCurrentBranchContext(),
      loadAccessibleBranches()
    ]);
  };

  const canAccessMultipleBranches = () => {
    return accessibleBranches.length > 1;
  };

  const canManageBranches = () => {
    return user?.role === 'ADMIN' || 
           user?.role === 'SUPERUSER' || 
           user?.role === 'CLINIC_ADMIN';
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

  const findBranchById = (branchId) => {
    return accessibleBranches.find(branch => branch.id === branchId);
  };

  const isCurrentBranch = (branchId) => {
    return currentBranch?.id === branchId;
  };

  const contextValue = {
    // State
    currentBranch,
    accessibleBranches,
    branchHierarchy,
    loading,
    switchingBranch,

    // Actions
    switchBranch,
    loadBranchHierarchy,
    validateBranchAccess,
    getBranchStatistics,
    refreshBranchData,

    // Utilities
    canAccessMultipleBranches,
    canManageBranches,
    getBranchTypeLabel,
    getBranchTypeColor,
    findBranchById,
    isCurrentBranch,

    // Computed values
    hasBranchAccess: accessibleBranches.length > 0,
    isMultiBranch: accessibleBranches.length > 1,
    currentBranchType: currentBranch?.clinic_type,
    currentBranchName: currentBranch?.name,
  };

  return (
    <BranchContext.Provider value={contextValue}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};

export default BranchContext;
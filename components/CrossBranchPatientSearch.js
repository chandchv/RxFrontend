import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import BranchSelector from './BranchSelector';

const CrossBranchPatientSearch = ({ 
  onPatientSelect, 
  navigation,
  showBranchFilter = true,
  maxResults = 20 
}) => {
  const { makeAuthenticatedRequest } = useAuth();
  const { accessibleBranches, currentBranch, canAccessMultipleBranches } = useBranch();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchFilterVisible, setBranchFilterVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    // Initialize with current branch if available
    if (currentBranch && !selectedBranches.length) {
      setSelectedBranches([currentBranch.id]);
    }
  }, [currentBranch]);

  const searchPatients = useCallback(async (term, page = 1, branchIds = selectedBranches) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        search_term: term.trim(),
        page: page.toString(),
        page_size: maxResults.toString()
      });

      if (branchIds.length > 0) {
        params.append('clinic_ids', branchIds.join(','));
      }

      const response = await makeAuthenticatedRequest(
        `/users/api/cross-branch/patients/search/?${params.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (page === 1) {
          setSearchResults(data.results || []);
        } else {
          setSearchResults(prev => [...prev, ...(data.results || [])]);
        }
        
        setHasNextPage(!!data.next);
        setTotalResults(data.count || 0);
        setCurrentPage(page);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      Alert.alert('Search Error', error.message || 'Failed to search patients');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest, selectedBranches, maxResults]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.trim().length >= 2) {
      searchPatients(term, 1);
    } else {
      setSearchResults([]);
      setTotalResults(0);
    }
  };

  const loadMoreResults = () => {
    if (hasNextPage && !loading) {
      searchPatients(searchTerm, currentPage + 1);
    }
  };

  const toggleBranchSelection = (branchId) => {
    setSelectedBranches(prev => {
      const newSelection = prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId];
      
      // Re-search with new branch selection
      if (searchTerm.trim()) {
        searchPatients(searchTerm, 1, newSelection);
      }
      
      return newSelection;
    });
  };

  const getBranchName = (branchId) => {
    const branch = accessibleBranches.find(b => b.id === branchId);
    return branch ? branch.name : `Branch ${branchId}`;
  };

  const getBranchIndicator = (patient) => {
    const branch = accessibleBranches.find(b => b.id === patient.clinic_id);
    if (!branch) return null;

    return (
      <View style={[
        styles.branchIndicator,
        { backgroundColor: getBranchColor(branch.clinic_type) }
      ]}>
        <Text style={styles.branchIndicatorText}>
          {branch.branch_code || branch.name.substring(0, 2).toUpperCase()}
        </Text>
      </View>
    );
  };

  const getBranchColor = (clinicType) => {
    switch (clinicType) {
      case 'parent': return '#4CAF50';
      case 'branch': return '#2196F3';
      case 'independent': return '#FF9800';
      default: return '#666';
    }
  };

  const renderPatientItem = ({ item }) => (
    <TouchableOpacity
      style={styles.patientItem}
      onPress={() => onPatientSelect ? onPatientSelect(item) : 
        navigation?.navigate('CrossBranchPatientDetails', { patientId: item.id })}
    >
      <View style={styles.patientHeader}>
        <View style={styles.patientAvatar}>
          <Text style={styles.avatarText}>
            {item.first_name?.charAt(0)}{item.last_name?.charAt(0)}
          </Text>
        </View>
        
        <View style={styles.patientInfo}>
          <View style={styles.patientNameRow}>
            <Text style={styles.patientName}>
              {item.first_name} {item.last_name}
            </Text>
            {getBranchIndicator(item)}
          </View>
          
          <Text style={styles.patientDetails}>
            ID: {item.patient_id} • {item.gender}, {item.age} years
          </Text>
          
          <Text style={styles.patientContact}>
            {item.phone_number} • {item.email}
          </Text>
          
          <Text style={styles.branchInfo}>
            Branch: {getBranchName(item.clinic_id)}
          </Text>
          
          {item.last_visit_date && (
            <Text style={styles.lastVisit}>
              Last visit: {new Date(item.last_visit_date).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        <Icon name="chevron-right" size={24} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderBranchFilter = () => (
    <Modal
      visible={branchFilterVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setBranchFilterVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Branches</Text>
            <TouchableOpacity
              onPress={() => setBranchFilterVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.branchList}>
            <TouchableOpacity
              style={styles.branchFilterItem}
              onPress={() => {
                setSelectedBranches(accessibleBranches.map(b => b.id));
                if (searchTerm.trim()) {
                  searchPatients(searchTerm, 1, accessibleBranches.map(b => b.id));
                }
              }}
            >
              <Text style={styles.branchFilterText}>Select All Branches</Text>
              <Icon 
                name={selectedBranches.length === accessibleBranches.length ? "check-box" : "check-box-outline-blank"} 
                size={24} 
                color="#007AFF" 
              />
            </TouchableOpacity>
            
            {accessibleBranches.map(branch => (
              <TouchableOpacity
                key={branch.id}
                style={styles.branchFilterItem}
                onPress={() => toggleBranchSelection(branch.id)}
              >
                <View style={styles.branchFilterInfo}>
                  <Text style={styles.branchFilterName}>{branch.name}</Text>
                  <Text style={styles.branchFilterType}>
                    {branch.clinic_type === 'parent' ? 'Main Branch' : 
                     branch.clinic_type === 'branch' ? 'Branch' : 'Independent'}
                  </Text>
                </View>
                <Icon 
                  name={selectedBranches.includes(branch.id) ? "check-box" : "check-box-outline-blank"} 
                  size={24} 
                  color="#007AFF" 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Text style={styles.selectedCount}>
              {selectedBranches.length} of {accessibleBranches.length} branches selected
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSearchHeader = () => (
    <View style={styles.searchHeader}>
      <View style={styles.searchInputContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients by name, ID, phone, or email..."
          value={searchTerm}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchTerm('');
              setSearchResults([]);
              setTotalResults(0);
            }}
            style={styles.clearButton}
          >
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      {showBranchFilter && canAccessMultipleBranches() && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setBranchFilterVisible(true)}
        >
          <Icon name="filter-list" size={20} color="#007AFF" />
          <Text style={styles.filterButtonText}>
            {selectedBranches.length === accessibleBranches.length ? 'All' : selectedBranches.length}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchResults = () => {
    if (loading && searchResults.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching across branches...</Text>
        </View>
      );
    }

    if (searchTerm.trim().length < 2) {
      return (
        <View style={styles.emptyState}>
          <Icon name="search" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>
            Enter at least 2 characters to search patients
          </Text>
        </View>
      );
    }

    if (searchResults.length === 0 && !loading) {
      return (
        <View style={styles.emptyState}>
          <Icon name="person-search" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>
            No patients found matching "{searchTerm}"
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Try adjusting your search terms or branch filters
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {totalResults} patient{totalResults !== 1 ? 's' : ''} found
          </Text>
          {selectedBranches.length < accessibleBranches.length && (
            <Text style={styles.branchFilterInfo}>
              Searching in {selectedBranches.length} branch{selectedBranches.length !== 1 ? 'es' : ''}
            </Text>
          )}
        </View>
        
        <FlatList
          data={searchResults}
          renderItem={renderPatientItem}
          keyExtractor={(item) => `${item.id}-${item.clinic_id}`}
          onEndReached={loadMoreResults}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            loading && searchResults.length > 0 ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadMoreText}>Loading more results...</Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderSearchHeader()}
      {renderSearchResults()}
      {renderBranchFilter()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  filterButtonText: {
    marginLeft: 4,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  branchFilterInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  patientItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientInfo: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  branchIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  branchIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  patientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  patientContact: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  branchInfo: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  lastVisit: {
    fontSize: 12,
    color: '#999',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadMoreText: {
    marginLeft: 8,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  branchList: {
    maxHeight: 400,
  },
  branchFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  branchFilterInfo: {
    flex: 1,
  },
  branchFilterName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  branchFilterText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  branchFilterType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  selectedCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default CrossBranchPatientSearch;
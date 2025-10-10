import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../../styles/theme';
import { formatDate, formatFileSize } from '../../utils/formatUtils';
import mobileApiService from '../../services/mobileApiService';

// Custom debounce implementation
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const { width } = Dimensions.get('window');

const SEARCH_HISTORY_KEY = '@clinical_records_search_history';
const SAVED_SEARCHES_KEY = '@clinical_records_saved_searches';
const MAX_HISTORY_ITEMS = 10;
const MAX_SAVED_SEARCHES = 5;

const RecordSearchScreen = ({ navigation, route }) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    record_type: '',
    priority: '',
    date_from: '',
    date_to: '',
    include_documents: false,
  });
  
  // UI state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  // Load search history and saved searches on mount
  useEffect(() => {
    loadSearchHistory();
    loadSavedSearches();
    
    // Handle navigation params (e.g., pre-filled search)
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
      performSearch(route.params.searchQuery);
    }
  }, []);

  // Debounced search suggestions
  const debouncedGetSuggestions = useCallback(
    debounce(async (query) => {
      if (query.length >= 2) {
        try {
          const response = await mobileApiService.getSearchSuggestions(query);
          if (response.suggestions) {
            setSuggestions(response.suggestions);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Failed to get search suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    []
  );

  // Handle search query changes
  const handleSearchQueryChange = (text) => {
    setSearchQuery(text);
    
    if (text.trim()) {
      debouncedGetSuggestions(text);
      setShowHistory(false);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setShowHistory(true);
    }
  };

  // Load search history from storage
  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  // Save search to history
  const saveToHistory = async (query) => {
    try {
      const newHistory = [query, ...searchHistory.filter(item => item !== query)]
        .slice(0, MAX_HISTORY_ITEMS);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  // Clear search history
  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  // Load saved searches from storage
  const loadSavedSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_SEARCHES_KEY);
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  // Save current search
  const saveCurrentSearch = async () => {
    if (!searchQuery.trim() || !saveSearchName.trim()) {
      Alert.alert('Error', 'Please enter a search name');
      return;
    }

    try {
      const newSavedSearch = {
        id: Date.now().toString(),
        name: saveSearchName,
        query: searchQuery,
        filters: { ...filters },
        createdAt: new Date().toISOString(),
      };

      const newSavedSearches = [newSavedSearch, ...savedSearches]
        .slice(0, MAX_SAVED_SEARCHES);
      
      setSavedSearches(newSavedSearches);
      await AsyncStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(newSavedSearches));
      
      setShowSaveSearchModal(false);
      setSaveSearchName('');
      Alert.alert('Success', 'Search saved successfully');
    } catch (error) {
      console.error('Failed to save search:', error);
      Alert.alert('Error', 'Failed to save search');
    }
  };

  // Load saved search
  const loadSavedSearch = (savedSearch) => {
    setSearchQuery(savedSearch.query);
    setFilters(savedSearch.filters);
    setShowHistory(false);
    performSearch(savedSearch.query, savedSearch.filters);
  };

  // Delete saved search
  const deleteSavedSearch = async (searchId) => {
    try {
      const newSavedSearches = savedSearches.filter(search => search.id !== searchId);
      setSavedSearches(newSavedSearches);
      await AsyncStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(newSavedSearches));
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  // Perform search
  const performSearch = async (query = searchQuery, searchFilters = filters, page = 1) => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    try {
      if (page === 1) {
        setIsLoading(true);
        setError(null);
        setSearchResults([]);
      } else {
        setIsLoadingMore(true);
      }

      const searchParams = {
        q: query.trim(),
        page,
        page_size: 20,
        ...searchFilters,
      };

      const response = await mobileApiService.searchClinicalRecords(searchParams);

      if (response.results) {
        if (page === 1) {
          setSearchResults(response.results);
          setCurrentPage(1);
          // Save to history
          await saveToHistory(query.trim());
        } else {
          setSearchResults(prev => [...prev, ...response.results]);
          setCurrentPage(page);
        }

        setTotalResults(response.search_metadata?.total_results || response.results.length);
        setHasNextPage(response.next !== null);
        
        // Hide suggestions and history
        setShowSuggestions(false);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError(error.message || 'Search failed');
      Alert.alert('Search Error', error.message || 'Failed to search clinical records');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load more results
  const loadMoreResults = () => {
    if (hasNextPage && !isLoadingMore) {
      performSearch(searchQuery, filters, currentPage + 1);
    }
  };

  // Refresh search results
  const onRefresh = useCallback(() => {
    if (searchQuery.trim()) {
      setRefreshing(true);
      performSearch(searchQuery, filters, 1).finally(() => {
        setRefreshing(false);
      });
    }
  }, [searchQuery, filters]);

  // Apply filters
  const applyFilters = () => {
    setShowFilters(false);
    if (searchQuery.trim()) {
      performSearch(searchQuery, filters, 1);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      record_type: '',
      priority: '',
      date_from: '',
      date_to: '',
      include_documents: false,
    });
  };

  // Navigate to record detail
  const navigateToRecord = (record) => {
    navigation.navigate('ClinicalRecordDetail', { recordId: record.id });
  };

  // Memoized filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(value => 
      value !== '' && value !== false
    ).length;
  }, [filters]);

  // Render search result item
  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigateToRecord(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultType}>{item.record_type}</Text>
          {item.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.resultDetails}>
        <Text style={styles.resultDate}>
          {formatDate(item.record_date || item.created_at)}
        </Text>
        {item.document_count > 0 && (
          <View style={styles.documentCount}>
            <Icon name="attach-file" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.documentCountText}>{item.document_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render suggestion item
  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => {
        setSearchQuery(item);
        setShowSuggestions(false);
        performSearch(item);
      }}
    >
      <Icon name="search" size={20} color={theme.colors.textSecondary} />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  // Render history item
  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => {
        setSearchQuery(item);
        setShowHistory(false);
        performSearch(item);
      }}
    >
      <Icon name="history" size={20} color={theme.colors.textSecondary} />
      <Text style={styles.historyText}>{item}</Text>
    </TouchableOpacity>
  );

  // Render saved search item
  const renderSavedSearch = ({ item }) => (
    <View style={styles.savedSearchItem}>
      <TouchableOpacity
        style={styles.savedSearchContent}
        onPress={() => loadSavedSearch(item)}
      >
        <Icon name="bookmark" size={20} color={theme.colors.primary} />
        <View style={styles.savedSearchInfo}>
          <Text style={styles.savedSearchName}>{item.name}</Text>
          <Text style={styles.savedSearchQuery}>{item.query}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteSavedSearch}
        onPress={() => deleteSavedSearch(item.id)}
      >
        <Icon name="delete" size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Records</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => setShowSaveSearchModal(true)}
          disabled={!searchQuery.trim()}
        >
          <Icon 
            name="bookmark-border" 
            size={24} 
            color={searchQuery.trim() ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinical records..."
            value={searchQuery}
            onChangeText={handleSearchQueryChange}
            onSubmitEditing={() => performSearch()}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSuggestions(false);
                setShowHistory(true);
              }}
            >
              <Icon name="clear" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Icon name="filter-list" size={20} color={
            activeFilterCount > 0 ? theme.colors.white : theme.colors.textSecondary
          } />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Icon name="error" size={48} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => performSearch()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item, index) => `suggestion-${index}`}
            style={styles.suggestionsList}
          />
        )}

        {/* Search History and Saved Searches */}
        {showHistory && !isLoading && searchResults.length === 0 && (
          <View style={styles.historyContainer}>
            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Saved Searches</Text>
                <FlatList
                  data={savedSearches}
                  renderItem={renderSavedSearch}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Recent Searches */}
            {searchHistory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Searches</Text>
                  <TouchableOpacity onPress={clearSearchHistory}>
                    <Text style={styles.clearButton}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={searchHistory}
                  renderItem={renderHistoryItem}
                  keyExtractor={(item, index) => `history-${index}`}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {totalResults} result{totalResults !== 1 ? 's' : ''} found
              </Text>
            </View>
            
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              onEndReached={loadMoreResults}
              onEndReachedThreshold={0.1}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                />
              }
              ListFooterComponent={() => (
                isLoadingMore ? (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.loadMoreText}>Loading more...</Text>
                  </View>
                ) : null
              )}
            />
          </View>
        )}

        {/* No Results */}
        {!isLoading && searchQuery.trim() && searchResults.length === 0 && !error && (
          <View style={styles.noResultsContainer}>
            <Icon name="search-off" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.noResultsText}>No records found</Text>
            <Text style={styles.noResultsSubtext}>
              Try adjusting your search terms or filters
            </Text>
          </View>
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Search Filters</Text>
            <TouchableOpacity onPress={applyFilters}>
              <Text style={styles.modalApply}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Record Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Record Type</Text>
              <View style={styles.filterOptions}>
                {['', 'consultation', 'lab_result', 'imaging', 'prescription', 'referral'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      filters.record_type === type && styles.filterOptionActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, record_type: type }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.record_type === type && styles.filterOptionTextActive
                    ]}>
                      {type || 'All Types'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Priority</Text>
              <View style={styles.filterOptions}>
                {['', 'high', 'medium', 'low'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.filterOption,
                      filters.priority === priority && styles.filterOptionActive
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, priority }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.priority === priority && styles.filterOptionTextActive
                    ]}>
                      {priority || 'All Priorities'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Include Documents Toggle */}
            <View style={styles.filterSection}>
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => setFilters(prev => ({ 
                  ...prev, 
                  include_documents: !prev.include_documents 
                }))}
              >
                <Text style={styles.filterLabel}>Search in document content</Text>
                <View style={[
                  styles.toggle,
                  filters.include_documents && styles.toggleActive
                ]}>
                  {filters.include_documents && (
                    <View style={styles.toggleIndicator} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Clear Filters */}
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Save Search Modal */}
      <Modal
        visible={showSaveSearchModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSaveSearchModal(false)}
      >
        <View style={styles.saveModalOverlay}>
          <View style={styles.saveModalContent}>
            <Text style={styles.saveModalTitle}>Save Search</Text>
            <TextInput
              style={styles.saveModalInput}
              placeholder="Enter search name..."
              value={saveSearchName}
              onChangeText={setSaveSearchName}
              autoFocus={true}
            />
            <View style={styles.saveModalButtons}>
              <TouchableOpacity
                style={styles.saveModalCancel}
                onPress={() => {
                  setShowSaveSearchModal(false);
                  setSaveSearchName('');
                }}
              >
                <Text style={styles.saveModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalSave}
                onPress={saveCurrentSearch}
              >
                <Text style={styles.saveModalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saveButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 8,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsList: {
    backgroundColor: theme.colors.surface,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 12,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  clearButton: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  historyText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 12,
  },
  savedSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  savedSearchContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedSearchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  savedSearchName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  savedSearchQuery: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  deleteSavedSearch: {
    padding: 8,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultsCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  resultItem: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultHeader: {
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    color: theme.colors.white,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  documentCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentCountText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCancel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalApply: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  filterOptionTextActive: {
    color: theme.colors.white,
  },
  toggleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.white,
    alignSelf: 'flex-end',
  },
  clearFiltersButton: {
    marginTop: 20,
    marginBottom: 40,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    color: theme.colors.error,
  },
  // Save search modal
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    width: width - 64,
    maxWidth: 400,
  },
  saveModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  saveModalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
  },
  saveModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveModalCancel: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  saveModalCancelText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  saveModalSave: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  saveModalSaveText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '600',
  },
});

export default RecordSearchScreen;
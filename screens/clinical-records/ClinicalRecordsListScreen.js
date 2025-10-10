/**
 * Clinical Records List Screen
 * 
 * Mobile list view that uses existing clinical records API with mobile-optimized
 * search, filter, and sorting. Includes infinite scrolling, pull-to-refresh,
 * and offline caching capabilities.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Surface,
  Divider,
  IconButton,
  Text,
  ActivityIndicator,
  Searchbar,
  Menu,
  FAB,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../../contexts/AuthContext';
import { useMobileDashboard } from '../../contexts/MobileDashboardContext';
import mobileApiService from '../../services/mobileApiService';
import { formatDate, formatFileSize } from '../../utils/formatUtils';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');

const ClinicalRecordsListScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { updateLastActivity } = useMobileDashboard();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    recordType: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    ordering: '-record_date',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    hasNext: false,
    total: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Filter options
  const recordTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'lab_result', label: 'Lab Results' },
    { value: 'imaging', label: 'Imaging' },
    { value: 'prescription', label: 'Prescriptions' },
    { value: 'consultation', label: 'Consultations' },
    { value: 'procedure', label: 'Procedures' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
    { value: 'pending', label: 'Pending' },
  ];

  const sortOptions = [
    { value: '-record_date', label: 'Newest First' },
    { value: 'record_date', label: 'Oldest First' },
    { value: '-created_at', label: 'Recently Added' },
    { value: 'title', label: 'Title A-Z' },
    { value: '-title', label: 'Title Z-A' },
  ];

  // Cache key for offline storage
  const cacheKey = useMemo(() => {
    const filterKey = JSON.stringify({ ...filters, searchQuery });
    return `clinical_records_${user?.id}_${filterKey}`;
  }, [user?.id, filters, searchQuery]);

  // Load records from API or cache
  const loadRecords = useCallback(async (page = 1, append = false, showLoading = true) => {
    try {
      if (showLoading && !append) setLoading(true);
      if (append) setLoadingMore(true);
      setError(null);

      // Check if online
      const online = await mobileApiService.isOnline();
      setIsOnline(online);

      let data;
      
      if (online) {
        // Load from API
        const options = {
          page,
          pageSize: 20,
          search: searchQuery.trim() || undefined,
          recordType: filters.recordType || undefined,
          status: filters.status || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          ordering: filters.ordering,
        };

        data = await mobileApiService.getClinicalRecords(options);
        
        // Cache the data for offline use
        if (page === 1) {
          await mobileApiService.setCachedData(cacheKey, data, 600000); // 10 minutes TTL
        }
      } else {
        // Load from cache when offline
        const cachedData = await mobileApiService.getCachedData(cacheKey);
        if (cachedData && cachedData.data) {
          data = cachedData.data;
        } else {
          throw new Error('No cached data available offline');
        }
      }

      if (data) {
        const newRecords = data.results || [];
        
        if (append && page > 1) {
          setRecords(prev => [...prev, ...newRecords]);
        } else {
          setRecords(newRecords);
        }

        setPagination({
          page,
          hasNext: !!data.next,
          total: data.count || 0,
        });

        updateLastActivity();
      }
    } catch (err) {
      console.error('Failed to load clinical records:', err);
      setError(err.message);
      
      // Try to load cached data on error
      if (page === 1) {
        try {
          const cachedData = await mobileApiService.getCachedData(cacheKey);
          if (cachedData && cachedData.data && cachedData.data.results) {
            setRecords(cachedData.data.results);
            setPagination({
              page: 1,
              hasNext: false,
              total: cachedData.data.count || 0,
            });
            setError('Showing cached data (offline)');
          }
        } catch (cacheErr) {
          console.error('Failed to load cached data:', cacheErr);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [searchQuery, filters, cacheKey, updateLastActivity]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      loadRecords(1, false, true);
    }, [loadRecords])
  );

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== '') {
        loadRecords(1, false, false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter change handler
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Apply filters
  useEffect(() => {
    loadRecords(1, false, false);
  }, [filters]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecords(1, false, false);
  }, [loadRecords]);

  // Load more records (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loadingMore && pagination.hasNext && isOnline) {
      loadRecords(pagination.page + 1, true, false);
    }
  }, [loadingMore, pagination.hasNext, pagination.page, loadRecords, isOnline]);

  // Navigation handlers
  const navigateToDetail = (recordId) => {
    navigation.navigate('ClinicalRecordDetail', { recordId });
  };

  const navigateToSearch = () => {
    navigation.navigate('RecordSearch', { initialQuery: searchQuery });
  };

  const navigateToUpload = () => {
    // For now, navigate to upload without a specific record
    // This would require the upload screen to handle record creation
    // or show a record selection dialog
    navigation.navigate('DocumentUpload', {
      // Could pass available records for selection
      availableRecords: records.slice(0, 10), // Recent records
    });
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      recordType: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      ordering: '-record_date',
    });
  };

  // Render record item
  const renderRecordItem = ({ item, index }) => (
    <Card style={styles.recordCard} onPress={() => navigateToDetail(item.id)}>
      <Card.Content>
        <View style={styles.recordHeader}>
          <View style={styles.recordInfo}>
            <Text style={styles.recordTitle} numberOfLines={2}>
              {item.title || 'Untitled Record'}
            </Text>
            <Text style={styles.recordMeta}>
              {item.record_type?.replace('_', ' ').toUpperCase()} • {formatDate(item.record_date)}
            </Text>
          </View>
          <View style={styles.recordStatus}>
            <Chip
              size="small"
              mode={item.status === 'active' ? 'flat' : 'outlined'}
              textStyle={styles.statusChipText}
            >
              {item.status}
            </Chip>
          </View>
        </View>

        {item.description && (
          <Paragraph style={styles.recordDescription} numberOfLines={2}>
            {item.description}
          </Paragraph>
        )}

        <View style={styles.recordFooter}>
          <View style={styles.recordStats}>
            {item.document_count > 0 && (
              <View style={styles.statItem}>
                <Icon name="file-document" size={16} color={theme.colors.primary} />
                <Text style={styles.statText}>{item.document_count} docs</Text>
              </View>
            )}
            {item.priority && item.priority !== 'normal' && (
              <View style={styles.statItem}>
                <Icon
                  name={item.priority === 'high' ? 'alert' : 'arrow-up'}
                  size={16}
                  color={item.priority === 'high' ? theme.colors.error : theme.colors.warning}
                />
                <Text style={styles.statText}>{item.priority}</Text>
              </View>
            )}
          </View>
          <Text style={styles.recordDate}>
            Updated {formatDate(item.updated_at)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  // Render list header
  const renderListHeader = () => (
    <View style={styles.listHeader}>
      {/* Search Bar */}
      <Searchbar
        placeholder="Search clinical records..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        icon="magnify"
        clearIcon="close"
        onClearIconPress={clearSearch}
        onSubmitEditing={navigateToSearch}
        onFocus={navigateToSearch}
        showDivider={false}
      />

      {/* Filter Controls */}
      <View style={styles.filterControls}>
        <Button
          mode={showFilters ? 'contained' : 'outlined'}
          icon="filter"
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
          compact
        >
          Filters
        </Button>

        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              icon="sort"
              onPress={() => setSortMenuVisible(true)}
              style={styles.sortButton}
              compact
            >
              Sort
            </Button>
          }
        >
          {sortOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                handleFilterChange({ ordering: option.value });
                setSortMenuVisible(false);
              }}
              title={option.label}
              leadingIcon={filters.ordering === option.value ? 'check' : undefined}
            />
          ))}
        </Menu>

        {(searchQuery || filters.recordType || filters.status) && (
          <Button
            mode="text"
            icon="close"
            onPress={() => {
              clearSearch();
              clearFilters();
            }}
            compact
          >
            Clear
          </Button>
        )}
      </View>

      {/* Expandable Filters */}
      {showFilters && (
        <Surface style={styles.filtersPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Type:</Text>
            <View style={styles.filterChips}>
              {recordTypeOptions.map((option) => (
                <Chip
                  key={option.value}
                  mode={filters.recordType === option.value ? 'flat' : 'outlined'}
                  selected={filters.recordType === option.value}
                  onPress={() => handleFilterChange({ recordType: option.value })}
                  style={styles.filterChip}
                  compact
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.filterChips}>
              {statusOptions.map((option) => (
                <Chip
                  key={option.value}
                  mode={filters.status === option.value ? 'flat' : 'outlined'}
                  selected={filters.status === option.value}
                  onPress={() => handleFilterChange({ status: option.value })}
                  style={styles.filterChip}
                  compact
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </View>
        </Surface>
      )}

      {/* Results Summary */}
      <View style={styles.resultsSummary}>
        <Text style={styles.resultsText}>
          {pagination.total > 0
            ? `${pagination.total} record${pagination.total !== 1 ? 's' : ''} found`
            : 'No records found'}
        </Text>
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <Icon name="wifi-off" size={16} color={theme.colors.warning} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Render list footer
  const renderListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingMoreText}>Loading more records...</Text>
        </View>
      );
    }

    if (!pagination.hasNext && records.length > 0) {
      return (
        <View style={styles.endOfList}>
          <Text style={styles.endOfListText}>No more records to load</Text>
        </View>
      );
    }

    return null;
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="file-document-outline" size={64} color={theme.colors.disabled} />
      <Title style={styles.emptyTitle}>No Records Found</Title>
      <Paragraph style={styles.emptyMessage}>
        {searchQuery || filters.recordType || filters.status
          ? 'No records match your current search and filters. Try adjusting your criteria.'
          : user?.role === 'patient'
          ? 'You don\'t have any clinical records yet. Your healthcare provider will add records as they become available.'
          : 'No clinical records found. Start by uploading documents or creating new records.'}
      </Paragraph>
      {!searchQuery && !filters.recordType && !filters.status && (user?.role === 'doctor' || user?.role === 'staff') && (
        <Button
          mode="contained"
          icon="upload"
          onPress={navigateToUpload}
          style={styles.emptyActionButton}
        >
          Upload First Document
        </Button>
      )}
    </View>
  );

  // Render loading state
  if (loading && records.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading clinical records...</Text>
      </View>
    );
  }

  // Render error state
  if (error && records.length === 0 && !error.includes('cached')) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color={theme.colors.error} />
        <Text style={styles.errorTitle}>Failed to Load Records</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Button mode="contained" onPress={() => loadRecords(1, false, true)}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        testID="clinical-records-list"
        data={records}
        renderItem={renderRecordItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={records.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Floating Action Button */}
      {(user?.role === 'doctor' || user?.role === 'staff') && (
        <FAB
          style={styles.fab}
          icon="upload"
          onPress={navigateToUpload}
          label="Upload"
        />
      )}

      {/* Error Banner */}
      {error && error.includes('cached') && (
        <Surface style={styles.errorBanner}>
          <Icon name="wifi-off" size={20} color={theme.colors.warning} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.error,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.onSurface,
  },
  listHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginBottom: 12,
    elevation: 2,
  },
  filterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterButton: {
    marginRight: 8,
  },
  sortButton: {
    marginRight: 8,
  },
  filtersPanel: {
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    elevation: 1,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  resultsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  resultsText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 12,
    color: theme.colors.warning,
    marginLeft: 4,
  },
  recordCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordInfo: {
    flex: 1,
    marginRight: 12,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  recordMeta: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.7,
  },
  recordStatus: {
    alignItems: 'flex-end',
  },
  statusChipText: {
    fontSize: 10,
  },
  recordDescription: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.8,
    marginBottom: 12,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.7,
    marginLeft: 4,
  },
  recordDate: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.6,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
  },
  endOfList: {
    alignItems: 'center',
    padding: 20,
  },
  endOfListText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.5,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  emptyMessage: {
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.onSurface,
    opacity: 0.7,
  },
  emptyActionButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  errorBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.warningContainer,
    elevation: 4,
  },
  errorBannerText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.onWarningContainer,
  },
});

export default ClinicalRecordsListScreen;
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet
} from 'react-native';
import {
  Card,
  Chip,
  Searchbar,
  FAB,
  Menu,
  Button,
  ActivityIndicator,
  Badge
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import prescriptionService from '../../services/prescriptionService';
import { theme } from '../../styles/theme';
import { formatDate, formatDateTime } from '../../utils/formatUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';

const PrescriptionListScreen = ({ navigation, route }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Prescriptions' },
    ...prescriptionService.getStatusOptions()
  ];

  const loadPrescriptions = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const filters = {
        page: pageNum,
        pageSize: 20,
        search: searchQuery || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      };

      const response = await prescriptionService.getPrescriptions(filters);
      
      if (pageNum === 1 || isRefresh) {
        setPrescriptions(response.results || response);
      } else {
        setPrescriptions(prev => [...prev, ...(response.results || response)]);
      }

      setHasMore(!!response.next);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading prescriptions:', err);
      setError(err.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedStatus]);

  useFocusEffect(
    useCallback(() => {
      loadPrescriptions(1, true);
    }, [loadPrescriptions])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadPrescriptions(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      loadPrescriptions(page + 1);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Debounce search
    setTimeout(() => {
      loadPrescriptions(1, true);
    }, 500);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    setMenuVisible(false);
    loadPrescriptions(1, true);
  };

  const handlePrescriptionPress = (prescription) => {
    navigation.navigate('PrescriptionDetail', { 
      prescriptionId: prescription.id,
      prescription 
    });
  };

  const handleRequestRefill = (prescription) => {
    if (!prescriptionService.isEligibleForRefill(prescription)) {
      Alert.alert(
        'Refill Not Available',
        'This prescription is not eligible for refill. Please contact your doctor.'
      );
      return;
    }

    Alert.alert(
      'Request Refill',
      `Request a refill for prescription #${prescription.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => navigation.navigate('RequestRefill', { prescription })
        }
      ]
    );
  };

  const renderPrescriptionCard = ({ item: prescription }) => {
    const statusInfo = prescriptionService.formatStatus(prescription.status);
    const urgencyInfo = prescriptionService.getUrgencyLevel(prescription);
    const progress = prescriptionService.calculateProgress(prescription);

    return (
      <Card style={styles.prescriptionCard} onPress={() => handlePrescriptionPress(prescription)}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.prescriptionInfo}>
              <Text style={styles.prescriptionId}>#{prescription.id}</Text>
              <Text style={styles.doctorName}>
                Dr. {prescription.doctor?.name || 'Unknown Doctor'}
              </Text>
              <Text style={styles.prescriptionDate}>
                {formatDate(prescription.created_at)}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <Chip
                mode="outlined"
                style={[styles.statusChip, { borderColor: statusInfo.color }]}
                textStyle={{ color: statusInfo.color }}
              >
                {statusInfo.label}
              </Chip>
              {urgencyInfo.level !== 'normal' && (
                <Chip
                  mode="outlined"
                  style={[styles.urgencyChip, { borderColor: urgencyInfo.color }]}
                  textStyle={{ color: urgencyInfo.color, fontSize: 10 }}
                >
                  {urgencyInfo.label}
                </Chip>
              )}
            </View>
          </View>

          <View style={styles.medicationsList}>
            {prescription.prescription_drugs?.slice(0, 2).map((drug, index) => (
              <View key={index} style={styles.medicationItem}>
                <Icon name="pill" size={16} color={theme.colors.primary} />
                <Text style={styles.medicationName}>
                  {drug.drug?.product_name || 'Unknown Medication'}
                </Text>
                <Text style={styles.medicationDosage}>
                  {prescriptionService.formatDosageInstructions(drug.dosage_instructions)}
                </Text>
              </View>
            ))}
            {prescription.prescription_drugs?.length > 2 && (
              <Text style={styles.moreItems}>
                +{prescription.prescription_drugs.length - 2} more medications
              </Text>
            )}
          </View>

          {prescription.status !== 'new' && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Progress: {progress}%</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progress}%`, backgroundColor: statusInfo.color }
                  ]} 
                />
              </View>
            </View>
          )}

          <View style={styles.cardActions}>
            <Button
              mode="outlined"
              onPress={() => handlePrescriptionPress(prescription)}
              style={styles.actionButton}
            >
              View Details
            </Button>
            {prescriptionService.isEligibleForRefill(prescription) && (
              <Button
                mode="contained"
                onPress={() => handleRequestRefill(prescription)}
                style={styles.actionButton}
              >
                Request Refill
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingMoreText}>Loading more prescriptions...</Text>
      </View>
    );
  };

  if (loading && prescriptions.length === 0) {
    return <LoadingSpinner message="Loading prescriptions..." />;
  }

  if (error && prescriptions.length === 0) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => loadPrescriptions(1, true)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search prescriptions..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setMenuVisible(true)}
            >
              <Icon name="filter-variant" size={24} color={theme.colors.primary} />
              {selectedStatus !== 'all' && (
                <Badge style={styles.filterBadge} size={8} />
              )}
            </TouchableOpacity>
          }
        >
          {statusOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => handleStatusFilter(option.value)}
              title={option.label}
              leadingIcon={selectedStatus === option.value ? "check" : undefined}
            />
          ))}
        </Menu>
      </View>

      {prescriptions.length === 0 ? (
        <EmptyState
          icon="pill"
          title="No Prescriptions Found"
          message={
            searchQuery || selectedStatus !== 'all'
              ? "No prescriptions match your current filters"
              : "You don't have any prescriptions yet"
          }
          actionLabel={searchQuery || selectedStatus !== 'all' ? "Clear Filters" : undefined}
          onAction={() => {
            setSearchQuery('');
            setSelectedStatus('all');
            loadPrescriptions(1, true);
          }}
        />
      ) : (
        <FlatList
          data={prescriptions}
          renderItem={renderPrescriptionCard}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ScanPrescription')}
        label="Scan Prescription"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  searchBar: {
    flex: 1,
    marginRight: 12,
  },
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.error,
  },
  listContainer: {
    padding: 16,
  },
  prescriptionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  doctorName: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  prescriptionDate: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 4,
  },
  urgencyChip: {
    height: 24,
  },
  medicationsList: {
    marginBottom: 12,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  medicationName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  medicationDosage: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginLeft: 8,
  },
  moreItems: {
    fontSize: 12,
    color: theme.colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: theme.colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default PrescriptionListScreen;
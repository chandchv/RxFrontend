/**
 * SearchFilters Component
 * Mobile-optimized search filters for clinical records
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Card, 
  Text, 
  useTheme, 
  Chip, 
  Button,
  TextInput,
  Divider,
  RadioButton,
  Checkbox
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';

const FilterSection = ({ title, children, collapsible = true, defaultExpanded = true }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.filterSection}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => collapsible && setExpanded(!expanded)}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        {collapsible && (
          <Icon 
            name={expanded ? "expand-less" : "expand-more"} 
            size={24} 
            color={theme.colors.onSurfaceVariant} 
          />
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

const SearchFilters = ({
  filters = {},
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  onClose,
  availableFilters = {},
  style,
  ...props
}) => {
  const theme = useTheme();
  
  const [localFilters, setLocalFilters] = useState({
    searchQuery: '',
    dateRange: 'all', // 'all', 'today', 'week', 'month', 'year', 'custom'
    recordTypes: [],
    status: [],
    priority: 'all',
    patientId: '',
    doctorId: '',
    sortBy: 'date_desc', // 'date_desc', 'date_asc', 'name_asc', 'name_desc'
    ...filters
  });

  const defaultAvailableFilters = {
    recordTypes: [
      { value: 'lab_result', label: 'Lab Results', icon: 'science' },
      { value: 'imaging', label: 'Imaging', icon: 'medical-services' },
      { value: 'prescription', label: 'Prescriptions', icon: 'local-pharmacy' },
      { value: 'clinical_note', label: 'Clinical Notes', icon: 'note-add' },
      { value: 'document', label: 'Documents', icon: 'description' },
    ],
    status: [
      { value: 'processed', label: 'Processed', color: 'success' },
      { value: 'processing', label: 'Processing', color: 'warning' },
      { value: 'failed', label: 'Failed', color: 'error' },
      { value: 'pending', label: 'Pending', color: 'default' },
    ],
    dateRanges: [
      { value: 'all', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'year', label: 'This Year' },
      { value: 'custom', label: 'Custom Range' },
    ],
    sortOptions: [
      { value: 'date_desc', label: 'Newest First' },
      { value: 'date_asc', label: 'Oldest First' },
      { value: 'name_asc', label: 'Name A-Z' },
      { value: 'name_desc', label: 'Name Z-A' },
    ],
    priorities: [
      { value: 'all', label: 'All Priorities' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'high', label: 'High' },
      { value: 'normal', label: 'Normal' },
      { value: 'low', label: 'Low' },
    ],
    ...availableFilters
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const toggleArrayFilter = (key, value) => {
    const currentArray = localFilters[key] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters(localFilters);
    }
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      searchQuery: '',
      dateRange: 'all',
      recordTypes: [],
      status: [],
      priority: 'all',
      patientId: '',
      doctorId: '',
      sortBy: 'date_desc',
    };
    setLocalFilters(clearedFilters);
    if (onClearFilters) {
      onClearFilters();
    }
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.searchQuery) count++;
    if (localFilters.dateRange !== 'all') count++;
    if (localFilters.recordTypes?.length > 0) count++;
    if (localFilters.status?.length > 0) count++;
    if (localFilters.priority !== 'all') count++;
    if (localFilters.patientId) count++;
    if (localFilters.doctorId) count++;
    return count;
  };

  const getChipColor = (type) => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <Card style={[styles.card, style]} mode="contained" {...props}>
      <Card.Content style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Search Filters
          </Text>
          <View style={styles.headerActions}>
            {getActiveFiltersCount() > 0 && (
              <Chip
                mode="outlined"
                compact
                style={[styles.activeFiltersChip, { borderColor: theme.colors.primary }]}
                textStyle={{ color: theme.colors.primary }}
              >
                {getActiveFiltersCount()} active
              </Chip>
            )}
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.filtersContainer}>
          {/* Search Query */}
          <FilterSection title="Search" collapsible={false}>
            <TextInput
              mode="outlined"
              placeholder="Search records..."
              value={localFilters.searchQuery}
              onChangeText={(text) => updateFilter('searchQuery', text)}
              left={<TextInput.Icon icon="magnify" />}
              style={styles.searchInput}
            />
          </FilterSection>

          <Divider style={styles.divider} />

          {/* Date Range */}
          <FilterSection title="Date Range">
            <RadioButton.Group
              onValueChange={(value) => updateFilter('dateRange', value)}
              value={localFilters.dateRange}
            >
              {defaultAvailableFilters.dateRanges.map((range) => (
                <View key={range.value} style={styles.radioItem}>
                  <RadioButton value={range.value} />
                  <Text 
                    variant="bodyMedium" 
                    style={[styles.radioLabel, { color: theme.colors.onSurface }]}
                  >
                    {range.label}
                  </Text>
                </View>
              ))}
            </RadioButton.Group>
          </FilterSection>

          <Divider style={styles.divider} />

          {/* Record Types */}
          <FilterSection title="Record Types">
            <View style={styles.chipContainer}>
              {defaultAvailableFilters.recordTypes.map((type) => (
                <Chip
                  key={type.value}
                  mode={localFilters.recordTypes?.includes(type.value) ? 'flat' : 'outlined'}
                  selected={localFilters.recordTypes?.includes(type.value)}
                  onPress={() => toggleArrayFilter('recordTypes', type.value)}
                  icon={type.icon}
                  style={styles.filterChip}
                >
                  {type.label}
                </Chip>
              ))}
            </View>
          </FilterSection>

          <Divider style={styles.divider} />

          {/* Status */}
          <FilterSection title="Status">
            <View style={styles.chipContainer}>
              {defaultAvailableFilters.status.map((status) => (
                <Chip
                  key={status.value}
                  mode={localFilters.status?.includes(status.value) ? 'flat' : 'outlined'}
                  selected={localFilters.status?.includes(status.value)}
                  onPress={() => toggleArrayFilter('status', status.value)}
                  style={[
                    styles.filterChip,
                    localFilters.status?.includes(status.value) && {
                      backgroundColor: getChipColor(status.color) + '20',
                      borderColor: getChipColor(status.color),
                    }
                  ]}
                  textStyle={
                    localFilters.status?.includes(status.value) && {
                      color: getChipColor(status.color),
                    }
                  }
                >
                  {status.label}
                </Chip>
              ))}
            </View>
          </FilterSection>

          <Divider style={styles.divider} />

          {/* Priority */}
          <FilterSection title="Priority">
            <RadioButton.Group
              onValueChange={(value) => updateFilter('priority', value)}
              value={localFilters.priority}
            >
              {defaultAvailableFilters.priorities.map((priority) => (
                <View key={priority.value} style={styles.radioItem}>
                  <RadioButton value={priority.value} />
                  <Text 
                    variant="bodyMedium" 
                    style={[styles.radioLabel, { color: theme.colors.onSurface }]}
                  >
                    {priority.label}
                  </Text>
                </View>
              ))}
            </RadioButton.Group>
          </FilterSection>

          <Divider style={styles.divider} />

          {/* Sort By */}
          <FilterSection title="Sort By">
            <RadioButton.Group
              onValueChange={(value) => updateFilter('sortBy', value)}
              value={localFilters.sortBy}
            >
              {defaultAvailableFilters.sortOptions.map((option) => (
                <View key={option.value} style={styles.radioItem}>
                  <RadioButton value={option.value} />
                  <Text 
                    variant="bodyMedium" 
                    style={[styles.radioLabel, { color: theme.colors.onSurface }]}
                  >
                    {option.label}
                  </Text>
                </View>
              ))}
            </RadioButton.Group>
          </FilterSection>

          <Divider style={styles.divider} />

          {/* Additional Filters */}
          <FilterSection title="Additional Filters">
            <TextInput
              mode="outlined"
              placeholder="Patient ID"
              value={localFilters.patientId}
              onChangeText={(text) => updateFilter('patientId', text)}
              style={styles.additionalInput}
            />
            <TextInput
              mode="outlined"
              placeholder="Doctor ID"
              value={localFilters.doctorId}
              onChangeText={(text) => updateFilter('doctorId', text)}
              style={styles.additionalInput}
            />
          </FilterSection>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={handleClearFilters}
            style={styles.actionButton}
            disabled={getActiveFiltersCount() === 0}
          >
            Clear All
          </Button>
          <Button
            mode="contained"
            onPress={handleApplyFilters}
            style={styles.actionButton}
          >
            Apply Filters
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    maxHeight: '90%',
  },
  content: {
    padding: spacing.md,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeFiltersChip: {
    marginRight: spacing.sm,
    height: 28,
  },
  closeButton: {
    padding: spacing.xs,
  },
  filtersContainer: {
    flex: 1,
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  sectionContent: {
    paddingTop: spacing.sm,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  radioLabel: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  additionalInput: {
    marginBottom: spacing.sm,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});

export default SearchFilters;
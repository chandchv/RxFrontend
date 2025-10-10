/**
 * RecentActivityList Component
 * Mobile-optimized recent activity display for dashboard
 */

import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const ActivityItem = ({ item, onPress, theme }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'clinical_record':
        return 'folder-open';
      case 'appointment':
        return 'event';
      case 'prescription':
        return 'local-pharmacy';
      case 'lab_result':
        return 'science';
      case 'document_upload':
        return 'cloud-upload';
      case 'patient_registration':
        return 'person-add';
      case 'billing':
        return 'receipt';
      default:
        return 'notifications';
    }
  };

  const getActivityColor = (type, status) => {
    if (status === 'error' || status === 'failed') return theme.colors.error;
    if (status === 'warning' || status === 'pending') return theme.colors.warning;
    if (status === 'success' || status === 'completed') return theme.colors.success;
    
    switch (type) {
      case 'clinical_record':
        return theme.colors.primary;
      case 'appointment':
        return theme.colors.secondary;
      case 'prescription':
        return theme.colors.tertiary;
      case 'lab_result':
        return theme.colors.success;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <TouchableOpacity 
      style={styles.activityItem} 
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.activityIconContainer}>
        <Icon 
          name={getActivityIcon(item.type)} 
          size={20} 
          color={getActivityColor(item.type, item.status)} 
        />
      </View>
      
      <View style={styles.activityContent}>
        <Text 
          variant="bodyMedium" 
          style={[styles.activityTitle, { color: theme.colors.onSurface }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        
        {item.subtitle && (
          <Text 
            variant="bodySmall" 
            style={[styles.activitySubtitle, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        )}
        
        <View style={styles.activityMeta}>
          <Text 
            variant="labelSmall" 
            style={[styles.activityTime, { color: theme.colors.onSurfaceVariant }]}
          >
            {formatUtils.formatRelativeTime(item.timestamp)}
          </Text>
          
          {item.status && (
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getActivityColor(item.type, item.status) + '20' }
            ]}>
              <Text 
                variant="labelSmall" 
                style={[
                  styles.statusText, 
                  { color: getActivityColor(item.type, item.status) }
                ]}
              >
                {item.status}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {onPress && (
        <Icon 
          name="chevron-right" 
          size={20} 
          color={theme.colors.onSurfaceVariant} 
        />
      )}
    </TouchableOpacity>
  );
};

const RecentActivityList = ({
  title = "Recent Activity",
  activities = [],
  maxItems = 5,
  onItemPress,
  onViewAll,
  loading = false,
  error = false,
  emptyMessage = "No recent activity",
  style,
  ...props
}) => {
  const theme = useTheme();

  const displayActivities = activities.slice(0, maxItems);

  const renderActivityItem = ({ item, index }) => (
    <View key={item.id || index}>
      <ActivityItem 
        item={item} 
        onPress={onItemPress} 
        theme={theme} 
      />
      {index < displayActivities.length - 1 && (
        <Divider style={styles.divider} />
      )}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Loading activities...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={32} color={theme.colors.error} />
          <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
            Error loading activities
          </Text>
        </View>
      );
    }

    if (displayActivities.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="inbox" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            {emptyMessage}
          </Text>
        </View>
      );
    }

    return (
      <>
        <FlatList
          data={displayActivities}
          renderItem={renderActivityItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
        
        {activities.length > maxItems && onViewAll && (
          <>
            <Divider style={styles.divider} />
            <TouchableOpacity 
              style={styles.viewAllButton} 
              onPress={onViewAll}
              activeOpacity={0.7}
            >
              <Text 
                variant="labelLarge" 
                style={[styles.viewAllText, { color: theme.colors.primary }]}
              >
                View All ({activities.length})
              </Text>
              <Icon name="arrow-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </>
    );
  };

  return (
    <Card 
      style={[styles.card, style]} 
      mode="contained"
      {...props}
    >
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text 
            variant="titleMedium" 
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
        </View>
        
        {renderContent()}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontWeight: '500',
    lineHeight: 20,
  },
  activitySubtitle: {
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  activityTime: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  divider: {
    marginLeft: 56, // Align with content after icon
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  viewAllText: {
    marginRight: spacing.xs,
    fontWeight: '500',
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RecentActivityList;
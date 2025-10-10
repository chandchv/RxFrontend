/**
 * NotificationPanel Component
 * Mobile-optimized notification display panel for dashboard
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, IconButton, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const NotificationItem = ({ notification, onPress, onDismiss, theme }) => {
  const getNotificationIcon = (type, priority) => {
    if (priority === 'high' || priority === 'urgent') {
      return 'priority-high';
    }
    
    switch (type) {
      case 'appointment':
        return 'event';
      case 'prescription':
        return 'local-pharmacy';
      case 'lab_result':
        return 'science';
      case 'clinical_record':
        return 'folder-open';
      case 'system':
        return 'settings';
      case 'billing':
        return 'receipt';
      case 'message':
        return 'message';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'urgent') return theme.colors.error;
    if (priority === 'high') return theme.colors.warning;
    
    switch (type) {
      case 'appointment':
        return theme.colors.primary;
      case 'prescription':
        return theme.colors.success;
      case 'lab_result':
        return theme.colors.secondary;
      case 'clinical_record':
        return theme.colors.tertiary;
      case 'system':
        return theme.colors.onSurfaceVariant;
      case 'billing':
        return theme.colors.warning;
      case 'message':
        return theme.colors.primary;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'URGENT';
      case 'high':
        return 'HIGH';
      case 'medium':
        return 'MEDIUM';
      case 'low':
        return 'LOW';
      default:
        return null;
    }
  };

  const notificationColor = getNotificationColor(notification.type, notification.priority);
  const priorityLabel = getPriorityLabel(notification.priority);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.read ? 'transparent' : notificationColor + '08',
          borderLeftColor: notificationColor,
          borderLeftWidth: notification.read ? 0 : 3,
        }
      ]}
      onPress={() => onPress && onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.iconAndTitle}>
            <Icon
              name={getNotificationIcon(notification.type, notification.priority)}
              size={20}
              color={notificationColor}
              style={styles.notificationIcon}
            />
            
            <View style={styles.titleContainer}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.notificationTitle,
                  {
                    color: theme.colors.onSurface,
                    fontWeight: notification.read ? '400' : '600',
                  }
                ]}
                numberOfLines={2}
              >
                {notification.title}
              </Text>
              
              {priorityLabel && (
                <Chip
                  mode="outlined"
                  compact
                  style={[
                    styles.priorityChip,
                    { borderColor: notificationColor }
                  ]}
                  textStyle={[
                    styles.priorityText,
                    { color: notificationColor }
                  ]}
                >
                  {priorityLabel}
                </Chip>
              )}
            </View>
          </View>

          {onDismiss && (
            <IconButton
              icon="close"
              size={16}
              iconColor={theme.colors.onSurfaceVariant}
              onPress={() => onDismiss(notification)}
              style={styles.dismissButton}
            />
          )}
        </View>

        {notification.message && (
          <Text
            variant="bodySmall"
            style={[
              styles.notificationMessage,
              { color: theme.colors.onSurfaceVariant }
            ]}
            numberOfLines={3}
          >
            {notification.message}
          </Text>
        )}

        <View style={styles.notificationFooter}>
          <Text
            variant="labelSmall"
            style={[
              styles.notificationTime,
              { color: theme.colors.onSurfaceVariant }
            ]}
          >
            {formatUtils.formatRelativeTime(notification.timestamp)}
          </Text>

          {notification.actionLabel && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { borderColor: notificationColor }
              ]}
              onPress={() => onPress && onPress(notification, 'action')}
            >
              <Text
                variant="labelSmall"
                style={[
                  styles.actionText,
                  { color: notificationColor }
                ]}
              >
                {notification.actionLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const NotificationPanel = ({
  title = "Notifications",
  notifications = [],
  maxItems = 5,
  onNotificationPress,
  onNotificationDismiss,
  onViewAll,
  onMarkAllRead,
  loading = false,
  error = false,
  emptyMessage = "No notifications",
  showActions = true,
  style,
  ...props
}) => {
  const theme = useTheme();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'urgent'

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => !n.read);
        break;
      case 'urgent':
        filtered = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high');
        break;
      default:
        filtered = notifications;
    }
    
    return filtered.slice(0, maxItems);
  };

  const displayNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const renderFilterChips = () => {
    const filters = [
      { key: 'all', label: 'All', count: notifications.length },
      { key: 'unread', label: 'Unread', count: unreadCount },
      { key: 'urgent', label: 'Urgent', count: notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length },
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map(filterItem => (
          <Chip
            key={filterItem.key}
            mode={filter === filterItem.key ? 'flat' : 'outlined'}
            selected={filter === filterItem.key}
            onPress={() => setFilter(filterItem.key)}
            style={styles.filterChip}
            compact
          >
            {filterItem.label} ({filterItem.count})
          </Chip>
        ))}
      </View>
    );
  };

  const renderNotificationItem = ({ item, index }) => (
    <NotificationItem
      key={item.id || index}
      notification={item}
      onPress={onNotificationPress}
      onDismiss={onNotificationDismiss}
      theme={theme}
    />
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Loading notifications...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={32} color={theme.colors.error} />
          <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
            Error loading notifications
          </Text>
        </View>
      );
    }

    if (displayNotifications.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="notifications-none" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            {emptyMessage}
          </Text>
        </View>
      );
    }

    return (
      <>
        {renderFilterChips()}
        
        <FlatList
          data={displayNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        {showActions && (
          <View style={styles.actionsContainer}>
            {unreadCount > 0 && onMarkAllRead && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onMarkAllRead}
              >
                <Text
                  variant="labelMedium"
                  style={[styles.actionText, { color: theme.colors.primary }]}
                >
                  Mark All Read
                </Text>
              </TouchableOpacity>
            )}

            {onViewAll && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onViewAll}
              >
                <Text
                  variant="labelMedium"
                  style={[styles.actionText, { color: theme.colors.primary }]}
                >
                  View All
                </Text>
                <Icon name="arrow-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
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
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.colors.error }]}>
              <Text
                variant="labelSmall"
                style={[styles.unreadText, { color: theme.colors.onError }]}
              >
                {unreadCount}
              </Text>
            </View>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  notificationItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconAndTitle: {
    flexDirection: 'row',
    flex: 1,
  },
  notificationIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    flex: 1,
    lineHeight: 20,
    marginRight: spacing.sm,
  },
  priorityChip: {
    height: 24,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dismissButton: {
    margin: 0,
    width: 32,
    height: 32,
  },
  notificationMessage: {
    marginTop: spacing.xs,
    marginLeft: 32, // Align with title
    lineHeight: 16,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginLeft: 32, // Align with title
  },
  notificationTime: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
  },
  actionText: {
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
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

export default NotificationPanel;
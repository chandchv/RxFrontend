/**
 * Notification History List Component
 * 
 * This component displays a comprehensive list of notification history
 * with filtering, searching, and management capabilities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { useNotifications } from '../../contexts/NotificationContext';
import pushNotificationManager from '../../services/pushNotificationManager';
import mobileApiService from '../../services/mobileApiService';

const NotificationHistoryList = ({ onNotificationPress }) => {
  const { colors, spacing, typography } = useTheme();
  const { markNotificationAsRead } = useNotifications();
  
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const filters = [
    { key: 'all', label: 'All', icon: 'notifications' },
    { key: 'unread', label: 'Unread', icon: 'notifications-active' },
    { key: 'appointments', label: 'Appointments', icon: 'event' },
    { key: 'prescriptions', label: 'Prescriptions', icon: 'local-pharmacy' },
    { key: 'clinical_records', label: 'Records', icon: 'folder' },
    { key: 'billing', label: 'Billing', icon: 'payment' },
  ];

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchQuery, selectedFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Load from both local storage and API
      const [localHistory, apiNotifications] = await Promise.all([
        pushNotificationManager.getNotificationHistory(),
        loadApiNotifications()
      ]);

      // Merge and deduplicate notifications
      const allNotifications = mergeNotifications(localHistory, apiNotifications);
      setNotifications(allNotifications);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const loadApiNotifications = async () => {
    try {
      const response = await mobileApiService.getNotificationHistory({
        limit: 100,
        include_read: true
      });
      return response.data?.notifications || [];
    } catch (error) {
      console.error('Error loading API notifications:', error);
      return [];
    }
  };

  const mergeNotifications = (localNotifications, apiNotifications) => {
    const notificationMap = new Map();
    
    // Add local notifications
    localNotifications.forEach(notification => {
      notificationMap.set(notification.id, {
        ...notification,
        source: 'local'
      });
    });
    
    // Add API notifications, overriding local ones if they exist
    apiNotifications.forEach(notification => {
      notificationMap.set(notification.id, {
        ...notification,
        source: 'api'
      });
    });
    
    // Convert back to array and sort by date
    return Array.from(notificationMap.values())
      .sort((a, b) => new Date(b.received_at || b.created_at) - new Date(a.received_at || a.created_at));
  };

  const filterNotifications = () => {
    let filtered = [...notifications];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.title?.toLowerCase().includes(query) ||
        notification.body?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'unread') {
        filtered = filtered.filter(notification => !notification.read);
      } else {
        filtered = filtered.filter(notification => 
          notification.data?.type === selectedFilter ||
          notification.type === selectedFilter
        );
      }
    }
    
    setFilteredNotifications(filtered);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const handleNotificationPress = async (notification) => {
    if (selectionMode) {
      toggleNotificationSelection(notification.id);
      return;
    }

    // Mark as read if unread
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle navigation or custom action
    if (onNotificationPress) {
      onNotificationPress(notification);
    } else {
      handleDefaultNotificationAction(notification);
    }
  };

  const handleDefaultNotificationAction = (notification) => {
    const data = notification.data || {};
    const { type, id } = data;

    // This would typically navigate to the relevant screen
    console.log('Navigate to:', { type, id, notification });
    
    // Show alert for demo purposes
    Alert.alert(
      'Notification Action',
      `Would navigate to ${type || 'notification'} with ID: ${id || 'N/A'}`,
      [{ text: 'OK' }]
    );
  };

  const handleLongPress = (notification) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedNotifications(new Set([notification.id]));
    }
  };

  const toggleNotificationSelection = (notificationId) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      
      // Exit selection mode if no notifications selected
      if (newSet.size === 0) {
        setSelectionMode(false);
      }
      
      return newSet;
    });
  };

  const handleBulkAction = async (action) => {
    const selectedIds = Array.from(selectedNotifications);
    
    try {
      switch (action) {
        case 'markRead':
          await Promise.all(selectedIds.map(id => markNotificationAsRead(id)));
          setNotifications(prev =>
            prev.map(n =>
              selectedIds.includes(n.id) ? { ...n, read: true } : n
            )
          );
          break;
          
        case 'delete':
          Alert.alert(
            'Delete Notifications',
            `Are you sure you want to delete ${selectedIds.length} notifications?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  // Delete from local storage and API
                  await Promise.all([
                    deleteLocalNotifications(selectedIds),
                    deleteApiNotifications(selectedIds)
                  ]);
                  
                  setNotifications(prev =>
                    prev.filter(n => !selectedIds.includes(n.id))
                  );
                }
              }
            ]
          );
          break;
      }
    } catch (error) {
      console.error(`Error performing bulk action ${action}:`, error);
      Alert.alert('Error', `Failed to ${action} notifications`);
    } finally {
      setSelectedNotifications(new Set());
      setSelectionMode(false);
    }
  };

  const deleteLocalNotifications = async (notificationIds) => {
    // Implementation would remove notifications from local storage
    console.log('Delete local notifications:', notificationIds);
  };

  const deleteApiNotifications = async (notificationIds) => {
    try {
      await mobileApiService.deleteNotifications(notificationIds);
    } catch (error) {
      console.error('Error deleting API notifications:', error);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search notifications..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedFilter === item.key ? colors.primary : colors.surface,
                borderColor: colors.border
              }
            ]}
            onPress={() => setSelectedFilter(item.key)}
          >
            <MaterialIcons
              name={item.icon}
              size={16}
              color={selectedFilter === item.key ? colors.onPrimary : colors.textSecondary}
            />
            <Text style={[
              styles.filterText,
              {
                color: selectedFilter === item.key ? colors.onPrimary : colors.textSecondary
              },
              typography.caption
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Selection Mode Header */}
      {selectionMode && (
        <View style={[styles.selectionHeader, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.selectionText, { color: colors.primary }, typography.body2]}>
            {selectedNotifications.size} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.selectionAction}
              onPress={() => handleBulkAction('markRead')}
            >
              <MaterialIcons name="mark-email-read" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionAction}
              onPress={() => handleBulkAction('delete')}
            >
              <MaterialIcons name="delete" size={20} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionAction}
              onPress={() => {
                setSelectionMode(false);
                setSelectedNotifications(new Set());
              }}
            >
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderNotificationItem = ({ item: notification }) => {
    const isSelected = selectedNotifications.has(notification.id);
    const isUnread = !notification.read;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: isSelected ? colors.primaryLight : colors.surface,
            borderLeftColor: isUnread ? colors.primary : colors.border
          }
        ]}
        onPress={() => handleNotificationPress(notification)}
        onLongPress={() => handleLongPress(notification)}
        activeOpacity={0.7}
      >
        {/* Selection Indicator */}
        {selectionMode && (
          <View style={styles.selectionIndicator}>
            <MaterialIcons
              name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
              size={20}
              color={isSelected ? colors.primary : colors.textSecondary}
            />
          </View>
        )}

        {/* Notification Icon */}
        <View style={styles.notificationIcon}>
          <MaterialIcons
            name={getNotificationIcon(notification.data?.type || notification.type)}
            size={24}
            color={isUnread ? colors.primary : colors.textSecondary}
          />
        </View>

        {/* Notification Content */}
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            { color: colors.text },
            typography.subtitle2,
            isUnread && { fontWeight: 'bold' }
          ]}>
            {notification.title || 'Notification'}
          </Text>
          
          <Text style={[
            styles.notificationBody,
            { color: colors.textSecondary },
            typography.body2
          ]} numberOfLines={2}>
            {notification.body || notification.message || 'No message'}
          </Text>
          
          <View style={styles.notificationMeta}>
            <Text style={[
              styles.notificationTime,
              { color: colors.textSecondary },
              typography.caption
            ]}>
              {formatNotificationTime(notification.received_at || notification.created_at)}
            </Text>
            
            {notification.data?.type && (
              <View style={[styles.typeTag, { backgroundColor: colors.primaryLight }]}>
                <Text style={[
                  styles.typeTagText,
                  { color: colors.primary },
                  typography.caption
                ]}>
                  {notification.data.type.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Unread Indicator */}
        {isUnread && (
          <View style={[styles.unreadIndicator, { backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="notifications-none" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }, typography.h6]}>
        No notifications found
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }, typography.body2]}>
        {searchQuery || selectedFilter !== 'all'
          ? 'Try adjusting your search or filter'
          : 'You\'ll see your notifications here when you receive them'
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }, typography.body2]}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderNotificationItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Helper functions
const getNotificationIcon = (type) => {
  switch (type) {
    case 'appointment':
    case 'appointments':
      return 'event';
    case 'prescription':
    case 'prescriptions':
      return 'local-pharmacy';
    case 'clinical_record':
    case 'clinical_records':
      return 'folder';
    case 'billing':
      return 'payment';
    case 'alert':
      return 'warning';
    case 'system':
      return 'settings';
    default:
      return 'notifications';
  }
};

const formatNotificationTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  header: {
    paddingVertical: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: {
    marginLeft: 4,
    fontSize: 12,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  selectionAction: {
    padding: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectionIndicator: {
    marginRight: 12,
    alignSelf: 'center',
  },
  notificationIcon: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTime: {
    fontSize: 10,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 9,
    textTransform: 'capitalize',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationHistoryList;
/**
 * Notification History Screen
 * 
 * This screen displays a list of received notifications with filtering,
 * search, and management capabilities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import mobileApiService from '../../services/mobileApiService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const NotificationHistoryScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { markNotificationAsRead } = useNotifications();
  const { markNotificationsRead } = useRealTime();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const filters = [
    { key: 'all', label: 'All', icon: 'notifications' },
    { key: 'unread', label: 'Unread', icon: 'notifications-active' },
    { key: 'appointments', label: 'Appointments', icon: 'event' },
    { key: 'prescriptions', label: 'Prescriptions', icon: 'medication' },
    { key: 'clinical_records', label: 'Records', icon: 'folder' },
    { key: 'alerts', label: 'Alerts', icon: 'warning' },
  ];

  useEffect(() => {
    loadNotifications(true);
  }, [selectedFilter, searchQuery]);

  const loadNotifications = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const options = {
        page: currentPage,
        pageSize: 20,
        unreadOnly: selectedFilter === 'unread',
        notificationType: selectedFilter !== 'all' && selectedFilter !== 'unread' ? selectedFilter : undefined,
      };

      // Add search if query exists
      if (searchQuery.trim()) {
        options.search = searchQuery.trim();
      }

      const result = await mobileApiService.getNotifications(options);
      
      if (result.success) {
        const newNotifications = result.data.results || [];
        
        if (reset) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setHasMore(newNotifications.length === options.pageSize);
        setPage(currentPage + 1);
      } else {
        throw new Error(result.error || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(true);
  }, [selectedFilter, searchQuery]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadNotifications(false);
    }
  };

  const handleNotificationPress = async (notification) => {
    try {
      // Mark as read if unread
      if (!notification.is_read) {
        await markNotificationAsRead(notification.id);
        await markNotificationsRead([notification.id]);
        
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
      }

      // Navigate based on notification type
      const { type, data } = notification;
      
      switch (type) {
        case 'appointment':
          navigation.navigate('AppointmentDetail', { id: data?.appointment_id });
          break;
        case 'clinical_record':
          navigation.navigate('ClinicalRecordDetail', { id: data?.record_id });
          break;
        case 'prescription':
          navigation.navigate('PrescriptionDetail', { id: data?.prescription_id });
          break;
        case 'billing':
          navigation.navigate('BillingDetail', { id: data?.bill_id });
          break;
        default:
          // Show notification detail modal or navigate to general screen
          showNotificationDetail(notification);
          break;
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const showNotificationDetail = (notification) => {
    Alert.alert(
      notification.title,
      notification.message,
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      if (unreadNotifications.length === 0) {
        Alert.alert('Info', 'No unread notifications');
        return;
      }

      Alert.alert(
        'Mark All Read',
        `Mark ${unreadNotifications.length} notifications as read?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Read',
            onPress: async () => {
              try {
                const notificationIds = unreadNotifications.map(n => n.id);
                await markNotificationsRead(notificationIds);
                
                // Update local state
                setNotifications(prev =>
                  prev.map(n => ({ ...n, is_read: true }))
                );
                
                Alert.alert('Success', 'All notifications marked as read');
              } catch (error) {
                console.error('Error marking all read:', error);
                Alert.alert('Error', 'Failed to mark notifications as read');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in mark all read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local state (API endpoint would be needed for actual deletion)
              setNotifications(prev => prev.filter(n => n.id !== notificationId));
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment':
        return 'event';
      case 'clinical_record':
        return 'folder';
      case 'prescription':
        return 'medication';
      case 'billing':
        return 'receipt';
      case 'alert':
        return 'warning';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type, isRead) => {
    if (isRead) return theme.colors.textSecondary;
    
    switch (type) {
      case 'appointment':
        return theme.colors.primary;
      case 'clinical_record':
        return theme.colors.success;
      case 'prescription':
        return theme.colors.warning;
      case 'billing':
        return theme.colors.info;
      case 'alert':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const formatDate = (dateString) => {
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

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { 
          backgroundColor: item.is_read ? theme.colors.surface : theme.colors.primaryLight,
          borderLeftColor: getNotificationColor(item.type, item.is_read)
        }
      ]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleDeleteNotification(item.id)}
    >
      <View style={styles.notificationHeader}>
        <MaterialIcons
          name={getNotificationIcon(item.type)}
          size={24}
          color={getNotificationColor(item.type, item.is_read)}
        />
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            { 
              color: item.is_read ? theme.colors.textSecondary : theme.colors.text,
              fontWeight: item.is_read ? '400' : '600'
            }
          ]}>
            {item.title}
          </Text>
          <Text style={[
            styles.notificationMessage,
            { color: theme.colors.textSecondary }
          ]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[
            styles.notificationTime,
            { color: theme.colors.textSecondary }
          ]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        {!item.is_read && (
          <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.primary }]} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterItem,
        {
          backgroundColor: selectedFilter === item.key ? theme.colors.primary : theme.colors.surface,
          borderColor: theme.colors.border
        }
      ]}
      onPress={() => setSelectedFilter(item.key)}
    >
      <MaterialIcons
        name={item.icon}
        size={20}
        color={selectedFilter === item.key ? theme.colors.surface : theme.colors.text}
      />
      <Text style={[
        styles.filterText,
        {
          color: selectedFilter === item.key ? theme.colors.surface : theme.colors.text
        }
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="notifications-none"
      title="No Notifications"
      message={
        selectedFilter === 'unread'
          ? "You're all caught up! No unread notifications."
          : searchQuery
          ? "No notifications match your search."
          : "You haven't received any notifications yet."
      }
      actionText={searchQuery ? "Clear Search" : undefined}
      onActionPress={searchQuery ? () => setSearchQuery('') : undefined}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Loading notifications..." />
      </View>
    );
  }

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllRead}
        >
          <MaterialIcons name="done-all" size={20} color={theme.colors.primary} />
          <Text style={styles.markAllText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <FlatList
        data={filters}
        renderItem={renderFilterItem}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      />

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  markAllText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationItem: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default NotificationHistoryScreen;
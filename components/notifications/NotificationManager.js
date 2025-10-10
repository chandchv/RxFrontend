/**
 * Notification Manager Component
 * 
 * This component provides comprehensive notification management functionality
 * including history, statistics, and preferences management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    RefreshControl,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { useNotifications } from '../../contexts/NotificationContext';
import pushNotificationManager from '../../services/pushNotificationManager';
import mobileApiService from '../../services/mobileApiService';

const NotificationManager = ({ visible, onClose }) => {
    const { colors, spacing, typography } = useTheme();
    const {
        notifications,
        unreadCount,
        clearAllNotifications,
        getNotificationCount,
        notificationPreferences,
        updateNotificationPreferences,
        loading,
        hasPermission,
        isRegistered,
        requestPermissions,
        registerForPushNotifications
    } = useNotifications();

    const [activeTab, setActiveTab] = useState('history');
    const [refreshing, setRefreshing] = useState(false);
    const [statistics, setStatistics] = useState(null);
    const [localLoading, setLocalLoading] = useState({
        statistics: false,
        preferences: false,
        actions: false,
    });

    // Load data when component becomes visible
    useEffect(() => {
        if (visible) {
            loadNotificationData();
        }
    }, [visible]);

    // Load notification statistics and data
    const loadNotificationData = useCallback(async () => {
        try {
            setLocalLoading(prev => ({ ...prev, statistics: true }));

            // Load statistics from push notification manager
            const stats = await pushNotificationManager.getNotificationStatistics();
            setStatistics(stats);

        } catch (error) {
            console.error('Error loading notification data:', error);
            Alert.alert('Error', 'Failed to load notification data');
        } finally {
            setLocalLoading(prev => ({ ...prev, statistics: false }));
        }
    }, []);

    // Handle refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadNotificationData();
        setRefreshing(false);
    }, [loadNotificationData]);

    // Handle clear all notifications
    const handleClearAll = useCallback(() => {
        Alert.alert(
            'Clear All Notifications',
            'Are you sure you want to clear all notifications? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLocalLoading(prev => ({ ...prev, actions: true }));
                            await clearAllNotifications();
                            await pushNotificationManager.clearAllNotifications();
                            await loadNotificationData();
                        } catch (error) {
                            console.error('Error clearing notifications:', error);
                            Alert.alert('Error', 'Failed to clear notifications');
                        } finally {
                            setLocalLoading(prev => ({ ...prev, actions: false }));
                        }
                    }
                }
            ]
        );
    }, [clearAllNotifications, loadNotificationData]);

    // Handle permission request
    const handleRequestPermissions = useCallback(async () => {
        try {
            setLocalLoading(prev => ({ ...prev, actions: true }));

            const granted = await requestPermissions();
            if (granted) {
                await registerForPushNotifications();
                Alert.alert('Success', 'Notification permissions granted successfully');
            } else {
                Alert.alert(
                    'Permission Denied',
                    'Notification permissions are required to receive push notifications. Please enable them in your device settings.'
                );
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
            Alert.alert('Error', 'Failed to request permissions');
        } finally {
            setLocalLoading(prev => ({ ...prev, actions: false }));
        }
    }, [requestPermissions, registerForPushNotifications]);

    // Handle preference updates
    const handlePreferenceUpdate = useCallback(async (key, value) => {
        try {
            setLocalLoading(prev => ({ ...prev, preferences: true }));

            const updatedPreferences = {
                ...notificationPreferences,
                [key]: value
            };

            await updateNotificationPreferences(updatedPreferences);

        } catch (error) {
            console.error('Error updating preferences:', error);
            Alert.alert('Error', 'Failed to update notification preferences');
        } finally {
            setLocalLoading(prev => ({ ...prev, preferences: false }));
        }
    }, [notificationPreferences, updateNotificationPreferences]);

    // Handle notification type preference updates
    const handleNotificationTypeUpdate = useCallback(async (type, enabled) => {
        try {
            setLocalLoading(prev => ({ ...prev, preferences: true }));

            const updatedPreferences = {
                ...notificationPreferences,
                notification_types: {
                    ...notificationPreferences?.notification_types,
                    [type]: enabled
                }
            };

            await updateNotificationPreferences(updatedPreferences);

        } catch (error) {
            console.error('Error updating notification type:', error);
            Alert.alert('Error', 'Failed to update notification preferences');
        } finally {
            setLocalLoading(prev => ({ ...prev, preferences: false }));
        }
    }, [notificationPreferences, updateNotificationPreferences]);

    // Render tab buttons
    const renderTabButtons = () => (
        <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
            {[
                { key: 'history', label: 'History', icon: 'history' },
                { key: 'statistics', label: 'Statistics', icon: 'bar-chart' },
                { key: 'preferences', label: 'Settings', icon: 'settings' }
            ].map((tab) => (
                <TouchableOpacity
                    key={tab.key}
                    style={[
                        styles.tabButton,
                        { borderBottomColor: colors.primary },
                        activeTab === tab.key && styles.activeTab
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                >
                    <MaterialIcons
                        name={tab.icon}
                        size={20}
                        color={activeTab === tab.key ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
                        typography.body2
                    ]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    // Render notification history
    const renderHistory = () => (
        <ScrollView
            style={styles.tabContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }, typography.h6]}>
                        Recent Notifications
                    </Text>
                    <View style={styles.headerActions}>
                        <Text style={[styles.unreadBadge, { color: colors.textSecondary }, typography.caption]}>
                            {unreadCount} unread
                        </Text>
                        <TouchableOpacity
                            onPress={handleClearAll}
                            disabled={localLoading.actions}
                            style={[styles.clearButton, { opacity: localLoading.actions ? 0.5 : 1 }]}
                        >
                            {localLoading.actions ? (
                                <ActivityIndicator size="small" color={colors.error} />
                            ) : (
                                <MaterialIcons name="clear-all" size={20} color={colors.error} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="notifications-none" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }, typography.body1]}>
                            No notifications yet
                        </Text>
                    </View>
                ) : (
                    <View style={styles.notificationList}>
                        {notifications.slice(0, 20).map((notification, index) => (
                            <NotificationItem
                                key={notification.request?.identifier || index}
                                notification={notification}
                                colors={colors}
                                typography={typography}
                            />
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );

    // Render statistics
    const renderStatistics = () => (
        <ScrollView
            style={styles.tabContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            {localLoading.statistics ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }, typography.body2]}>
                        Loading statistics...
                    </Text>
                </View>
            ) : statistics ? (
                <View style={[styles.section, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }, typography.h6]}>
                        Notification Statistics
                    </Text>

                    <View style={styles.statsGrid}>
                        <StatCard
                            title="Total"
                            value={statistics.total}
                            icon="notifications"
                            colors={colors}
                            typography={typography}
                        />
                        <StatCard
                            title="Unread"
                            value={statistics.unread}
                            icon="notifications-active"
                            colors={colors}
                            typography={typography}
                        />
                        <StatCard
                            title="Today"
                            value={statistics.today}
                            icon="today"
                            colors={colors}
                            typography={typography}
                        />
                        <StatCard
                            title="This Week"
                            value={statistics.thisWeek}
                            icon="date-range"
                            colors={colors}
                            typography={typography}
                        />
                    </View>

                    <Text style={[styles.subsectionTitle, { color: colors.text }, typography.subtitle1]}>
                        By Type
                    </Text>
                    <View style={styles.typeStats}>
                        {Object.entries(statistics.byType).map(([type, count]) => (
                            <View key={type} style={[styles.typeStatItem, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.typeStatLabel, { color: colors.text }, typography.body1]}>
                                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                                </Text>
                                <Text style={[styles.typeStatValue, { color: colors.primary }, typography.subtitle2]}>
                                    {count}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <MaterialIcons name="bar-chart" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }, typography.body1]}>
                        No statistics available
                    </Text>
                </View>
            )}
        </ScrollView>
    );

    // Render preferences/settings
    const renderPreferences = () => (
        <ScrollView style={styles.tabContent}>
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }, typography.h6]}>
                    Notification Settings
                </Text>

                {/* Permission Status */}
                <View style={[styles.preferenceItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.preferenceInfo}>
                        <Text style={[styles.preferenceLabel, { color: colors.text }, typography.body1]}>
                            Permission Status
                        </Text>
                        <Text style={[styles.preferenceDescription, { color: colors.textSecondary }, typography.caption]}>
                            {hasPermission ? 'Granted' : 'Not granted'}
                        </Text>
                    </View>
                    {!hasPermission && (
                        <TouchableOpacity
                            onPress={handleRequestPermissions}
                            disabled={localLoading.actions}
                            style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={[styles.actionButtonText, { color: colors.onPrimary }, typography.button]}>
                                Grant
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Registration Status */}
                <View style={[styles.preferenceItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.preferenceInfo}>
                        <Text style={[styles.preferenceLabel, { color: colors.text }, typography.body1]}>
                            Registration Status
                        </Text>
                        <Text style={[styles.preferenceDescription, { color: colors.textSecondary }, typography.caption]}>
                            {isRegistered ? 'Registered for push notifications' : 'Not registered'}
                        </Text>
                    </View>
                    <MaterialIcons
                        name={isRegistered ? 'check-circle' : 'error'}
                        size={24}
                        color={isRegistered ? colors.success : colors.error}
                    />
                </View>

                {/* Push Notifications Toggle */}
                <View style={[styles.preferenceItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.preferenceInfo}>
                        <Text style={[styles.preferenceLabel, { color: colors.text }, typography.body1]}>
                            Push Notifications
                        </Text>
                        <Text style={[styles.preferenceDescription, { color: colors.textSecondary }, typography.caption]}>
                            Receive push notifications on this device
                        </Text>
                    </View>
                    <Switch
                        value={notificationPreferences?.push_notifications || false}
                        onValueChange={(value) => handlePreferenceUpdate('push_notifications', value)}
                        disabled={localLoading.preferences}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                    />
                </View>

                {/* Sound Toggle */}
                <View style={[styles.preferenceItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.preferenceInfo}>
                        <Text style={[styles.preferenceLabel, { color: colors.text }, typography.body1]}>
                            Sound
                        </Text>
                        <Text style={[styles.preferenceDescription, { color: colors.textSecondary }, typography.caption]}>
                            Play sound for notifications
                        </Text>
                    </View>
                    <Switch
                        value={notificationPreferences?.sound_enabled !== false}
                        onValueChange={(value) => handlePreferenceUpdate('sound_enabled', value)}
                        disabled={localLoading.preferences}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                    />
                </View>

                {/* Vibration Toggle */}
                <View style={[styles.preferenceItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.preferenceInfo}>
                        <Text style={[styles.preferenceLabel, { color: colors.text }, typography.body1]}>
                            Vibration
                        </Text>
                        <Text style={[styles.preferenceDescription, { color: colors.textSecondary }, typography.caption]}>
                            Vibrate for notifications
                        </Text>
                    </View>
                    <Switch
                        value={notificationPreferences?.vibration_enabled !== false}
                        onValueChange={(value) => handlePreferenceUpdate('vibration_enabled', value)}
                        disabled={localLoading.preferences}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                    />
                </View>

                {/* Notification Types */}
                <Text style={[styles.subsectionTitle, { color: colors.text }, typography.subtitle1]}>
                    Notification Types
                </Text>

                {[
                    { key: 'appointments', label: 'Appointments', description: 'Appointment reminders and updates' },
                    { key: 'prescriptions', label: 'Prescriptions', description: 'Prescription and medication updates' },
                    { key: 'clinical_records', label: 'Clinical Records', description: 'New clinical records and results' },
                    { key: 'billing', label: 'Billing', description: 'Payment and billing notifications' },
                    { key: 'system', label: 'System', description: 'System maintenance and updates' }
                ].map((type) => (
                    <View key={type.key} style={[styles.preferenceItem, { borderBottomColor: colors.border }]}>
                        <View style={styles.preferenceInfo}>
                            <Text style={[styles.preferenceLabel, { color: colors.text }, typography.body1]}>
                                {type.label}
                            </Text>
                            <Text style={[styles.preferenceDescription, { color: colors.textSecondary }, typography.caption]}>
                                {type.description}
                            </Text>
                        </View>
                        <Switch
                            value={notificationPreferences?.notification_types?.[type.key] !== false}
                            onValueChange={(value) => handleNotificationTypeUpdate(type.key, value)}
                            disabled={localLoading.preferences}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={colors.surface}
                        />
                    </View>
                ))}
            </View>
        </ScrollView>
    );

    // Render tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'history':
                return renderHistory();
            case 'statistics':
                return renderStatistics();
            case 'preferences':
                return renderPreferences();
            default:
                return renderHistory();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialIcons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }, typography.h5]}>
                        Notifications
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Tab Navigation */}
                {renderTabButtons()}

                {/* Tab Content */}
                {renderTabContent()}
            </View>
        </Modal>
    );
};

// Notification Item Component
const NotificationItem = ({ notification, colors, typography }) => {
    const content = notification.request?.content || {};
    const data = content.data || {};
    const isRead = data.read || false;

    return (
        <View style={[
            styles.notificationItem,
            {
                backgroundColor: isRead ? colors.surface : colors.primaryLight,
                borderLeftColor: isRead ? colors.border : colors.primary
            }
        ]}>
            <View style={styles.notificationIcon}>
                <MaterialIcons
                    name={getNotificationIcon(data.type)}
                    size={24}
                    color={isRead ? colors.textSecondary : colors.primary}
                />
            </View>
            <View style={styles.notificationContent}>
                <Text style={[
                    styles.notificationTitle,
                    { color: colors.text },
                    typography.subtitle2,
                    !isRead && { fontWeight: 'bold' }
                ]}>
                    {content.title || 'Notification'}
                </Text>
                <Text style={[
                    styles.notificationBody,
                    { color: colors.textSecondary },
                    typography.body2
                ]}>
                    {content.body || 'No message'}
                </Text>
                <Text style={[
                    styles.notificationTime,
                    { color: colors.textSecondary },
                    typography.caption
                ]}>
                    {formatNotificationTime(notification.date)}
                </Text>
            </View>
            {!isRead && (
                <View style={[styles.unreadIndicator, { backgroundColor: colors.primary }]} />
            )}
        </View>
    );
};

// Stat Card Component
const StatCard = ({ title, value, icon, colors, typography }) => (
    <View style={[styles.statCard, { backgroundColor: colors.primaryLight }]}>
        <MaterialIcons name={icon} size={24} color={colors.primary} />
        <Text style={[styles.statValue, { color: colors.text }, typography.h6]}>
            {value}
        </Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }, typography.caption]}>
            {title}
        </Text>
    </View>
);

// Helper functions
const getNotificationIcon = (type) => {
    switch (type) {
        case 'appointment':
            return 'event';
        case 'prescription':
            return 'local-pharmacy';
        case 'clinical_record':
            return 'folder';
        case 'billing':
            return 'payment';
        case 'alert':
            return 'warning';
        default:
            return 'notifications';
    }
};

const formatNotificationTime = (date) => {
    if (!date) return '';

    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now - notificationDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return notificationDate.toLocaleDateString();
};
con
st styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 8,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerSpacer: {
        width: 40,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomWidth: 2,
    },
    tabText: {
        marginLeft: 4,
        fontSize: 12,
    },
    tabContent: {
        flex: 1,
    },
    section: {
        margin: 16,
        borderRadius: 8,
        padding: 16,
        elevation: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    subsectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 24,
        marginBottom: 12,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unreadBadge: {
        marginRight: 12,
        fontSize: 12,
    },
    clearButton: {
        padding: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        marginTop: 12,
        textAlign: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    loadingText: {
        marginTop: 12,
    },
    notificationList: {
        gap: 8,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        elevation: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
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
        marginBottom: 4,
        lineHeight: 16,
    },
    notificationTime: {
        fontSize: 10,
    },
    unreadIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        alignSelf: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        elevation: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 4,
    },
    statTitle: {
        fontSize: 10,
        textAlign: 'center',
    },
    typeStats: {
        gap: 8,
    },
    typeStatItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    typeStatLabel: {
        fontSize: 14,
    },
    typeStatValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    preferenceInfo: {
        flex: 1,
        marginRight: 12,
    },
    preferenceLabel: {
        fontSize: 14,
        marginBottom: 2,
    },
    preferenceDescription: {
        fontSize: 12,
        lineHeight: 16,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default NotificationManager;
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Banner, ActivityIndicator, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import dataSyncService from '../../services/dataSyncService';
import theme from '../../styles/theme';

/**
 * Offline Indicator Component
 * Shows network status and sync progress to users
 */
const OfflineIndicator = ({ style }) => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: true,
    isSyncing: false,
  });
  const [syncStats, setSyncStats] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = dataSyncService.addNetworkListener((status) => {
      setNetworkStatus(status);
      
      // Animate indicator appearance
      if (!status.isOnline || status.isSyncing) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        // Hide indicator after a delay when back online
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 2000);
      }
    });

    // Load initial sync stats
    loadSyncStats();

    return unsubscribe;
  }, [fadeAnim]);

  const loadSyncStats = async () => {
    try {
      const stats = await dataSyncService.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const handleManualSync = async () => {
    if (networkStatus.isOnline && !networkStatus.isSyncing) {
      try {
        await dataSyncService.manualSync();
        await loadSyncStats();
      } catch (error) {
        console.error('Manual sync failed:', error);
      }
    }
  };

  const formatLastSyncTime = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getBannerMessage = () => {
    if (!networkStatus.isOnline) {
      return 'You are offline. Changes will be saved and synced when connection is restored.';
    }
    
    if (networkStatus.isSyncing) {
      return 'Syncing offline changes...';
    }
    
    return 'Connection restored. Data synced successfully.';
  };

  const getBannerIcon = () => {
    if (!networkStatus.isOnline) {
      return 'wifi-off';
    }
    
    if (networkStatus.isSyncing) {
      return 'sync';
    }
    
    return 'wifi';
  };

  const shouldShowBanner = !networkStatus.isOnline || networkStatus.isSyncing;

  if (!shouldShowBanner && fadeAnim._value === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, style, { opacity: fadeAnim }]}>
      <Banner
        visible={shouldShowBanner}
        actions={[
          {
            label: showDetails ? 'Hide Details' : 'Details',
            onPress: () => setShowDetails(!showDetails),
          },
          ...(networkStatus.isOnline && !networkStatus.isSyncing ? [{
            label: 'Sync Now',
            onPress: handleManualSync,
          }] : []),
        ]}
        icon={({ size }) => (
          <View style={styles.iconContainer}>
            <Icon 
              name={getBannerIcon()} 
              size={size} 
              color={!networkStatus.isOnline ? theme.colors.error : theme.colors.primary} 
            />
            {networkStatus.isSyncing && (
              <ActivityIndicator 
                size="small" 
                color={theme.colors.primary}
                style={styles.syncIndicator}
              />
            )}
          </View>
        )}
        style={[
          styles.banner,
          !networkStatus.isOnline && styles.offlineBanner,
          networkStatus.isSyncing && styles.syncingBanner,
        ]}
      >
        <Text style={styles.bannerText}>{getBannerMessage()}</Text>
        
        {showDetails && syncStats && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Sync:</Text>
              <Text style={styles.detailValue}>
                {formatLastSyncTime(syncStats.lastSyncTime)}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[
                styles.detailValue,
                syncStats.syncStatus === 'failed' && styles.errorText,
                syncStats.syncStatus === 'completed' && styles.successText,
              ]}>
                {syncStats.syncStatus}
              </Text>
            </View>
            
            {syncStats.pendingActions > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pending Actions:</Text>
                <Text style={styles.detailValue}>
                  {syncStats.pendingActions}
                </Text>
              </View>
            )}
          </View>
        )}
      </Banner>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  banner: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  offlineBanner: {
    backgroundColor: theme.colors.errorContainer,
  },
  syncingBanner: {
    backgroundColor: theme.colors.primaryContainer,
  },
  bannerText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIndicator: {
    marginLeft: 8,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  errorText: {
    color: theme.colors.error,
  },
  successText: {
    color: theme.colors.primary,
  },
});

export default OfflineIndicator;
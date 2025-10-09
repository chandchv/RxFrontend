import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, ProgressBar, Chip } from 'react-native-paper';
import dataCachingService from '../../services/dataCachingService';
import imageCachingService from '../../services/imageCachingService';
import apiOptimizationService from '../../services/apiOptimizationService';
import offlineStorageService from '../../services/offlineStorageService';
import theme from '../../styles/theme';

/**
 * Performance Monitor Component
 * Displays performance metrics and cache statistics for debugging and optimization
 */
const PerformanceMonitor = ({ visible = false }) => {
  const [cacheStats, setCacheStats] = useState(null);
  const [imageStats, setImageStats] = useState(null);
  const [apiStats, setApiStats] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPerformanceStats();
      
      // Refresh stats every 5 seconds when visible
      const interval = setInterval(loadPerformanceStats, 5000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  const loadPerformanceStats = async () => {
    setRefreshing(true);
    
    try {
      const [cache, image, api, storage] = await Promise.all([
        dataCachingService.getCacheStats(),
        imageCachingService.getImageCacheStats(),
        apiOptimizationService.getOptimizationStats(),
        offlineStorageService.getStorageStats(),
      ]);
      
      setCacheStats(cache);
      setImageStats(image);
      setApiStats(api);
      setStorageStats(storage);
    } catch (error) {
      console.error('Error loading performance stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getPerformanceColor = (value, thresholds = { good: 0.8, warning: 0.5 }) => {
    if (value >= thresholds.good) return theme.colors.primary;
    if (value >= thresholds.warning) return theme.colors.tertiary;
    return theme.colors.error;
  };

  if (!visible) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Title style={styles.title}>Performance Monitor</Title>
      
      {refreshing && (
        <ProgressBar indeterminate color={theme.colors.primary} style={styles.refreshIndicator} />
      )}

      {/* Data Cache Statistics */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Data Cache</Title>
          
          {cacheStats ? (
            <View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Size:</Text>
                <Text style={styles.statValue}>
                  {formatBytes(cacheStats.storage?.totalSize)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Keys:</Text>
                <Text style={styles.statValue}>
                  {cacheStats.storage?.totalKeys || 0}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Prefetch Queue:</Text>
                <Text style={styles.statValue}>
                  {cacheStats.prefetchQueueSize}
                </Text>
              </View>
              
              {cacheStats.isOptimizing && (
                <Chip icon="sync" style={styles.statusChip}>
                  Optimizing Cache
                </Chip>
              )}
              
              <Text style={styles.sectionTitle}>Hit Rates</Text>
              {Object.entries(cacheStats.hitRates || {}).map(([type, rate]) => (
                <View key={type} style={styles.hitRateContainer}>
                  <Text style={styles.hitRateLabel}>{type}:</Text>
                  <View style={styles.hitRateBar}>
                    <ProgressBar
                      progress={rate}
                      color={getPerformanceColor(rate)}
                      style={styles.progressBar}
                    />
                    <Text style={styles.hitRateValue}>
                      {formatPercentage(rate)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Paragraph>Loading cache statistics...</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Image Cache Statistics */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Image Cache</Title>
          
          {imageStats ? (
            <View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Cached Images:</Text>
                <Text style={styles.statValue}>
                  {imageStats.imageCount}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Cache Size:</Text>
                <Text style={styles.statValue}>
                  {formatBytes(imageStats.totalSize)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Max Size:</Text>
                <Text style={styles.statValue}>
                  {formatBytes(imageStats.maxCacheSize)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Download Queue:</Text>
                <Text style={styles.statValue}>
                  {imageStats.queueSize}
                </Text>
              </View>
              
              <Text style={styles.sectionTitle}>Cache Utilization</Text>
              <View style={styles.utilizationContainer}>
                <ProgressBar
                  progress={imageStats.utilizationPercent / 100}
                  color={getPerformanceColor(
                    1 - (imageStats.utilizationPercent / 100),
                    { good: 0.3, warning: 0.7 }
                  )}
                  style={styles.progressBar}
                />
                <Text style={styles.utilizationValue}>
                  {imageStats.utilizationPercent.toFixed(1)}%
                </Text>
              </View>
              
              {imageStats.isProcessingQueue && (
                <Chip icon="download" style={styles.statusChip}>
                  Processing Downloads
                </Chip>
              )}
            </View>
          ) : (
            <Paragraph>Loading image statistics...</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* API Optimization Statistics */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>API Optimization</Title>
          
          {apiStats ? (
            <View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Network Type:</Text>
                <Text style={styles.statValue}>
                  {apiStats.networkInfo?.type || 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Connection:</Text>
                <Chip 
                  icon={apiStats.networkInfo?.isConnected ? 'wifi' : 'wifi-off'}
                  style={[
                    styles.connectionChip,
                    apiStats.networkInfo?.isConnected 
                      ? styles.connectedChip 
                      : styles.disconnectedChip
                  ]}
                >
                  {apiStats.networkInfo?.isConnected ? 'Online' : 'Offline'}
                </Chip>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Active Requests:</Text>
                <Text style={styles.statValue}>
                  {apiStats.activeRequests}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Cached Responses:</Text>
                <Text style={styles.statValue}>
                  {apiStats.cachedResponses}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Max Concurrent:</Text>
                <Text style={styles.statValue}>
                  {apiStats.maxConcurrentRequests}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Request Timeout:</Text>
                <Text style={styles.statValue}>
                  {apiStats.requestTimeout / 1000}s
                </Text>
              </View>
              
              {apiStats.compressionEnabled && (
                <Chip icon="compress" style={styles.statusChip}>
                  Compression Enabled
                </Chip>
              )}
            </View>
          ) : (
            <Paragraph>Loading API statistics...</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Storage Statistics */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Storage Usage</Title>
          
          {storageStats ? (
            <View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Size:</Text>
                <Text style={styles.statValue}>
                  {formatBytes(storageStats.totalSize)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Keys:</Text>
                <Text style={styles.statValue}>
                  {storageStats.totalKeys}
                </Text>
              </View>
              
              <Text style={styles.sectionTitle}>Storage by Category</Text>
              {Object.entries(storageStats.categories || {}).map(([category, size]) => (
                <View key={category} style={styles.categoryContainer}>
                  <Text style={styles.categoryLabel}>{category}:</Text>
                  <Text style={styles.categoryValue}>
                    {formatBytes(size)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Paragraph>Loading storage statistics...</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Performance Recommendations */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Recommendations</Title>
          
          <View style={styles.recommendationsContainer}>
            {cacheStats && Object.values(cacheStats.hitRates || {}).some(rate => rate < 0.5) && (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationText}>
                  • Low cache hit rates detected. Consider adjusting cache TTL settings.
                </Text>
              </View>
            )}
            
            {imageStats && imageStats.utilizationPercent > 90 && (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationText}>
                  • Image cache is nearly full. Consider clearing old images.
                </Text>
              </View>
            )}
            
            {apiStats && apiStats.networkInfo?.type === 'cellular' && (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationText}>
                  • On cellular connection. Data saving optimizations are active.
                </Text>
              </View>
            )}
            
            {storageStats && storageStats.totalSize > 50 * 1024 * 1024 && (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationText}>
                  • Storage usage is high. Consider running cache cleanup.
                </Text>
              </View>
            )}
            
            {(!cacheStats || !imageStats || !apiStats || !storageStats) && (
              <View style={styles.recommendation}>
                <Text style={styles.recommendationText}>
                  • Performance monitoring is active. All systems operational.
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.onBackground,
  },
  refreshIndicator: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  hitRateContainer: {
    marginBottom: 8,
  },
  hitRateLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  hitRateBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    marginRight: 8,
  },
  hitRateValue: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurface,
    minWidth: 40,
    textAlign: 'right',
  },
  utilizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  utilizationValue: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: theme.colors.primaryContainer,
  },
  connectionChip: {
    alignSelf: 'flex-start',
  },
  connectedChip: {
    backgroundColor: theme.colors.primaryContainer,
  },
  disconnectedChip: {
    backgroundColor: theme.colors.errorContainer,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  categoryValue: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendation: {
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 16,
  },
});

export default PerformanceMonitor;
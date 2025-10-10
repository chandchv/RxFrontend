/**
 * Debug Screen Component
 * 
 * A comprehensive debug screen that can be accessed from anywhere in the app
 * to view logs, network status, and app state
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { 
  getLogEntries, 
  clearLogs, 
  exportLogs, 
  configureDebug,
  DEBUG_LEVELS 
} from '../utils/debugUtils';

const { width, height } = Dimensions.get('window');

const DebugScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [debugConfig, setDebugConfig] = useState({
    enabled: true,
    showAlerts: false,
    maxLogEntries: 1000
  });

  const loadLogs = () => {
    const allLogs = getLogEntries();
    setLogs(allLogs);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
    setRefreshing(false);
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    return log.level === filter;
  });

  const clearAllLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearLogs();
            loadLogs();
          }
        }
      ]
    );
  };

  const shareLogs = async () => {
    try {
      const logText = exportLogs();
      Alert.alert(
        'Debug Logs',
        'Logs exported successfully. Copy from console or use debug tools.',
        [
          { text: 'OK' },
          { 
            text: 'Copy to Clipboard', 
            onPress: () => {
              // For now, just show the logs in an alert
              Alert.alert('Debug Logs', logText.substring(0, 1000) + (logText.length > 1000 ? '...' : ''));
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const toggleDebugConfig = (key) => {
    const newConfig = { ...debugConfig, [key]: !debugConfig[key] };
    setDebugConfig(newConfig);
    configureDebug(newConfig);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case DEBUG_LEVELS.ERROR: return '#ff4444';
      case DEBUG_LEVELS.WARN: return '#ff8800';
      case DEBUG_LEVELS.INFO: return '#2196F3';
      case DEBUG_LEVELS.DEBUG: return '#4CAF50';
      case DEBUG_LEVELS.TRACE: return '#9C27B0';
      default: return '#666';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debug Console</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
            <Icon name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareLogs} style={styles.headerButton}>
            <Icon name="share" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.filterContainer}>
          <Text style={styles.sectionTitle}>Filter:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['ALL', ...Object.values(DEBUG_LEVELS)].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.filterButton,
                  filter === level && styles.filterButtonActive
                ]}
                onPress={() => setFilter(level)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filter === level && styles.filterButtonTextActive
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={clearAllLogs} style={styles.actionButton}>
            <Icon name="clear-all" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Debug Config */}
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Debug Settings:</Text>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Enable Debug:</Text>
          <TouchableOpacity
            style={[styles.toggle, debugConfig.enabled && styles.toggleActive]}
            onPress={() => toggleDebugConfig('enabled')}
          >
            <Text style={styles.toggleText}>{debugConfig.enabled ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Show Alerts:</Text>
          <TouchableOpacity
            style={[styles.toggle, debugConfig.showAlerts && styles.toggleActive]}
            onPress={() => toggleDebugConfig('showAlerts')}
          >
            <Text style={styles.toggleText}>{debugConfig.showAlerts ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logs */}
      <View style={styles.logsContainer}>
        <View style={styles.logsHeader}>
          <Text style={styles.sectionTitle}>
            Logs ({filteredLogs.length}/{logs.length})
          </Text>
        </View>
        
        <ScrollView
          style={styles.logsScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="info" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No logs to display</Text>
            </View>
          ) : (
            filteredLogs.map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <View style={styles.logHeader}>
                  <View style={styles.logMeta}>
                    <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>
                      {log.level}
                    </Text>
                    <Text style={styles.logTime}>
                      {formatTimestamp(log.timestamp)}
                    </Text>
                    {log.component && (
                      <Text style={styles.logComponent}>
                        {log.component}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.logMessage}>{log.message}</Text>
                {log.data && (
                  <Text style={styles.logData}>
                    {JSON.stringify(log.data, null, 2)}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 16,
  },
  controls: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContainer: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  configSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  configLabel: {
    fontSize: 14,
    color: '#333',
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 12,
    color: '#666',
  },
  logsContainer: {
    flex: 1,
  },
  logsHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logsScroll: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  logEntry: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logHeader: {
    marginBottom: 4,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  logTime: {
    fontSize: 11,
    color: '#666',
    marginRight: 8,
  },
  logComponent: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  logMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  logData: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
});

export default DebugScreen;

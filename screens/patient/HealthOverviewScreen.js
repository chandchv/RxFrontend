import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const HealthOverviewScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState({});
  const [vitals, setVitals] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/users/api/patient/health-overview/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setHealthData(data);
      setVitals(data.vitals || []);
      setRecentActivities(data.recent_activities || []);

    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderVitalCard = (title, value, unit, icon, color) => (
    <View style={[styles.vitalCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.vitalHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.vitalTitle}>{title}</Text>
      </View>
      <Text style={[styles.vitalValue, { color }]}>{value}</Text>
      <Text style={styles.vitalUnit}>{unit}</Text>
    </View>
  );

  const renderActivityItem = (activity) => (
    <View key={activity.id} style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: activity.color || '#2196F3' }]}>
        <Icon name={activity.icon || 'info'} size={20} color="#fff" />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityDescription}>{activity.description}</Text>
        <Text style={styles.activityDate}>{activity.date}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading health overview...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Health Score Card */}
      <LinearGradient
        colors={['#4CAF50', '#45a049']}
        style={styles.healthScoreCard}
      >
        <View style={styles.healthScoreContent}>
          <Icon name="favorite" size={40} color="#fff" />
          <View style={styles.healthScoreText}>
            <Text style={styles.healthScoreTitle}>Health Score</Text>
            <Text style={styles.healthScoreValue}>{healthData.health_score || 85}</Text>
            <Text style={styles.healthScoreSubtitle}>out of 100</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Vitals Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vital Signs</Text>
        <View style={styles.vitalsContainer}>
          {renderVitalCard('Blood Pressure', '120/80', 'mmHg', 'favorite', '#F44336')}
          {renderVitalCard('Heart Rate', '75', 'bpm', 'favorite', '#FF9800')}
          {renderVitalCard('Temperature', '98.6', '°F', 'thermostat', '#4CAF50')}
          {renderVitalCard('Weight', '70', 'kg', 'fitness-center', '#2196F3')}
        </View>
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        {recentActivities.length > 0 ? (
          recentActivities.map(renderActivityItem)
        ) : (
          <Text style={styles.noDataText}>No recent activities</Text>
        )}
      </View>

      {/* Health Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Tips</Text>
        <View style={styles.tipCard}>
          <Icon name="lightbulb" size={24} color="#FFC107" />
          <Text style={styles.tipText}>
            Remember to take your medications as prescribed and maintain regular exercise.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  healthScoreCard: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  healthScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthScoreText: {
    marginLeft: 15,
  },
  healthScoreTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  healthScoreValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 5,
  },
  healthScoreSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  vitalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vitalCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vitalTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  vitalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vitalUnit: {
    fontSize: 12,
    color: '#666',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  tipText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#856404',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default HealthOverviewScreen;

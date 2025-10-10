/**
 * Notification Statistics Component
 * 
 * This component displays detailed notification statistics and analytics
 * including charts, trends, and breakdowns by type and time period.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../styles/theme';
import pushNotificationManager from '../../services/pushNotificationManager';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

const NotificationStatistics = ({ onClose }) => {
  const { colors, spacing, typography } = useTheme();
  const [statistics, setStatistics] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const stats = await pushNotificationManager.getNotificationStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartConfig = () => ({
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${hexToRgb(colors.text)}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  });

  const getPieChartData = () => {
    if (!statistics?.byType) return [];
    
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    return Object.entries(statistics.byType).map(([type, count], index) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      count,
      color: colors[index % colors.length],
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
  };

  const getBarChartData = () => {
    if (!statistics) return { labels: [], datasets: [{ data: [] }] };
    
    return {
      labels: ['Total', 'Unread', 'Today', 'Week', 'Month'],
      datasets: [{
        data: [
          statistics.total || 0,
          statistics.unread || 0,
          statistics.today || 0,
          statistics.thisWeek || 0,
          statistics.thisMonth || 0,
        ],
      }],
    };
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {['day', 'week', 'month', 'year'].map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            { 
              backgroundColor: timeRange === range ? colors.primary : colors.surface,
              borderColor: colors.border 
            }
          ]}
          onPress={() => setTimeRange(range)}
        >
          <Text style={[
            styles.timeRangeText,
            { 
              color: timeRange === range ? colors.onPrimary : colors.text 
            },
            typography.button
          ]}>
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewCards = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.overviewRow}>
        <StatCard
          title="Total Notifications"
          value={statistics?.total || 0}
          icon="notifications"
          color={colors.primary}
          backgroundColor={colors.primaryLight}
        />
        <StatCard
          title="Unread"
          value={statistics?.unread || 0}
          icon="notifications-active"
          color={colors.warning}
          backgroundColor={colors.warningLight}
        />
      </View>
      <View style={styles.overviewRow}>
        <StatCard
          title="Today"
          value={statistics?.today || 0}
          icon="today"
          color={colors.success}
          backgroundColor={colors.successLight}
        />
        <StatCard
          title="This Week"
          value={statistics?.thisWeek || 0}
          icon="date-range"
          color={colors.info}
          backgroundColor={colors.infoLight}
        />
      </View>
    </View>
  );

  const renderCharts = () => (
    <View style={styles.chartsContainer}>
      {/* Bar Chart */}
      <View style={[styles.chartSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.chartTitle, { color: colors.text }, typography.h6]}>
          Notification Overview
        </Text>
        <BarChart
          data={getBarChartData()}
          width={chartWidth}
          height={220}
          chartConfig={getChartConfig()}
          style={styles.chart}
          showValuesOnTopOfBars
          fromZero
        />
      </View>

      {/* Pie Chart */}
      {statistics?.byType && Object.keys(statistics.byType).length > 0 && (
        <View style={[styles.chartSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.text }, typography.h6]}>
            Notifications by Type
          </Text>
          <PieChart
            data={getPieChartData()}
            width={chartWidth}
            height={220}
            chartConfig={getChartConfig()}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </View>
      )}
    </View>
  );

  const renderInsights = () => {
    if (!statistics) return null;

    const insights = [];
    
    if (statistics.unread > 0) {
      insights.push({
        icon: 'notifications-active',
        text: `You have ${statistics.unread} unread notifications`,
        color: colors.warning,
      });
    }

    if (statistics.today > statistics.thisWeek / 7) {
      insights.push({
        icon: 'trending-up',
        text: 'You received more notifications today than average',
        color: colors.info,
      });
    }

    const mostCommonType = Object.entries(statistics.byType || {})
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonType) {
      insights.push({
        icon: 'bar-chart',
        text: `Most notifications are ${mostCommonType[0].replace('_', ' ')} related`,
        color: colors.success,
      });
    }

    return (
      <View style={[styles.insightsSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }, typography.h6]}>
          Insights
        </Text>
        {insights.map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <MaterialIcons name={insight.icon} size={20} color={insight.color} />
            <Text style={[styles.insightText, { color: colors.text }, typography.body2]}>
              {insight.text}
            </Text>
          </View>
        ))}
        {insights.length === 0 && (
          <Text style={[styles.noInsightsText, { color: colors.textSecondary }, typography.body2]}>
            No insights available yet. Check back after receiving more notifications.
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <MaterialIcons name="bar-chart" size={48} color={colors.textSecondary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }, typography.body1]}>
          Loading statistics...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderTimeRangeSelector()}
      {renderOverviewCards()}
      {renderCharts()}
      {renderInsights()}
    </ScrollView>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, backgroundColor }) => (
  <View style={[styles.statCard, { backgroundColor }]}>
    <MaterialIcons name={icon} size={24} color={color} />
    <Text style={[styles.statValue, { color }]}>
      {value}
    </Text>
    <Text style={[styles.statTitle, { color }]}>
      {title}
    </Text>
  </View>
);

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
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
  timeRangeContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  timeRangeText: {
    fontSize: 12,
  },
  overviewContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
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
    fontWeight: '500',
  },
  chartsContainer: {
    paddingHorizontal: 16,
  },
  chartSection: {
    marginBottom: 24,
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  insightsSection: {
    margin: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightText: {
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  noInsightsText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NotificationStatistics;
/**
 * ChartWidget Component
 * Mobile-optimized chart display widget for dashboard
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - (spacing.md * 4); // Account for card margins and padding

const ChartWidget = ({
  title,
  subtitle,
  data,
  chartType = 'line', // 'line', 'bar', 'pie'
  icon,
  iconColor,
  loading = false,
  error = false,
  onPress,
  style,
  chartConfig: customChartConfig,
  ...props
}) => {
  const theme = useTheme();

  const defaultChartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Primary color
    labelColor: (opacity = 1) => theme.colors.onSurface,
    style: {
      borderRadius: borderRadius.md,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.outline,
      strokeWidth: 1,
    },
  };

  const chartConfig = { ...defaultChartConfig, ...customChartConfig };

  const renderChart = () => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return (
        <View style={styles.noDataContainer}>
          <Icon name="insert-chart" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            No data available
          </Text>
        </View>
      );
    }

    const chartHeight = 180;

    switch (chartType) {
      case 'line':
        return (
          <LineChart
            data={data}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            withDots={true}
            withShadow={false}
          />
        );
      
      case 'bar':
        return (
          <BarChart
            data={data}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            showValuesOnTopOfBars={true}
          />
        );
      
      case 'pie':
        return (
          <PieChart
            data={data}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
            absolute
          />
        );
      
      default:
        return (
          <View style={styles.noDataContainer}>
            <Icon name="error-outline" size={48} color={theme.colors.error} />
            <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
              Unsupported chart type
            </Text>
          </View>
        );
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Loading chart...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color={theme.colors.error} />
          <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
            Error loading chart
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.header}>
          {icon && (
            <Icon 
              name={icon} 
              size={24} 
              color={iconColor || theme.colors.primary} 
              style={styles.icon}
            />
          )}
          <View style={styles.titleContainer}>
            <Text 
              variant="titleMedium" 
              style={[styles.title, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle && (
              <Text 
                variant="bodySmall" 
                style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.chartContainer}>
          {renderChart()}
        </View>
      </>
    );
  };

  return (
    <Card 
      style={[styles.card, style]} 
      onPress={onPress}
      mode="contained"
      {...props}
    >
      <Card.Content style={styles.content}>
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
    marginBottom: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    borderRadius: borderRadius.sm,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChartWidget;
/**
 * MetricCard Component
 * Mobile-optimized metric display card for dashboard widgets
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  trend,
  trendDirection,
  onPress,
  loading = false,
  error = false,
  style,
  ...props
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    if (!trend || !trendDirection) return null;
    
    const iconName = trendDirection === 'up' ? 'trending-up' : 
                     trendDirection === 'down' ? 'trending-down' : 
                     'trending-flat';
    
    const color = trendDirection === 'up' ? theme.colors.success :
                  trendDirection === 'down' ? theme.colors.error :
                  theme.colors.onSurfaceVariant;
    
    return (
      <View style={styles.trendContainer}>
        <Icon name={iconName} size={16} color={color} />
        <Text style={[styles.trendText, { color }]}>{trend}</Text>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Loading...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={24} color={theme.colors.error} />
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: spacing.xs }}>
            Error loading data
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
          <Text 
            variant="titleSmall" 
            style={[styles.title, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        
        <View style={styles.valueContainer}>
          <Text 
            variant="headlineMedium" 
            style={[styles.value, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {value}
          </Text>
          {getTrendIcon()}
        </View>
        
        {subtitle && (
          <Text 
            variant="bodySmall" 
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
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
    minHeight: 120,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  content: {
    padding: spacing.md,
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  value: {
    fontWeight: '600',
    flex: 1,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  subtitle: {
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MetricCard;
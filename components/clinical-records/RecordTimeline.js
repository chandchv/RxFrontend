/**
 * RecordTimeline Component
 * Mobile-optimized timeline view for clinical records
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const TimelineItem = ({ item, isFirst, isLast, onPress, theme }) => {
  const getEventIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'created':
        return 'add-circle';
      case 'updated':
        return 'edit';
      case 'processed':
        return 'check-circle';
      case 'shared':
        return 'share';
      case 'downloaded':
        return 'download';
      case 'viewed':
        return 'visibility';
      case 'deleted':
        return 'delete';
      case 'uploaded':
        return 'cloud-upload';
      case 'ocr_completed':
        return 'text-recognition';
      case 'annotation_added':
        return 'note-add';
      default:
        return 'circle';
    }
  };

  const getEventColor = (type, status) => {
    if (status === 'error' || status === 'failed') return theme.colors.error;
    if (status === 'warning' || status === 'pending') return theme.colors.warning;
    if (status === 'success' || status === 'completed') return theme.colors.success;
    
    switch (type?.toLowerCase()) {
      case 'created':
      case 'uploaded':
        return theme.colors.success;
      case 'updated':
      case 'processed':
        return theme.colors.primary;
      case 'shared':
      case 'downloaded':
        return theme.colors.secondary;
      case 'viewed':
        return theme.colors.onSurfaceVariant;
      case 'deleted':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const eventColor = getEventColor(item.type, item.status);

  return (
    <TouchableOpacity
      style={styles.timelineItem}
      onPress={() => onPress && onPress(item)}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Timeline Line */}
      <View style={styles.timelineLineContainer}>
        {!isFirst && (
          <View style={[styles.timelineLineBefore, { backgroundColor: theme.colors.outline }]} />
        )}
        
        <View style={[
          styles.timelineIcon,
          { 
            backgroundColor: eventColor + '20',
            borderColor: eventColor,
          }
        ]}>
          <Icon name={getEventIcon(item.type)} size={16} color={eventColor} />
        </View>
        
        {!isLast && (
          <View style={[styles.timelineLineAfter, { backgroundColor: theme.colors.outline }]} />
        )}
      </View>

      {/* Content */}
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <Text 
            variant="bodyMedium" 
            style={[styles.timelineTitle, { color: theme.colors.onSurface }]}
            numberOfLines={2}
          >
            {item.title || item.description}
          </Text>
          
          <Text 
            variant="labelSmall" 
            style={[styles.timelineTime, { color: theme.colors.onSurfaceVariant }]}
          >
            {formatUtils.formatRelativeTime(item.timestamp)}
          </Text>
        </View>

        {item.description && item.title && (
          <Text 
            variant="bodySmall" 
            style={[styles.timelineDescription, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        )}

        {/* Metadata */}
        <View style={styles.timelineMetadata}>
          {item.user_name && (
            <View style={styles.metadataItem}>
              <Icon name="person" size={12} color={theme.colors.onSurfaceVariant} />
              <Text 
                variant="labelSmall" 
                style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}
              >
                {item.user_name}
              </Text>
            </View>
          )}
          
          {item.location && (
            <View style={styles.metadataItem}>
              <Icon name="location-on" size={12} color={theme.colors.onSurfaceVariant} />
              <Text 
                variant="labelSmall" 
                style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}
              >
                {item.location}
              </Text>
            </View>
          )}
        </View>

        {/* Status and Tags */}
        <View style={styles.timelineTags}>
          {item.status && (
            <Chip
              mode="outlined"
              compact
              style={[
                styles.statusChip,
                { borderColor: eventColor }
              ]}
              textStyle={[
                styles.chipText,
                { color: eventColor }
              ]}
            >
              {item.status}
            </Chip>
          )}
          
          {item.tags && item.tags.map((tag, index) => (
            <Chip
              key={index}
              mode="outlined"
              compact
              style={styles.tagChip}
              textStyle={[
                styles.chipText,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              {tag}
            </Chip>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const RecordTimeline = ({
  title = "Record Timeline",
  events = [],
  onEventPress,
  loading = false,
  error = false,
  emptyMessage = "No timeline events",
  groupByDate = true,
  style,
  ...props
}) => {
  const theme = useTheme();

  const groupEventsByDate = (events) => {
    if (!groupByDate) return { 'All Events': events };
    
    const grouped = {};
    events.forEach(event => {
      const date = formatUtils.formatDate(event.timestamp, 'YYYY-MM-DD');
      const displayDate = formatUtils.formatDate(event.timestamp, 'MMM DD, YYYY');
      
      if (!grouped[displayDate]) {
        grouped[displayDate] = [];
      }
      grouped[displayDate].push(event);
    });
    
    return grouped;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Loading timeline...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={32} color={theme.colors.error} />
          <Text variant="bodyMedium" style={{ color: theme.colors.error, marginTop: spacing.sm }}>
            Error loading timeline
          </Text>
        </View>
      );
    }

    if (events.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="timeline" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            {emptyMessage}
          </Text>
        </View>
      );
    }

    const groupedEvents = groupEventsByDate(events);

    return (
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.timelineContainer}
      >
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <View key={date} style={styles.dateGroup}>
            {groupByDate && (
              <View style={styles.dateHeader}>
                <Text 
                  variant="titleSmall" 
                  style={[styles.dateTitle, { color: theme.colors.primary }]}
                >
                  {date}
                </Text>
                <View style={[styles.dateLine, { backgroundColor: theme.colors.outline }]} />
              </View>
            )}
            
            {dateEvents.map((event, index) => (
              <TimelineItem
                key={event.id || `${date}-${index}`}
                item={event}
                isFirst={index === 0 && !groupByDate}
                isLast={index === dateEvents.length - 1 && !groupByDate}
                onPress={onEventPress}
                theme={theme}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <Card style={[styles.card, style]} mode="contained" {...props}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text 
            variant="titleMedium" 
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
          {events.length > 0 && (
            <Chip
              mode="outlined"
              compact
              style={styles.countChip}
              textStyle={{ color: theme.colors.primary }}
            >
              {events.length} events
            </Chip>
          )}
        </View>
        
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
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  countChip: {
    height: 24,
  },
  timelineContainer: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateTitle: {
    fontWeight: '600',
    marginRight: spacing.md,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLineContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  timelineLineBefore: {
    width: 2,
    height: 20,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  timelineLineAfter: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  timelineTitle: {
    flex: 1,
    fontWeight: '500',
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  timelineTime: {
    fontSize: 11,
    textAlign: 'right',
  },
  timelineDescription: {
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  timelineMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metadataText: {
    marginLeft: spacing.xs,
    fontSize: 11,
  },
  timelineTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    height: 20,
  },
  tagChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    height: 20,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '500',
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
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RecordTimeline;
/**
 * QuickActionButtons Component
 * Mobile-optimized quick action buttons for dashboard
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';

const ActionButton = ({ action, onPress, theme }) => {
  const getActionColor = (type) => {
    switch (type) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const actionColor = getActionColor(action.type);

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: actionColor + '15' }
      ]}
      onPress={() => onPress && onPress(action)}
      activeOpacity={0.7}
      disabled={action.disabled}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: actionColor + '20' }
      ]}>
        <Icon 
          name={action.icon} 
          size={24} 
          color={action.disabled ? theme.colors.disabled : actionColor} 
        />
      </View>
      
      <Text 
        variant="labelMedium" 
        style={[
          styles.actionLabel,
          { 
            color: action.disabled ? theme.colors.disabled : theme.colors.onSurface,
            textAlign: 'center'
          }
        ]}
        numberOfLines={2}
      >
        {action.label}
      </Text>
      
      {action.badge && (
        <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
          <Text 
            variant="labelSmall" 
            style={[styles.badgeText, { color: theme.colors.onError }]}
          >
            {action.badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const QuickActionButtons = ({
  title = "Quick Actions",
  actions = [],
  onActionPress,
  columns = 3,
  showTitle = true,
  loading = false,
  style,
  ...props
}) => {
  const theme = useTheme();

  // Default actions for different user roles
  const getDefaultActions = (userRole) => {
    const defaultActionsByRole = {
      doctor: [
        { id: 'new_appointment', label: 'New Appointment', icon: 'event-note', type: 'primary' },
        { id: 'patient_records', label: 'Patient Records', icon: 'folder-open', type: 'secondary' },
        { id: 'prescriptions', label: 'Prescriptions', icon: 'local-pharmacy', type: 'success' },
        { id: 'lab_orders', label: 'Lab Orders', icon: 'science', type: 'warning' },
        { id: 'clinical_notes', label: 'Clinical Notes', icon: 'note-add', type: 'primary' },
        { id: 'schedule', label: 'My Schedule', icon: 'schedule', type: 'secondary' },
      ],
      patient: [
        { id: 'book_appointment', label: 'Book Appointment', icon: 'event', type: 'primary' },
        { id: 'my_records', label: 'My Records', icon: 'folder', type: 'secondary' },
        { id: 'prescriptions', label: 'Prescriptions', icon: 'local-pharmacy', type: 'success' },
        { id: 'lab_results', label: 'Lab Results', icon: 'assignment', type: 'warning' },
        { id: 'health_summary', label: 'Health Summary', icon: 'favorite', type: 'error' },
        { id: 'messages', label: 'Messages', icon: 'message', type: 'primary' },
      ],
      admin: [
        { id: 'user_management', label: 'Users', icon: 'people', type: 'primary' },
        { id: 'clinic_settings', label: 'Settings', icon: 'settings', type: 'secondary' },
        { id: 'reports', label: 'Reports', icon: 'assessment', type: 'success' },
        { id: 'billing', label: 'Billing', icon: 'receipt', type: 'warning' },
        { id: 'system_health', label: 'System Health', icon: 'monitor-heart', type: 'error' },
        { id: 'backup', label: 'Backup', icon: 'backup', type: 'primary' },
      ],
      staff: [
        { id: 'patient_checkin', label: 'Check-in', icon: 'how-to-reg', type: 'primary' },
        { id: 'appointments', label: 'Appointments', icon: 'event-available', type: 'secondary' },
        { id: 'document_scan', label: 'Scan Documents', icon: 'scanner', type: 'success' },
        { id: 'patient_registration', label: 'Register Patient', icon: 'person-add', type: 'warning' },
        { id: 'insurance_verify', label: 'Verify Insurance', icon: 'verified-user', type: 'error' },
        { id: 'billing_support', label: 'Billing Support', icon: 'support', type: 'primary' },
      ],
    };

    return defaultActionsByRole[userRole] || defaultActionsByRole.patient;
  };

  const displayActions = actions.length > 0 ? actions : getDefaultActions('doctor');

  const renderActionGrid = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Icon name="hourglass-empty" size={32} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
            Loading actions...
          </Text>
        </View>
      );
    }

    const rows = [];
    for (let i = 0; i < displayActions.length; i += columns) {
      const rowActions = displayActions.slice(i, i + columns);
      rows.push(
        <View key={i} style={styles.actionRow}>
          {rowActions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              onPress={onActionPress}
              theme={theme}
            />
          ))}
          {/* Fill empty slots in the last row */}
          {rowActions.length < columns && 
            Array.from({ length: columns - rowActions.length }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.emptySlot} />
            ))
          }
        </View>
      );
    }

    return (
      <ScrollView 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {rows}
      </ScrollView>
    );
  };

  return (
    <Card 
      style={[styles.card, style]} 
      mode="contained"
      {...props}
    >
      <Card.Content style={styles.content}>
        {showTitle && (
          <View style={styles.header}>
            <Text 
              variant="titleMedium" 
              style={[styles.title, { color: theme.colors.onSurface }]}
            >
              {title}
            </Text>
          </View>
        )}
        
        {renderActionGrid()}
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
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    position: 'relative',
    minHeight: 80,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontWeight: '500',
    lineHeight: 16,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptySlot: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default QuickActionButtons;
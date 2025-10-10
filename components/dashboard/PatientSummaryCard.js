/**
 * PatientSummaryCard Component
 * Mobile-optimized patient summary display for dashboard
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, Avatar, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';

const PatientSummaryCard = ({
  patient,
  showActions = true,
  onPress,
  onCallPress,
  onMessagePress,
  onRecordsPress,
  style,
  ...props
}) => {
  const theme = useTheme();

  if (!patient) {
    return (
      <Card style={[styles.card, style]} mode="contained" {...props}>
        <Card.Content style={styles.content}>
          <View style={styles.emptyContainer}>
            <Icon name="person-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}>
              No patient selected
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const getPatientInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2 
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name[0].toUpperCase();
  };

  const getAgeFromBirthDate = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return theme.colors.success;
      case 'inactive':
        return theme.colors.onSurfaceVariant;
      case 'critical':
        return theme.colors.error;
      case 'attention':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  const age = getAgeFromBirthDate(patient.birth_date);
  const statusColor = getStatusColor(patient.status);

  return (
    <Card 
      style={[styles.card, style]} 
      mode="contained"
      {...props}
    >
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <Card.Content style={styles.content}>
          {/* Patient Header */}
          <View style={styles.header}>
            <View style={styles.patientInfo}>
              <Avatar.Text
                size={56}
                label={getPatientInitials(patient.name)}
                style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}
                labelStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}
              />
              
              <View style={styles.patientDetails}>
                <View style={styles.nameRow}>
                  <Text 
                    variant="titleMedium" 
                    style={[styles.patientName, { color: theme.colors.onSurface }]}
                    numberOfLines={1}
                  >
                    {patient.name}
                  </Text>
                  
                  {patient.status && (
                    <Chip
                      mode="outlined"
                      compact
                      style={[
                        styles.statusChip,
                        { borderColor: statusColor }
                      ]}
                      textStyle={[
                        styles.statusText,
                        { color: statusColor }
                      ]}
                    >
                      {patient.status}
                    </Chip>
                  )}
                </View>
                
                <View style={styles.patientMeta}>
                  {age && (
                    <Text 
                      variant="bodySmall" 
                      style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}
                    >
                      {age} years old
                    </Text>
                  )}
                  
                  {patient.gender && (
                    <>
                      <Text style={[styles.separator, { color: theme.colors.onSurfaceVariant }]}>•</Text>
                      <Text 
                        variant="bodySmall" 
                        style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}
                      >
                        {patient.gender}
                      </Text>
                    </>
                  )}
                  
                  {patient.patient_id && (
                    <>
                      <Text style={[styles.separator, { color: theme.colors.onSurfaceVariant }]}>•</Text>
                      <Text 
                        variant="bodySmall" 
                        style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}
                      >
                        ID: {patient.patient_id}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          {(patient.phone || patient.email) && (
            <View style={styles.contactInfo}>
              {patient.phone && (
                <View style={styles.contactItem}>
                  <Icon name="phone" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text 
                    variant="bodySmall" 
                    style={[styles.contactText, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {patient.phone}
                  </Text>
                </View>
              )}
              
              {patient.email && (
                <View style={styles.contactItem}>
                  <Icon name="email" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text 
                    variant="bodySmall" 
                    style={[styles.contactText, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    {patient.email}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Recent Activity */}
          {patient.last_visit && (
            <View style={styles.recentActivity}>
              <Text 
                variant="bodySmall" 
                style={[styles.activityLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                Last visit: {formatUtils.formatDate(patient.last_visit)}
              </Text>
              
              {patient.next_appointment && (
                <Text 
                  variant="bodySmall" 
                  style={[styles.activityLabel, { color: theme.colors.primary }]}
                >
                  Next: {formatUtils.formatDate(patient.next_appointment)}
                </Text>
              )}
            </View>
          )}

          {/* Health Indicators */}
          {patient.health_indicators && patient.health_indicators.length > 0 && (
            <View style={styles.healthIndicators}>
              {patient.health_indicators.slice(0, 3).map((indicator, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  compact
                  style={[
                    styles.indicatorChip,
                    { borderColor: getStatusColor(indicator.status) }
                  ]}
                  textStyle={[
                    styles.indicatorText,
                    { color: getStatusColor(indicator.status) }
                  ]}
                >
                  {indicator.label}
                </Chip>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          {showActions && (
            <View style={styles.actions}>
              {onCallPress && patient.phone && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.success + '15' }]}
                  onPress={() => onCallPress(patient)}
                  activeOpacity={0.7}
                >
                  <Icon name="phone" size={20} color={theme.colors.success} />
                  <Text 
                    variant="labelMedium" 
                    style={[styles.actionText, { color: theme.colors.success }]}
                  >
                    Call
                  </Text>
                </TouchableOpacity>
              )}

              {onMessagePress && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary + '15' }]}
                  onPress={() => onMessagePress(patient)}
                  activeOpacity={0.7}
                >
                  <Icon name="message" size={20} color={theme.colors.primary} />
                  <Text 
                    variant="labelMedium" 
                    style={[styles.actionText, { color: theme.colors.primary }]}
                  >
                    Message
                  </Text>
                </TouchableOpacity>
              )}

              {onRecordsPress && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.colors.secondary + '15' }]}
                  onPress={() => onRecordsPress(patient)}
                  activeOpacity={0.7}
                >
                  <Icon name="folder-open" size={20} color={theme.colors.secondary} />
                  <Text 
                    variant="labelMedium" 
                    style={[styles.actionText, { color: theme.colors.secondary }]}
                  >
                    Records
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card.Content>
      </TouchableOpacity>
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
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    marginRight: spacing.md,
  },
  patientDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  patientName: {
    flex: 1,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
  },
  separator: {
    marginHorizontal: spacing.xs,
    fontSize: 12,
  },
  contactInfo: {
    marginBottom: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  contactText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  recentActivity: {
    marginBottom: spacing.md,
  },
  activityLabel: {
    marginBottom: spacing.xs,
  },
  healthIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  indicatorChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    height: 24,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    flex: 1,
    marginHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PatientSummaryCard;
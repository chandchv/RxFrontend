import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  TouchableOpacity
} from 'react-native';
import {
  Card,
  Button,
  Chip,
  Divider,
  List,
  Avatar,
  IconButton,
  Menu
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { appointmentService } from '../../services/appointmentService';
import { theme } from '../../styles/theme';
import { formatUtils } from '../../utils/formatUtils';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const AppointmentDetailScreen = ({ navigation, route }) => {
  const { appointmentId, appointment: initialAppointment } = route.params;
  
  const [appointment, setAppointment] = useState(initialAppointment || null);
  const [loading, setLoading] = useState(!initialAppointment);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (!initialAppointment) {
      loadAppointmentDetail();
    }
  }, [appointmentId]);

  const loadAppointmentDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await appointmentService.getAppointmentDetail(appointmentId);
      
      if (response.success) {
        setAppointment(response.data);
      } else {
        throw new Error(response.error || 'Failed to load appointment details');
      }
    } catch (err) {
      console.error('Error loading appointment detail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAppointment = () => {
    navigation.navigate('ScheduleAppointment', {
      appointmentId: appointment.id,
      appointment: appointment,
      editMode: true
    });
  };

  const handleCancelAppointment = () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: confirmCancelAppointment
        }
      ]
    );
  };

  const confirmCancelAppointment = async () => {
    try {
      setActionLoading(true);
      
      const response = await appointmentService.cancelAppointment(appointment.id);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Appointment cancelled successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleAppointment = () => {
    navigation.navigate('ScheduleAppointment', {
      appointmentId: appointment.id,
      appointment: appointment,
      rescheduleMode: true
    });
  };

  const handleCallPatient = () => {
    if (appointment.patient?.phone) {
      Linking.openURL(`tel:${appointment.patient.phone}`);
    }
  };

  const handleCallDoctor = () => {
    if (appointment.doctor?.phone) {
      Linking.openURL(`tel:${appointment.doctor.phone}`);
    }
  };

  const handleEmailPatient = () => {
    if (appointment.patient?.email) {
      Linking.openURL(`mailto:${appointment.patient.email}`);
    }
  };

  const handleEmailDoctor = () => {
    if (appointment.doctor?.email) {
      Linking.openURL(`mailto:${appointment.doctor.email}`);
    }
  };

  const handleViewPrescriptions = () => {
    if (appointment.related_prescriptions?.length > 0) {
      navigation.navigate('PrescriptionList', {
        appointmentId: appointment.id,
        patientId: appointment.patient?.id
      });
    }
  };

  const handleViewDocuments = () => {
    if (appointment.related_documents?.length > 0) {
      navigation.navigate('ClinicalRecordsList', {
        appointmentId: appointment.id,
        patientId: appointment.patient?.id
      });
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      scheduled: theme.colors.info,
      in_progress: theme.colors.warning,
      completed: theme.colors.success,
      cancelled: theme.colors.error,
      no_show: theme.colors.error,
      missed: theme.colors.error
    };
    return statusColors[status] || theme.colors.primary;
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      scheduled: 'schedule',
      in_progress: 'hourglass-empty',
      completed: 'check-circle',
      cancelled: 'cancel',
      no_show: 'person-off',
      missed: 'event-busy'
    };
    return statusIcons[status] || 'event';
  };

  const renderAppointmentInfo = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentDateTime}>
            <Text style={styles.dateText}>
              {formatUtils.formatDate(appointment.appointment_date)}
            </Text>
            <Text style={styles.timeText}>
              {formatUtils.formatTime(appointment.appointment_time)}
            </Text>
          </View>
          <Chip
            icon={getStatusIcon(appointment.status)}
            style={[styles.statusChip, { backgroundColor: getStatusColor(appointment.status) + '20' }]}
            textStyle={{ color: getStatusColor(appointment.status) }}
          >
            {appointment.status_display}
          </Chip>
        </View>

        {appointment.reason && (
          <View style={styles.reasonSection}>
            <Text style={styles.sectionTitle}>Reason for Visit</Text>
            <Text style={styles.reasonText}>{appointment.reason}</Text>
          </View>
        )}

        <View style={styles.appointmentFlags}>
          {appointment.is_emergency && (
            <Chip icon="alert" size="small" style={styles.emergencyChip}>
              Emergency
            </Chip>
          )}
          {appointment.is_telemedicine && (
            <Chip icon="video" size="small" style={styles.telemedicineChip}>
              Telemedicine
            </Chip>
          )}
          {appointment.is_walk_in && (
            <Chip icon="walk" size="small" style={styles.walkInChip}>
              Walk-in
            </Chip>
          )}
        </View>

        {appointment.scheduling_info && (
          <View style={styles.schedulingInfo}>
            <Text style={styles.sectionTitle}>Appointment Details</Text>
            {appointment.scheduling_info.appointment_type && (
              <Text style={styles.infoText}>
                Type: {appointment.scheduling_info.appointment_type.name}
              </Text>
            )}
            {appointment.scheduling_info.notes && (
              <Text style={styles.infoText}>
                Notes: {appointment.scheduling_info.notes}
              </Text>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderPatientInfo = () => {
    if (!appointment.patient) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.personHeader}>
            <Avatar.Icon size={48} icon="account" style={styles.avatar} />
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{appointment.patient.name}</Text>
              <Text style={styles.personRole}>Patient</Text>
            </View>
            <View style={styles.contactActions}>
              {appointment.patient.phone && (
                <IconButton
                  icon="phone"
                  size={24}
                  onPress={handleCallPatient}
                  style={styles.contactButton}
                />
              )}
              {appointment.patient.email && (
                <IconButton
                  icon="email"
                  size={24}
                  onPress={handleEmailPatient}
                  style={styles.contactButton}
                />
              )}
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.patientDetails}>
            {appointment.patient.phone && (
              <Text style={styles.detailText}>Phone: {appointment.patient.phone}</Text>
            )}
            {appointment.patient.email && (
              <Text style={styles.detailText}>Email: {appointment.patient.email}</Text>
            )}
            {appointment.patient.date_of_birth && (
              <Text style={styles.detailText}>
                DOB: {formatUtils.formatDate(appointment.patient.date_of_birth)}
              </Text>
            )}
            {appointment.patient.gender && (
              <Text style={styles.detailText}>Gender: {appointment.patient.gender}</Text>
            )}
            {appointment.patient.blood_group && (
              <Text style={styles.detailText}>Blood Group: {appointment.patient.blood_group}</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderDoctorInfo = () => {
    if (!appointment.doctor) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.personHeader}>
            <Avatar.Icon size={48} icon="doctor" style={styles.avatar} />
            <View style={styles.personInfo}>
              <Text style={styles.personName}>Dr. {appointment.doctor.name}</Text>
              <Text style={styles.personRole}>{appointment.doctor.specialization}</Text>
            </View>
            <View style={styles.contactActions}>
              {appointment.doctor.phone && (
                <IconButton
                  icon="phone"
                  size={24}
                  onPress={handleCallDoctor}
                  style={styles.contactButton}
                />
              )}
              {appointment.doctor.email && (
                <IconButton
                  icon="email"
                  size={24}
                  onPress={handleEmailDoctor}
                  style={styles.contactButton}
                />
              )}
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.doctorDetails}>
            {appointment.doctor.phone && (
              <Text style={styles.detailText}>Phone: {appointment.doctor.phone}</Text>
            )}
            {appointment.doctor.email && (
              <Text style={styles.detailText}>Email: {appointment.doctor.email}</Text>
            )}
            {appointment.doctor.qualification && (
              <Text style={styles.detailText}>Qualification: {appointment.doctor.qualification}</Text>
            )}
            {appointment.doctor.experience_years && (
              <Text style={styles.detailText}>
                Experience: {appointment.doctor.experience_years} years
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderRelatedItems = () => {
    const hasPrescriptions = appointment.related_prescriptions?.length > 0;
    const hasDocuments = appointment.related_documents?.length > 0;

    if (!hasPrescriptions && !hasDocuments) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Related Items</Text>

          {hasPrescriptions && (
            <List.Item
              title="Prescriptions"
              description={`${appointment.related_prescriptions.length} prescription(s)`}
              left={props => <List.Icon {...props} icon="prescription" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleViewPrescriptions}
              style={styles.listItem}
            />
          )}

          {hasDocuments && (
            <List.Item
              title="Clinical Documents"
              description={`${appointment.related_documents.length} document(s)`}
              left={props => <List.Icon {...props} icon="file-document" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleViewDocuments}
              style={styles.listItem}
            />
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      {appointment.can_modify && (
        <Button
          mode="outlined"
          onPress={handleEditAppointment}
          style={styles.actionButton}
          icon="edit"
        >
          Edit
        </Button>
      )}

      {appointment.can_modify && (
        <Button
          mode="outlined"
          onPress={handleRescheduleAppointment}
          style={styles.actionButton}
          icon="calendar-edit"
        >
          Reschedule
        </Button>
      )}

      {appointment.can_cancel && (
        <Button
          mode="outlined"
          onPress={handleCancelAppointment}
          style={[styles.actionButton, styles.cancelButton]}
          textColor={theme.colors.error}
          icon="cancel"
          loading={actionLoading}
          disabled={actionLoading}
        >
          Cancel
        </Button>
      )}
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading appointment details..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={loadAppointmentDetail}
      />
    );
  }

  if (!appointment) {
    return (
      <ErrorMessage
        message="Appointment not found"
        onRetry={() => navigation.goBack()}
        retryText="Go Back"
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderAppointmentInfo()}
      {renderPatientInfo()}
      {renderDoctorInfo()}
      {renderRelatedItems()}
      {renderActionButtons()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appointmentDateTime: {
    flex: 1,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  timeText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  statusChip: {
    marginLeft: 16,
  },
  reasonSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  appointmentFlags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  emergencyChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: theme.colors.errorContainer,
  },
  telemedicineChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: theme.colors.primaryContainer,
  },
  walkInChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: theme.colors.secondaryContainer,
  },
  schedulingInfo: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
  },
  personInfo: {
    flex: 1,
    marginLeft: 16,
  },
  personName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  personRole: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
  },
  contactButton: {
    margin: 0,
  },
  divider: {
    marginBottom: 16,
  },
  patientDetails: {
    gap: 8,
  },
  doctorDetails: {
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  listItem: {
    paddingHorizontal: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
  cancelButton: {
    borderColor: theme.colors.error,
  },
});

export default AppointmentDetailScreen;
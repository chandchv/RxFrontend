import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPatientPrescriptions } from '../../api/pharmacy';
import { useNavigation } from '@react-navigation/native';
import { Card } from 'react-native-paper';
import { useTheme, ThemeProvider, themeStyles } from '../../contexts/ThemeContext';

const PharmacyHomeScreen = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { colors, theme, toggleTheme } = useTheme();

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const data = await getPatientPrescriptions();
      setPrescriptions(data);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions();
  };

  const handlePrescriptionPress = (prescription) => {
    navigation.navigate('PrescriptionDetails', { prescriptionId: prescription.id });
  };

  const renderPrescriptionItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity onPress={() => handlePrescriptionPress(item)}>
        <Card style={[styles.card, { backgroundColor: colors.cardBackground }]} elevation={2}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={[styles.prescriptionTitle, { color: colors.text }]}>
                Prescription #{item.id}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.background }]}>
                <Text style={[styles.statusText, { color: statusColor.text }]}>
                  {formatStatus(item.status)}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.doctorName, { color: colors.secondaryText }]}>
              Dr. {item.doctor.name}
            </Text>
            
            <Text style={[styles.dateText, { color: colors.secondaryText }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            
            <View style={styles.medicationInfo}>
              <Ionicons name="medkit-outline" size={18} color={colors.primary} />
              <Text style={[styles.medicationCount, { color: colors.text }]}>
                {item.prescription_drugs?.length || 0} medication(s)
              </Text>
            </View>
            
            {item.status === 'fully_dispensed' && (
              <View style={styles.deliveryInfo}>
                <Ionicons name="checkmark-circle" size={18} color="green" />
                <Text style={[styles.deliveryText, { color: colors.success }]}>
                  Fully dispensed
                </Text>
              </View>
            )}

            {item.status === 'expired' && (
              <View style={styles.deliveryInfo}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={[styles.deliveryText, { color: colors.error }]}>
                  Expired
                </Text>
              </View>
            )}
          </Card.Content>
          <Card.Actions style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handlePrescriptionPress(item)}
            >
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
          </Card.Actions>
        </Card>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return { background: '#e3f2fd', text: '#1976d2' };
      case 'processing':
        return { background: '#fff9c4', text: '#ffa000' };
      case 'partially_dispensed':
        return { background: '#e8f5e9', text: '#388e3c' };
      case 'fully_dispensed':
        return { background: '#e8f5e9', text: '#388e3c' };
      case 'cancelled':
        return { background: '#ffebee', text: '#d32f2f' };
      case 'expired':
        return { background: '#ffebee', text: '#d32f2f' };
      default:
        return { background: '#f5f5f5', text: '#757575' };
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'processing':
        return 'Processing';
      case 'partially_dispensed':
        return 'Partially Dispensed';
      case 'fully_dispensed':
        return 'Fully Dispensed';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading prescriptions...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Prescriptions</Text>
        <TouchableOpacity 
          style={[styles.findPharmacyButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('PharmaciesList')}
        >
          <Text style={styles.findPharmacyButtonText}>Find Pharmacy</Text>
        </TouchableOpacity>
      </View>
      
      {prescriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../../assets/empty-prescription.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            You don't have any prescriptions yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondaryText }]}>
            Your prescriptions will appear here after a doctor consultation
          </Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          renderItem={renderPrescriptionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  findPharmacyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  findPharmacyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prescriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  doctorName: {
    fontSize: 14,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    marginBottom: 8,
  },
  medicationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  medicationCount: {
    fontSize: 14,
    marginLeft: 8,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deliveryText: {
    fontSize: 14,
    marginLeft: 8,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PharmacyHomeScreen; 
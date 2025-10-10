import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { 
  BranchStyles, 
  Colors, 
  getBranchTypeColor, 
  getBranchTypeBgColor, 
  getBranchTypeIcon, 
  getBranchTypeLabel 
} from '../styles/BranchDesignSystem';

const BranchSelector = ({ 
  visible, 
  clinics, 
  selectedClinics, 
  onSelectionChange, 
  onClose 
}) => {
  const [searchText, setSearchText] = useState('');

  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (clinic.branch_code && clinic.branch_code.toLowerCase().includes(searchText.toLowerCase()))
  );

  const toggleClinic = (clinicId) => {
    const newSelection = selectedClinics.includes(clinicId)
      ? selectedClinics.filter(id => id !== clinicId)
      : [...selectedClinics, clinicId];
    
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(filteredClinics.map(clinic => clinic.id));
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  // Use design system functions instead of local ones

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Branches</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinics..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={selectAll} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={selectNone} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Select None</Text>
          </TouchableOpacity>
          <View style={styles.selectedCount}>
            <Text style={styles.selectedCountText}>
              {selectedClinics.length} selected
            </Text>
          </View>
        </View>

        <ScrollView style={styles.clinicsList}>
          {filteredClinics.map(clinic => {
            const isSelected = selectedClinics.includes(clinic.id);
            return (
              <TouchableOpacity
                key={clinic.id}
                style={[styles.clinicItem, isSelected && styles.selectedClinic]}
                onPress={() => toggleClinic(clinic.id)}
              >
                <View style={styles.clinicInfo}>
                  <View style={styles.clinicHeader}>
                    <Icon
                      name={getClinicTypeIcon(clinic.clinic_type)}
                      size={20}
                      color={getClinicTypeColor(clinic.clinic_type)}
                      style={styles.clinicTypeIcon}
                    />
                    <Text style={styles.clinicName}>{clinic.name}</Text>
                  </View>
                  
                  <View style={styles.clinicDetails}>
                    <Text style={styles.clinicCode}>
                      Code: {clinic.branch_code || 'N/A'}
                    </Text>
                    <Text style={styles.clinicType}>
                      {clinic.clinic_type.charAt(0).toUpperCase() + clinic.clinic_type.slice(1)}
                    </Text>
                  </View>

                  {clinic.organization && (
                    <Text style={styles.organizationName}>
                      Org: {clinic.organization.name}
                    </Text>
                  )}

                  {clinic.parent && (
                    <Text style={styles.parentName}>
                      Parent: {clinic.parent.name}
                    </Text>
                  )}
                </View>

                <View style={styles.checkboxContainer}>
                  <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
                    {isSelected && (
                      <Icon name="check" size={16} color="#fff" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.applyButton, selectedClinics.length === 0 && styles.disabledButton]}
            onPress={onClose}
            disabled={selectedClinics.length === 0}
          >
            <Text style={[
              styles.applyButtonText,
              selectedClinics.length === 0 && styles.disabledButtonText
            ]}>
              Apply Selection ({selectedClinics.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Use design system styles
const styles = StyleSheet.create({
  ...BranchStyles,
  
  // Modal-specific overrides
  container: {
    ...BranchStyles.modal,
  },
  header: {
    ...BranchStyles.modalHeader,
  },
  closeButton: {
    ...BranchStyles.modalCloseButton,
  },
  title: {
    ...BranchStyles.modalTitle,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    ...BranchStyles.searchContainer,
    margin: 16,
  },
  searchIcon: {
    ...BranchStyles.searchIcon,
  },
  searchInput: {
    ...BranchStyles.searchInput,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    ...BranchStyles.button,
    ...BranchStyles.buttonOutline,
    ...BranchStyles.buttonSmall,
    marginRight: 12,
  },
  actionButtonText: {
    ...BranchStyles.buttonText,
    ...BranchStyles.buttonTextOutline,
    color: Colors.primary,
  },
  selectedCount: {
    flex: 1,
    alignItems: 'flex-end',
  },
  selectedCountText: {
    ...BranchStyles.caption,
    fontWeight: '500',
  },
  clinicsList: {
    flex: 1,
  },
  clinicItem: {
    ...BranchStyles.listItem,
  },
  selectedClinic: {
    ...BranchStyles.listItemSelected,
  },
  clinicInfo: {
    ...BranchStyles.listItemContent,
  },
  clinicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clinicTypeIcon: {
    marginRight: 8,
  },
  clinicName: {
    ...BranchStyles.listItemTitle,
  },
  clinicDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clinicCode: {
    ...BranchStyles.caption,
    marginRight: 12,
  },
  clinicType: {
    ...BranchStyles.branchBadge,
    backgroundColor: Colors.gray100,
  },
  clinicTypeText: {
    ...BranchStyles.branchBadgeText,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  organizationName: {
    fontSize: 12,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  parentName: {
    fontSize: 12,
    color: Colors.success,
    fontStyle: 'italic',
  },
  checkboxContainer: {
    ...BranchStyles.listItemAction,
  },
  checkbox: {
    ...BranchStyles.checkbox,
  },
  checkedBox: {
    ...BranchStyles.checkboxChecked,
  },
  footer: {
    ...BranchStyles.modalFooter,
  },
  applyButton: {
    ...BranchStyles.button,
    ...BranchStyles.buttonPrimary,
    ...BranchStyles.buttonLarge,
  },
  disabledButton: {
    backgroundColor: Colors.gray300,
  },
  applyButtonText: {
    ...BranchStyles.buttonText,
    fontSize: 16,
  },
  disabledButtonText: {
    color: Colors.gray500,
  },
});

export default BranchSelector;
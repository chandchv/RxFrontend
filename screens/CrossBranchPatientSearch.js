import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import CrossBranchPatientSearch from '../components/CrossBranchPatientSearch';

const CrossBranchPatientSearchScreen = ({ navigation }) => {
  const handlePatientSelect = (patient) => {
    navigation.navigate('CrossBranchPatientDetails', { 
      patientId: patient.id 
    });
  };

  return (
    <View style={styles.container}>
      <CrossBranchPatientSearch
        onPatientSelect={handlePatientSelect}
        navigation={navigation}
        showBranchFilter={true}
        maxResults={20}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CrossBranchPatientSearchScreen;
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import HamburgerMenu from './HamburgerMenu';

const CustomHeader = ({ 
  title, 
  subtitle, 
  navigation, 
  currentScreen,
  rightComponent,
  backgroundColor = '#ffffff',
  titleColor = '#1f2937',
  subtitleColor = '#6b7280'
}) => {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <HamburgerMenu navigation={navigation} currentScreen={currentScreen} />
          </View>
          
          <View style={styles.centerSection}>
            <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
            )}
          </View>
          
          <View style={styles.rightSection}>
            {rightComponent || <View style={styles.placeholder} />}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
});

export default CustomHeader; 
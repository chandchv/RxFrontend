import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

const HamburgerMenu = ({ navigation, currentScreen = 'Dashboard' }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const { user, logout } = useAuth();

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'dashboard',
      screen: 'Dashboard',
      description: 'Overview and quick actions'
    },
    {
      id: 'appointments',
      title: 'Appointments',
      icon: 'event',
      screen: 'Appointments',
      description: 'Manage appointments'
    },
    {
      id: 'patients',
      title: 'Patients',
      icon: 'people',
      screen: 'Patients',
      description: 'Patient management'
    },
    {
      id: 'calendar',
      title: 'Calendar',
      icon: 'calendar-today',
      screen: 'Calendar',
      description: 'Calendar view'
    },
    {
      id: 'profile',
      title: 'Profile',
      icon: 'person',
      screen: 'Profile',
      description: 'Doctor profile settings'
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings',
      screen: 'Settings',
      description: 'App preferences'
    },
  ];

  const handleMenuPress = () => {
    setIsMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setIsMenuVisible(false);
  };

  const handleNavigate = (screen) => {
    setIsMenuVisible(false);
    if (screen !== currentScreen) {
      navigation.navigate(screen);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsMenuVisible(false);
            await logout();
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Hamburger Button */}
      <Pressable style={styles.hamburgerButton} onPress={handleMenuPress}>
        <Icon name="menu" size={24} color="#374151" />
      </Pressable>

      {/* Menu Modal */}
      <Modal
        visible={isMenuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseMenu}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={handleCloseMenu} />
          
          <View style={styles.menuContainer}>
            <SafeAreaView style={styles.menuContent}>
              {/* Header */}
              <View style={styles.menuHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>
                      {user?.firstName?.charAt(0) || 'D'}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      Dr. {user?.firstName} {user?.lastName}
                    </Text>
                    <Text style={styles.userRole}>
                      {user?.role || 'Doctor'}
                    </Text>
                  </View>
                </View>
                
                <Pressable style={styles.closeButton} onPress={handleCloseMenu}>
                  <Icon name="close" size={24} color="#6b7280" />
                </Pressable>
              </View>

              {/* Menu Items */}
              <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
                {menuItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.menuItem,
                      currentScreen === item.screen && styles.activeMenuItem
                    ]}
                    onPress={() => handleNavigate(item.screen)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[
                        styles.menuItemIcon,
                        currentScreen === item.screen && styles.activeMenuItemIcon
                      ]}>
                        <Icon 
                          name={item.icon} 
                          size={22} 
                          color={currentScreen === item.screen ? '#3b82f6' : '#6b7280'} 
                        />
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={[
                          styles.menuItemTitle,
                          currentScreen === item.screen && styles.activeMenuItemTitle
                        ]}>
                          {item.title}
                        </Text>
                        <Text style={styles.menuItemDescription}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                    
                    {currentScreen === item.screen && (
                      <View style={styles.activeIndicator} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              {/* Footer Actions */}
              <View style={styles.menuFooter}>
                <Pressable style={styles.logoutButton} onPress={handleLogout}>
                  <Icon name="logout" size={20} color="#ef4444" />
                  <Text style={styles.logoutText}>Logout</Text>
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  activeMenuItem: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeMenuItemIcon: {
    backgroundColor: '#dbeafe',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  activeMenuItemTitle: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activeIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
  },
});

export default HamburgerMenu; 
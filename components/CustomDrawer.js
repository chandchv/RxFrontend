import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem
} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const CustomDrawer = (props) => {
  const navigation = useNavigation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      const result = await logout(navigation);
      if (!result.success) {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props}>
        <View style={styles.drawerHeader}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
          />
          <Text style={styles.appName}>RX App</Text>
          {props.user && (
            <Text style={styles.userName}>
              {props.user.first_name} {props.user.last_name}
            </Text>
          )}
        </View>
        
        <View style={styles.drawerContent}>
          <DrawerItemList {...props} />
          <DrawerItem
            label="Logout"
            onPress={handleLogout}
            icon={({ color, size }) => (
              <Icon name="logout" size={size} color={color} />
            )}
          />
        </View>
      </DrawerContentScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#2196F3',
  },
  userName: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  drawerContent: {
    flex: 1,
    paddingTop: 10,
  },
  logoutButton: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f4f4f4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#FF4444',
  },
});

export default CustomDrawer; 
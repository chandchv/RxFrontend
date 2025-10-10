/**
 * Mobile Navigator
 * 
 * Enhanced navigation structure for mobile dashboard and clinical records functionality.
 * This integrates with the existing navigation while adding mobile-specific screens.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

// Import existing screens
import DoctorDashboard from '../screens/doctor/DoctorDashboard';
import PatientDashboard from '../screens/patient/PatientDashboard';
import AdminDashboard from '../screens/admin/ClinicAdminDashboard';
import StaffDashboard from '../screens/staff/StaffDashboard';

// Import new mobile screens
import MobileDashboardScreen from '../screens/mobile/MobileDashboardScreen';
import ClinicalRecordsListScreen from '../screens/clinical-records/ClinicalRecordsListScreen';
import ClinicalRecordDetailScreen from '../screens/clinical-records/ClinicalRecordDetailScreen';
import DocumentViewerScreen from '../screens/clinical-records/DocumentViewerScreen';
import RecordSearchScreen from '../screens/clinical-records/RecordSearchScreen';
import DocumentUploadScreen from '../screens/clinical-records/DocumentUploadScreen';
import NotificationsScreen from '../screens/mobile/NotificationsScreen';
import NotificationSettingsScreen from '../screens/mobile/NotificationSettingsScreen';
import OfflineSyncScreen from '../screens/mobile/OfflineSyncScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Dashboard Stack Navigator
const DashboardStack = () => {
    const { user } = useAuth();

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#2196F3',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="MobileDashboard"
                component={MobileDashboardScreen}
                options={{
                    title: `${user?.role || 'User'} Dashboard`,
                    headerShown: false, // Custom header in component
                }}
            />

            {/* Role-specific dashboard screens */}
            {user?.role === 'DOCTOR' && (
                <Stack.Screen
                    name="DoctorDashboard"
                    component={DoctorDashboard}
                    options={{ title: 'Doctor Dashboard' }}
                />
            )}

            {user?.role === 'PATIENT' && (
                <Stack.Screen
                    name="PatientDashboard"
                    component={PatientDashboard}
                    options={{ title: 'Patient Dashboard' }}
                />
            )}

            {(user?.role === 'ADMIN' || user?.role === 'SUPERUSER') && (
                <Stack.Screen
                    name="AdminDashboard"
                    component={AdminDashboard}
                    options={{ title: 'Admin Dashboard' }}
                />
            )}

            {user?.role === 'STAFF' && (
                <Stack.Screen
                    name="StaffDashboard"
                    component={StaffDashboard}
                    options={{ title: 'Staff Dashboard' }}
                />
            )}
        </Stack.Navigator>
    );
};

// Clinical Records Stack Navigator
const ClinicalRecordsStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#4CAF50',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="ClinicalRecordsList"
                component={ClinicalRecordsListScreen}
                options={{
                    title: 'Clinical Records',
                    headerShown: false, // Custom header in component
                }}
            />

            <Stack.Screen
                name="ClinicalRecordDetail"
                component={ClinicalRecordDetailScreen}
                options={{
                    title: 'Record Details',
                }}
            />

            <Stack.Screen
                name="DocumentViewer"
                component={DocumentViewerScreen}
                options={{
                    title: 'Document Viewer',
                    headerStyle: {
                        backgroundColor: '#000',
                    },
                }}
            />

            <Stack.Screen
                name="RecordSearch"
                component={RecordSearchScreen}
                options={{
                    title: 'Search Records',
                    headerShown: false, // Custom header in component
                }}
            />

            <Stack.Screen
                name="DocumentUpload"
                component={DocumentUploadScreen}
                options={{
                    title: 'Upload Document',
                }}
            />
        </Stack.Navigator>
    );
};

// Notifications Stack Navigator
const NotificationsStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#FF9800',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="NotificationsList"
                component={NotificationsScreen}
                options={{
                    title: 'Notifications',
                    headerShown: false, // Custom header in component
                }}
            />

            <Stack.Screen
                name="NotificationSettings"
                component={NotificationSettingsScreen}
                options={{
                    title: 'Notification Settings',
                }}
            />

            <Stack.Screen
                name="OfflineSync"
                component={OfflineSyncScreen}
                options={{
                    title: 'Offline Sync',
                }}
            />
        </Stack.Navigator>
    );
};

// More Stack Navigator (for additional features)
const MoreStack = () => {
    const { user } = useAuth();

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#9C27B0',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            {/* Import existing screens based on user role */}
            {user?.role === 'DOCTOR' && (
                <>
                    <Stack.Screen name="PatientList" component={require('../screens/doctor/PatientListScreen').default} />
                    <Stack.Screen name="PrescriptionList" component={require('../screens/doctor/PrescriptionListScreen').default} />
                    <Stack.Screen name="Reports" component={require('../screens/doctor/ReportsScreen').default} />
                </>
            )}

            {user?.role === 'PATIENT' && (
                <>
                    <Stack.Screen name="Appointments" component={require('../screens/patient/AppointmentsList').default} />
                    <Stack.Screen name="MedicalHistory" component={require('../screens/patient/MedicalHistory').default} />
                    <Stack.Screen name="Billing" component={require('../screens/patient/PatientBilling').default} />
                </>
            )}

            {(user?.role === 'ADMIN' || user?.role === 'SUPERUSER') && (
                <>
                    <Stack.Screen name="ClinicManagement" component={require('../screens/ClinicManagementScreen').default} />
                    <Stack.Screen name="StaffManagement" component={require('../screens/admin/StaffManagement').default} />
                    <Stack.Screen name="Reports" component={require('../screens/admin/ClinicReports').default} />
                </>
            )}
        </Stack.Navigator>
    );
};

// Main Mobile Tab Navigator
const MobileNavigator = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const { unreadCount } = useNotifications();

    const getTabBarIcon = (routeName, focused, color, size) => {
        let iconName;
        let IconComponent = MaterialIcons;

        switch (routeName) {
            case 'Dashboard':
                iconName = 'dashboard';
                break;
            case 'ClinicalRecords':
                iconName = 'folder-medical';
                IconComponent = MaterialCommunityIcons;
                break;
            case 'Notifications':
                iconName = 'notifications';
                break;
            case 'More':
                iconName = 'more-horiz';
                break;
            default:
                iconName = 'help';
        }

        return <IconComponent name={iconName} size={size} color={color} />;
    };

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) =>
                    getTabBarIcon(route.name, focused, color, size),
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outline,
                    height: 60,
                    paddingBottom: 5,
                    paddingTop: 5,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardStack}
                options={{
                    tabBarLabel: 'Dashboard',
                }}
            />

            <Tab.Screen
                name="ClinicalRecords"
                component={ClinicalRecordsStack}
                options={{
                    tabBarLabel: 'Records',
                }}
            />

            <Tab.Screen
                name="Notifications"
                component={NotificationsStack}
                options={{
                    tabBarLabel: 'Notifications',
                    tabBarBadge: unreadCount > 0 ? unreadCount : null,
                    tabBarBadgeStyle: {
                        backgroundColor: '#F44336',
                        color: '#fff',
                        fontSize: 10,
                        minWidth: 16,
                        height: 16,
                    },
                }}
            />

            <Tab.Screen
                name="More"
                component={MoreStack}
                options={{
                    tabBarLabel: 'More',
                }}
            />
        </Tab.Navigator>
    );
};

export default MobileNavigator;
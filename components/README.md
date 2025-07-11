# Hamburger Menu Components

This directory contains reusable components for implementing a hamburger menu across all screens in the React Native app.

## Components

### HamburgerMenu.js
The main hamburger menu component that provides:
- Hamburger button that opens a slide-out menu
- User profile information in the header
- Navigation menu items with icons and descriptions
- Logout functionality
- Current screen highlighting

### CustomHeader.js
A reusable header component that includes:
- Hamburger menu button on the left
- Centered title and subtitle
- Optional right component (buttons, actions, etc.)
- Consistent styling across all screens

## Usage

### Basic Implementation

```javascript
import CustomHeader from '../components/CustomHeader';

const MyScreen = ({ navigation }) => {
  return (
    <View style={{ flex: 1 }}>
      <CustomHeader 
        title="Screen Title"
        subtitle="Optional subtitle"
        navigation={navigation}
        currentScreen="Dashboard" // or "Appointments", "Patients", "Calendar"
      />
      
      {/* Your screen content */}
    </View>
  );
};
```

### With Right Component

```javascript
import CustomHeader from '../components/CustomHeader';

const MyScreen = ({ navigation }) => {
  const headerRightComponent = (
    <Pressable 
      style={styles.actionButton}
      onPress={() => navigation.navigate('SomeScreen')}
    >
      <Text style={styles.actionButtonText}>Action</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader 
        title="Screen Title"
        subtitle="Optional subtitle"
        navigation={navigation}
        currentScreen="Dashboard"
        rightComponent={headerRightComponent}
      />
      
      {/* Your screen content */}
    </View>
  );
};
```

## Menu Items

The hamburger menu includes the following navigation items:
- **Dashboard**: Main dashboard with overview
- **Appointments**: Appointment management
- **Patients**: Patient management
- **Calendar**: Calendar view
- **Profile**: Doctor profile settings
- **Settings**: App preferences

## Styling

The components use consistent styling with:
- Primary color: `#3b82f6` (blue)
- Background: `#ffffff` (white)
- Text colors: `#1f2937` (dark gray), `#6b7280` (medium gray)
- Shadow and elevation for depth

## Current Screen Detection

The `currentScreen` prop is used to:
- Highlight the active menu item
- Show different colors for the active state
- Display an active indicator

Valid values:
- `"Dashboard"`
- `"Appointments"`
- `"Patients"`
- `"Calendar"`
- `"Profile"`
- `"Settings"`

## Implementation Examples

Check these files for complete implementation examples:
- `../screens/Dashboard.js`
- `../screens/doctor/AppointmentsList.js`
- `../screens/doctor/FullCalendar.js`
- `../screens/doctor/PatientDashboard.js`
- `../screens/doctor/AddPatientScreen.js` 
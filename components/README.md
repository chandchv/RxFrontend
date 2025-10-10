# React Native Components

This directory contains reusable components for the RxDoctor React Native app.

## Navigation Components

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

## Branch Management Components

### BranchSelector.js
A component for selecting and switching between different clinic branches:
- Displays current branch context
- Shows available branches in a modal
- Handles branch switching with proper validation
- Supports creating new branches (when authorized)
- Integrates with the BranchContext for state management

### BranchContextIndicator.js
A compact indicator showing the current branch context:
- Displays current branch name and type
- Shows branch code if available
- Uses color coding for different branch types (parent, branch, independent)
- Optional switch button for quick branch selection

### OrganizationManagement.js
A comprehensive organization management interface:
- Create and manage healthcare organizations
- Link multiple clinics under organizations
- View organization details and statistics
- Manage organization administrators
- Full CRUD operations for organizations

### BranchPermissionsManager.js
A component for managing user permissions across branches:
- View and modify user access to different branches
- Set access levels (full, read-only, emergency)
- Grant or revoke branch access
- Track permission history and audit trail
- Bulk permission management

### BranchHierarchyVisualization.js
A tree-view component for visualizing branch hierarchies:
- Shows parent-child relationships between clinics
- Expandable/collapsible tree structure
- Visual connection lines between branches
- Branch statistics and metadata
- Interactive branch selection

## Other Components

### ClinicSelector.js
Legacy clinic selector component for single-clinic operations

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
## Branc
h Management Usage

### Basic Branch Selector

```javascript
import BranchSelector from '../components/BranchSelector';
import { useBranch } from '../contexts/BranchContext';

const MyScreen = () => {
  const { currentBranch } = useBranch();
  
  const handleBranchChange = (newBranch) => {
    console.log('Switched to:', newBranch.name);
    // Handle branch change logic
  };

  return (
    <View>
      <BranchSelector
        onBranchChange={handleBranchChange}
        showCreateButton={true}
      />
      {/* Rest of your screen */}
    </View>
  );
};
```

### Branch Context Indicator

```javascript
import BranchContextIndicator from '../components/BranchContextIndicator';

const HeaderComponent = () => {
  const handleBranchPress = () => {
    // Open branch selector or navigation
  };

  return (
    <View style={styles.header}>
      <BranchContextIndicator
        onBranchPress={handleBranchPress}
        showSwitchButton={true}
        style={styles.branchIndicator}
      />
    </View>
  );
};
```

### Organization Management

```javascript
import OrganizationManagement from '../components/OrganizationManagement';

const AdminScreen = () => {
  const [showOrgManagement, setShowOrgManagement] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setShowOrgManagement(true)}>
        <Text>Manage Organizations</Text>
      </TouchableOpacity>
      
      <OrganizationManagement
        visible={showOrgManagement}
        onClose={() => setShowOrgManagement(false)}
      />
    </View>
  );
};
```

### Branch Permissions Management

```javascript
import BranchPermissionsManager from '../components/BranchPermissionsManager';

const UserManagementScreen = () => {
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const openUserPermissions = (userId, userName) => {
    setSelectedUser({ id: userId, name: userName });
    setShowPermissions(true);
  };

  return (
    <View>
      {/* User list with permission buttons */}
      
      <BranchPermissionsManager
        visible={showPermissions}
        onClose={() => setShowPermissions(false)}
        userId={selectedUser?.id}
        userName={selectedUser?.name}
      />
    </View>
  );
};
```

### Branch Hierarchy Visualization

```javascript
import BranchHierarchyVisualization from '../components/BranchHierarchyVisualization';
import { useBranch } from '../contexts/BranchContext';

const BranchOverviewScreen = () => {
  const { currentBranch } = useBranch();

  const handleBranchSelect = (branch) => {
    console.log('Selected branch:', branch.name);
    // Handle branch selection
  };

  return (
    <ScrollView>
      {currentBranch && (
        <BranchHierarchyVisualization
          clinicId={currentBranch.id}
          onBranchSelect={handleBranchSelect}
          style={styles.hierarchyContainer}
        />
      )}
    </ScrollView>
  );
};
```

## Branch Context Integration

All branch management components integrate with the `BranchContext` for centralized state management:

```javascript
import { useBranch } from '../contexts/BranchContext';

const MyComponent = () => {
  const {
    currentBranch,
    accessibleBranches,
    switchBranch,
    canAccessMultipleBranches,
    canManageBranches,
    loading,
    switchingBranch
  } = useBranch();

  // Use branch context data and methods
};
```

## Styling Guidelines

Branch management components follow consistent styling:
- Primary colors: Blue (#007AFF), Green (#4CAF50), Orange (#FF9800)
- Background: White (#fff) with light gray (#f8f9fa) sections
- Border radius: 8-12px for cards and modals
- Shadows and elevation for depth
- Consistent spacing using 8px grid system

## Branch Type Color Coding

- **Parent Branch**: Green (#4CAF50) - Main clinic
- **Branch**: Blue (#2196F3) - Sub-branches
- **Independent**: Orange (#FF9800) - Standalone clinics

## Testing

All branch management components include comprehensive tests:
- Unit tests for component rendering and interactions
- Context provider tests for state management
- Integration tests for API interactions
- Error handling and edge case testing
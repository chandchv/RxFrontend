# React Native Debug Guide

This guide provides alternative debugging methods for React Native when DevTools are not available.

## 🚨 **Quick Fix Applied**

The syntax error in `ConsolidatedReportingScreen.js` has been fixed:
- **Issue**: Missing quote in `Text` component
- **Fixed**: Line 306 now correctly reads `<Text style={styles.chartTitle}>Distribution</Text>`

## 🛠️ **Debug Tools Available**

### 1. **Enhanced Console Logging**
```javascript
import { debugError, debugInfo, debugWarn } from '../utils/debugUtils';

// Usage examples
debugError('API call failed', error, 'ComponentName');
debugInfo('User logged in', { userId: 123 }, 'AuthComponent');
debugWarn('Deprecated method used', null, 'LegacyComponent');
```

### 2. **Debug Screen**
Access the debug screen from any navigator:
```javascript
navigation.navigate('DebugScreen');
```

**Features:**
- Real-time log viewing
- Log filtering by level
- Export logs via share
- Debug configuration toggles
- Auto-refresh every 2 seconds

### 3. **Debug Access Component**
Wrap your screens with `DebugAccess` for easy debug access:
```javascript
import DebugAccess from '../components/DebugAccess';

<DebugAccess navigation={navigation}>
  <YourScreen />
</DebugAccess>
```

**Activation Methods:**
- **5 quick taps** in top-left corner (invisible trigger)
- **Long press** in top-left corner
- **Debug button** appears when debug mode is enabled

## 🔍 **Debugging Methods**

### **Method 1: Console Logging (Recommended)**
```javascript
// In your component
import { useDebug } from '../utils/debugUtils';

const MyComponent = () => {
  const debug = useDebug('MyComponent');
  
  useEffect(() => {
    debug.info('Component mounted');
  }, []);
  
  const handlePress = () => {
    debug.debug('Button pressed', { timestamp: Date.now() });
  };
};
```

### **Method 2: Alert Debugging**
```javascript
// Quick debug with alerts
Alert.alert('Debug Info', JSON.stringify(data, null, 2));
```

### **Method 3: Network Debugging**
```javascript
// Monitor API calls
import { logApiRequest } from '../utils/debugUtils';

// In your API service
logApiRequest('GET', '/api/endpoint', null, response, error);
```

### **Method 4: Performance Debugging**
```javascript
// Track performance
import { logPerformance } from '../utils/debugUtils';

const startTime = Date.now();
// ... your code ...
logPerformance('API Call', Date.now() - startTime, { endpoint: '/api/data' });
```

## 📱 **How to Use Debug Tools**

### **Step 1: Enable Debug Mode**
1. Tap the top-left corner of any screen 5 times quickly
2. Or long-press the top-left corner for 1 second
3. You'll see a confirmation alert

### **Step 2: Access Debug Screen**
1. Navigate to any screen with debug access
2. Look for the red debug button (top-right)
3. Or use the navigation: `navigation.navigate('DebugScreen')`

### **Step 3: View Logs**
1. Open the debug screen
2. View real-time logs
3. Filter by log level (ERROR, WARN, INFO, DEBUG, TRACE)
4. Export logs using the share button

### **Step 4: Configure Debug Settings**
In the debug screen, you can:
- Enable/disable debug mode
- Toggle alert notifications
- Clear all logs
- Export logs

## 🐛 **Common Debugging Scenarios**

### **API Issues**
```javascript
// Add to your API calls
try {
  const response = await apiCall();
  debugInfo('API success', response, 'APIComponent');
} catch (error) {
  debugError('API failed', error, 'APIComponent');
}
```

### **Navigation Issues**
```javascript
// Track navigation
import { logNavigation } from '../utils/debugUtils';

logNavigation('HomeScreen', 'DetailScreen', { id: 123 });
```

### **State Issues**
```javascript
// Monitor state changes
useEffect(() => {
  debug.debug('State changed', { newState: state }, 'MyComponent');
}, [state]);
```

### **Performance Issues**
```javascript
// Track slow operations
const startTime = Date.now();
// ... slow operation ...
logPerformance('Slow Operation', Date.now() - startTime);
```

## 🔧 **Advanced Debugging**

### **Custom Debug Hooks**
```javascript
// Create custom debug hooks
const useApiDebug = (componentName) => {
  const debug = useDebug(componentName);
  
  const debugApiCall = async (apiFunction, ...args) => {
    const startTime = Date.now();
    try {
      const result = await apiFunction(...args);
      logPerformance(`${componentName} API Call`, Date.now() - startTime);
      debug.info('API call successful', result);
      return result;
    } catch (error) {
      debug.error('API call failed', error);
      throw error;
    }
  };
  
  return { debugApiCall };
};
```

### **Debug Configuration**
```javascript
import { configureDebug } from '../utils/debugUtils';

// Configure debug settings
configureDebug({
  enabled: true,
  showAlerts: false,
  maxLogEntries: 2000
});
```

## 📊 **Debug Screen Features**

### **Log Filtering**
- Filter by log level (ERROR, WARN, INFO, DEBUG, TRACE)
- View log counts
- Real-time updates

### **Log Export**
- Share logs via system share
- Copy logs to clipboard
- Export as text file

### **Debug Controls**
- Clear all logs
- Toggle debug mode
- Configure settings

## 🚀 **Quick Debug Commands**

### **Enable Debug Mode**
```javascript
// In any component
import { configureDebug } from '../utils/debugUtils';
configureDebug({ enabled: true });
```

### **Show Debug Info**
```javascript
// Quick debug info
Alert.alert('Debug', `Component: ${componentName}\nState: ${JSON.stringify(state)}`);
```

### **Track API Calls**
```javascript
// Wrap API calls
const debugApiCall = async (url, options) => {
  debugInfo(`API Call: ${url}`, options);
  const result = await fetch(url, options);
  debugInfo(`API Response: ${url}`, result);
  return result;
};
```

## 🎯 **Best Practices**

1. **Use Component Names**: Always include component names in debug calls
2. **Structured Data**: Pass objects instead of strings for better debugging
3. **Performance Tracking**: Track slow operations
4. **Error Boundaries**: Wrap components with error boundaries
5. **Log Levels**: Use appropriate log levels (ERROR, WARN, INFO, DEBUG)

## 🔍 **Troubleshooting**

### **Debug Screen Not Showing**
- Check if debug mode is enabled
- Verify navigation is properly set up
- Try the tap gesture to enable debug mode

### **Logs Not Appearing**
- Ensure debug is enabled in configuration
- Check log level filters
- Verify component names are correct

### **Performance Issues**
- Monitor log entry count
- Clear logs periodically
- Use appropriate log levels

This debug system provides comprehensive debugging capabilities without relying on React Native DevTools!

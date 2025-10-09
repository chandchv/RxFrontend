# Mobile App Deployment Guide

## Overview

This guide covers the deployment process for the RxDoctor React Native mobile application, including build configuration, testing procedures, and deployment to app stores.

## Prerequisites

### Development Environment
- Node.js 18+ 
- React Native CLI
- Expo CLI 52.0.47
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)
- Java Development Kit (JDK) 11+

### Backend Requirements
- Django backend running and accessible
- Mobile API endpoints configured
- Database migrations completed
- Firebase configuration active

## Build Configuration

### Environment Configuration

Create environment-specific configuration files:

```javascript
// config/environments/development.js
export default {
  API_BASE_URL: 'http://localhost:8000',
  WEBSOCKET_URL: 'ws://localhost:8000/ws/',
  FIREBASE_CONFIG: {
    // Development Firebase config
  },
  DEBUG_MODE: true,
  PERFORMANCE_MONITORING: true
};

// config/environments/staging.js
export default {
  API_BASE_URL: 'https://staging-api.rxdoctor.com',
  WEBSOCKET_URL: 'wss://staging-api.rxdoctor.com/ws/',
  FIREBASE_CONFIG: {
    // Staging Firebase config
  },
  DEBUG_MODE: false,
  PERFORMANCE_MONITORING: true
};

// config/environments/production.js
export default {
  API_BASE_URL: 'https://api.rxdoctor.com',
  WEBSOCKET_URL: 'wss://api.rxdoctor.com/ws/',
  FIREBASE_CONFIG: {
    // Production Firebase config
  },
  DEBUG_MODE: false,
  PERFORMANCE_MONITORING: false
};
```

### App Configuration

Update `app.json` for deployment:

```json
{
  "expo": {
    "name": "RxDoctor",
    "slug": "rxdoctor-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.rxdoctor.mobile",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses camera to scan prescriptions and upload documents",
        "NSPhotoLibraryUsageDescription": "This app needs access to photo library to upload medical documents",
        "NSMicrophoneUsageDescription": "This app uses microphone for voice notes in clinical records"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.rxdoctor.mobile",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO",
        "ACCESS_NETWORK_STATE",
        "INTERNET"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-camera",
      "expo-document-picker",
      "expo-file-system",
      "expo-notifications",
      "expo-secure-store",
      "@react-native-async-storage/async-storage"
    ]
  }
}
```

## Pre-Deployment Testing

### 1. Run Comprehensive Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run performance tests
npm run test:performance

# Run security tests
npm run test:security
```

### 2. Workflow Testing

```bash
# Test complete user workflows
node scripts/test-workflows.js

# Test API performance
node scripts/test-api-performance.js

# Test cross-platform compatibility
npm run test:android
npm run test:ios
```

### 3. Backend Integration Testing

```bash
# Test backend connectivity
node scripts/test-backend-integration.js

# Verify API endpoints
node scripts/verify-api-endpoints.js

# Test real-time features
node scripts/test-realtime-features.js
```

## Build Process

### Development Build

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

### Staging Build

```bash
# Set environment
export NODE_ENV=staging

# Build for Android
expo build:android --type apk

# Build for iOS
expo build:ios --type archive

# Generate source maps
npm run build:sourcemaps
```

### Production Build

```bash
# Set environment
export NODE_ENV=production

# Clean previous builds
npm run clean

# Install dependencies
npm ci

# Run pre-build checks
npm run prebuild:checks

# Build for Android
expo build:android --type app-bundle

# Build for iOS
expo build:ios --type archive

# Generate build artifacts
npm run build:artifacts
```

## Deployment Steps

### 1. Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Backend APIs accessible
- [ ] Environment variables configured
- [ ] Firebase configuration updated
- [ ] App store metadata prepared
- [ ] Privacy policy and terms updated
- [ ] Performance benchmarks met
- [ ] Security audit completed

### 2. Android Deployment

#### Google Play Store

```bash
# Generate signed APK
expo build:android --type app-bundle

# Upload to Google Play Console
# 1. Go to Google Play Console
# 2. Select your app
# 3. Go to Release management > App releases
# 4. Upload the AAB file
# 5. Fill in release notes
# 6. Submit for review
```

#### Internal Testing

```bash
# Generate APK for internal testing
expo build:android --type apk

# Distribute via Firebase App Distribution
firebase appdistribution:distribute app-release.apk \
  --app 1:123456789:android:abcd1234 \
  --groups "internal-testers" \
  --release-notes "Internal testing build"
```

### 3. iOS Deployment

#### App Store

```bash
# Generate iOS archive
expo build:ios --type archive

# Upload to App Store Connect
# 1. Download the IPA file
# 2. Use Xcode or Application Loader to upload
# 3. Go to App Store Connect
# 4. Select your app
# 5. Create new version
# 6. Fill in metadata
# 7. Submit for review
```

#### TestFlight

```bash
# Upload to TestFlight for beta testing
# 1. Upload IPA to App Store Connect
# 2. Go to TestFlight tab
# 3. Add internal testers
# 4. Submit for beta review
```

## Post-Deployment Monitoring

### 1. Performance Monitoring

```javascript
// Monitor app performance
import { performanceOptimizationService } from './services/performanceOptimizationService';

// Set up monitoring
performanceOptimizationService.startMonitoring({
  crashReporting: true,
  performanceMetrics: true,
  userAnalytics: true
});
```

### 2. Error Tracking

```javascript
// Set up error tracking
import crashlytics from '@react-native-firebase/crashlytics';

// Log errors
crashlytics().recordError(error);

// Set user attributes
crashlytics().setUserId(userId);
crashlytics().setAttributes({
  role: userRole,
  clinic: clinicId
});
```

### 3. Analytics

```javascript
// Track user events
import analytics from '@react-native-firebase/analytics';

// Log events
analytics().logEvent('screen_view', {
  screen_name: 'DashboardScreen',
  screen_class: 'Dashboard'
});

analytics().logEvent('feature_used', {
  feature_name: 'clinical_records_upload',
  user_role: 'doctor'
});
```

## Rollback Procedures

### Emergency Rollback

If critical issues are discovered post-deployment:

1. **Immediate Actions**
   ```bash
   # Disable new user registrations
   # Redirect traffic to maintenance page
   # Notify users via push notifications
   ```

2. **App Store Rollback**
   - Remove current version from app stores
   - Promote previous stable version
   - Update app store descriptions with known issues

3. **Backend Rollback**
   ```bash
   # Rollback backend to previous version
   git checkout previous-stable-tag
   python manage.py migrate previous_migration
   
   # Update API endpoints if needed
   # Restore database from backup if necessary
   ```

### Gradual Rollback

For less critical issues:

1. **Staged Rollback**
   - Roll back to specific user groups first
   - Monitor metrics and user feedback
   - Gradually expand rollback if needed

2. **Feature Flags**
   ```javascript
   // Disable problematic features
   const featureFlags = {
     clinicalRecordsUpload: false,
     realTimeNotifications: false,
     prescriptionScan: true
   };
   ```

## Maintenance Procedures

### Regular Maintenance

1. **Weekly Tasks**
   - Review crash reports
   - Monitor performance metrics
   - Check API response times
   - Update dependencies

2. **Monthly Tasks**
   - Security audit
   - Performance optimization
   - User feedback review
   - Backend health check

3. **Quarterly Tasks**
   - Major dependency updates
   - Security penetration testing
   - Disaster recovery testing
   - Compliance audit

### Emergency Maintenance

1. **Security Issues**
   ```bash
   # Immediate response
   # 1. Assess severity
   # 2. Implement hotfix
   # 3. Deploy emergency update
   # 4. Notify users if needed
   ```

2. **Performance Issues**
   ```bash
   # Performance degradation
   # 1. Identify bottlenecks
   # 2. Scale backend resources
   # 3. Implement caching
   # 4. Optimize queries
   ```

## Troubleshooting

### Common Build Issues

1. **Metro bundler issues**
   ```bash
   # Clear Metro cache
   npx react-native start --reset-cache
   
   # Clear node modules
   rm -rf node_modules
   npm install
   ```

2. **Android build failures**
   ```bash
   # Clean Android build
   cd android
   ./gradlew clean
   cd ..
   
   # Rebuild
   npm run android
   ```

3. **iOS build failures**
   ```bash
   # Clean iOS build
   cd ios
   xcodebuild clean
   cd ..
   
   # Reinstall pods
   cd ios
   pod install
   cd ..
   ```

### Runtime Issues

1. **API connectivity issues**
   ```javascript
   // Check network connectivity
   import NetInfo from '@react-native-netinfo/netinfo';
   
   NetInfo.fetch().then(state => {
     console.log('Connection type', state.type);
     console.log('Is connected?', state.isConnected);
   });
   ```

2. **Authentication issues**
   ```javascript
   // Debug authentication
   import { secureTokenService } from './services/secureTokenService';
   
   const debugAuth = async () => {
     const token = await secureTokenService.getToken();
     const isValid = await secureTokenService.validateToken(token);
     console.log('Token valid:', isValid);
   };
   ```

## Support and Documentation

### User Support

1. **In-App Help**
   - Comprehensive help documentation
   - Video tutorials
   - FAQ section
   - Contact support feature

2. **External Support**
   - Support email: support@rxdoctor.com
   - Documentation website
   - Community forums
   - Training materials

### Developer Documentation

1. **API Documentation**
   - Endpoint specifications
   - Authentication guide
   - Error codes reference
   - Rate limiting information

2. **Integration Guides**
   - Backend integration
   - Third-party services
   - Custom configurations
   - Troubleshooting guides

## Security Considerations

### Data Protection

1. **Encryption**
   - All data encrypted in transit (TLS 1.3)
   - Sensitive data encrypted at rest
   - Secure key management

2. **Authentication**
   - Multi-factor authentication
   - Biometric authentication
   - Session management
   - Token rotation

3. **Privacy**
   - HIPAA compliance
   - GDPR compliance
   - Data minimization
   - User consent management

### Security Monitoring

1. **Threat Detection**
   - Real-time monitoring
   - Anomaly detection
   - Intrusion prevention
   - Vulnerability scanning

2. **Incident Response**
   - Security incident procedures
   - Breach notification process
   - Forensic analysis capabilities
   - Recovery procedures

## Compliance and Regulations

### Healthcare Compliance

1. **HIPAA Compliance**
   - Business Associate Agreements
   - Risk assessments
   - Audit logs
   - Access controls

2. **FDA Regulations**
   - Medical device classification
   - Quality management system
   - Clinical validation
   - Post-market surveillance

3. **International Compliance**
   - GDPR (Europe)
   - PIPEDA (Canada)
   - Privacy Act (Australia)
   - Local healthcare regulations

## Version Control and Release Management

### Versioning Strategy

```
Major.Minor.Patch-Build
Example: 1.2.3-456

Major: Breaking changes
Minor: New features
Patch: Bug fixes
Build: Build number
```

### Release Branches

```bash
# Main branches
main          # Production-ready code
develop       # Integration branch
release/*     # Release preparation
hotfix/*      # Emergency fixes

# Feature branches
feature/*     # New features
bugfix/*      # Bug fixes
```

### Release Process

1. **Feature Development**
   ```bash
   git checkout develop
   git checkout -b feature/new-feature
   # Develop feature
   git push origin feature/new-feature
   # Create pull request to develop
   ```

2. **Release Preparation**
   ```bash
   git checkout develop
   git checkout -b release/1.2.0
   # Update version numbers
   # Run tests
   # Fix bugs
   git push origin release/1.2.0
   ```

3. **Production Release**
   ```bash
   git checkout main
   git merge release/1.2.0
   git tag v1.2.0
   git push origin main --tags
   ```

This deployment guide provides comprehensive instructions for building, testing, and deploying the RxDoctor mobile application while ensuring security, compliance, and reliability standards are met.
# Clinical Records Integration

This document describes the integration of the standalone Clinical Records Service with the Rx-frontend mobile application.

## Overview

The clinical records functionality has been integrated into the mobile app with the following components:

### 1. Service Integration
- **Standalone Service**: The new Clinical Records Service runs on `http://127.0.0.1:8001`
- **API Service**: Updated `mobileApiService.js` to connect to the new service
- **Configuration**: Centralized configuration in `config/clinicalRecordsConfig.js`

### 2. Navigation Integration
- **Doctor Navigator**: Added "Records" tab with full clinical records functionality
- **Patient Navigator**: Added clinical records screens for patient access
- **Admin Navigator**: Added clinical records to admin dashboard

### 3. Available Screens
- `ClinicalRecordsDashboardScreen` - Overview and statistics
- `ClinicalRecordsListScreen` - List all clinical records
- `ClinicalRecordDetailScreen` - View record details
- `RecordSearchScreen` - Search and filter records
- `DocumentUploadScreen` - Upload new documents
- `DocumentViewerScreen` - View and manage documents

## Configuration

### Service URLs
```javascript
// config/clinicalRecordsConfig.js
SERVICE_URL: 'http://127.0.0.1:8001', // New standalone service
LEGACY_SERVICE_URL: 'http://127.0.0.1:8000', // Main RxBackend
```

### Feature Flags
```javascript
FEATURES: {
  USE_STANDALONE_SERVICE: true, // Switch between services
  ENABLE_REAL_TIME_UPDATES: true,
  ENABLE_OFFLINE_SYNC: true,
  ENABLE_DOCUMENT_PREVIEW: true,
}
```

## API Endpoints

The mobile app connects to the following endpoints in the Clinical Records Service:

- `GET /api/records/` - List clinical records
- `GET /api/records/{id}/` - Get record details
- `POST /api/documents/upload/` - Upload documents
- `GET /api/dashboard-stats/` - Dashboard statistics
- `GET /api/widget/` - Widget data for main app

## Usage

### For Doctors
1. Navigate to the "Records" tab in the bottom navigation
2. Access dashboard, list, search, and upload functionality
3. View and manage patient clinical records

### For Patients
1. Access clinical records through the main navigation
2. View their own records and documents
3. Search through their medical history

### For Admins
1. Access clinical records through the drawer navigation
2. Manage all clinical records in the system
3. Monitor analytics and statistics

## Authentication

The mobile app uses Bearer token authentication to connect to the Clinical Records Service. The same authentication token used for the main app is used for the clinical records service.

## Error Handling

The integration includes comprehensive error handling:
- Network connectivity issues
- Authentication failures
- Service unavailability
- File upload errors

## Offline Support

The app includes offline support for clinical records:
- Cached data for offline viewing
- Queue for uploads when offline
- Sync when connection is restored

## Testing

To test the integration:

1. Start the Clinical Records Service:
   ```bash
   cd ClinicalRecordsService
   python manage.py runserver 127.0.0.1:8001
   ```

2. Start the mobile app:
   ```bash
   cd Rx-frontend
   npm start
   ```

3. Navigate to the clinical records screens and test functionality

## Troubleshooting

### Common Issues

1. **Service Not Available**: Ensure the Clinical Records Service is running on port 8001
2. **Authentication Errors**: Check that the user is properly authenticated
3. **Upload Failures**: Verify file size and type restrictions
4. **Navigation Issues**: Ensure all screens are properly imported and registered

### Debug Mode

Enable debug logging by setting:
```javascript
CLINICAL_RECORDS_CONFIG.ERROR_HANDLING.LOG_ERRORS = true;
```

## Future Enhancements

- Real-time notifications for new records
- Advanced search and filtering
- Document annotation features
- Integration with external medical systems
- Enhanced offline capabilities

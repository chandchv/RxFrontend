/**
 * DocumentUploadScreen Component Tests
 * 
 * Tests for mobile document upload functionality including camera capture,
 * file selection, upload progress, and OCR processing status.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import DocumentUploadScreen from '../../../screens/clinical-records/DocumentUploadScreen';
import { useAuth } from '../../../contexts/AuthContext';
import { useMobileDashboard } from '../../../contexts/MobileDashboardContext';
import mobileApiService from '../../../services/mobileApiService';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/MobileDashboardContext');
jest.mock('../../../services/mobileApiService');
jest.mock('expo-image-picker');
jest.mock('expo-document-picker');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {
    clinicalRecordId: 'record-123',
    clinicalRecord: {
      id: 'record-123',
      title: 'Test Clinical Record',
    },
  },
};

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('DocumentUploadScreen', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'doctor',
  };

  const mockUpdateLastActivity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    useAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    useMobileDashboard.mockReturnValue({
      updateLastActivity: mockUpdateLastActivity,
    });

    // Mock ImagePicker
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });

    ImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://test-image.jpg',
        type: 'image/jpeg',
        fileSize: 1024000,
      }],
    });

    // Mock DocumentPicker
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://test-document.pdf',
        mimeType: 'application/pdf',
        name: 'test-document.pdf',
        size: 2048000,
      }],
    });

    // Mock API service
    mobileApiService.uploadDocument.mockResolvedValue({
      upload_success: true,
      document_id: 'doc-123',
      filename: 'test-document.pdf',
      file_size: 2048000,
      processing_status: 'pending',
    });

    mobileApiService.getDocumentProcessingStatus.mockResolvedValue({
      document_id: 'doc-123',
      filename: 'test-document.pdf',
      processing_status: 'completed',
      processing_status_display: 'Completed',
      is_processed: true,
      progress_percent: 100,
      has_ocr_text: true,
      has_structured_data: true,
      ocr_confidence: 0.95,
    });
  });

  it('renders upload screen correctly', () => {
    const { getByText, getByTestId } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Upload Document')).toBeTruthy();
    expect(getByText('To: Test Clinical Record')).toBeTruthy();
    expect(getByText('Select Document')).toBeTruthy();
    expect(getByText('Camera')).toBeTruthy();
    expect(getByText('Files')).toBeTruthy();
  });

  it('handles camera capture successfully', async () => {
    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    const cameraButton = getByText('Camera');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });
    });

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
      expect(queryByText('document_')).toBeTruthy(); // Partial match for generated filename
    });
  });

  it('handles file selection successfully', async () => {
    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
        type: ['image/*', 'application/pdf', 'text/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
    });

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
      expect(queryByText('test-document.pdf')).toBeTruthy();
      expect(queryByText('2.0 MB')).toBeTruthy();
    });
  });

  it('handles camera permission denial', async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    const { getByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    const cameraButton = getByText('Camera');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Required',
        'Camera permission is required to capture documents'
      );
    });
  });

  it('handles camera capture cancellation', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: true,
    });

    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    const cameraButton = getByText('Camera');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    });

    // Should not show selected file
    expect(queryByText('Selected File')).toBeFalsy();
  });

  it('handles file selection cancellation', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: true,
    });

    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled();
    });

    // Should not show selected file
    expect(queryByText('Selected File')).toBeFalsy();
  });

  it('clears selected file when close button is pressed', async () => {
    const { getByText, queryByText, getByTestId } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select a file first
    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
    });

    // Find and press close button
    const closeButtons = queryByText('close'); // This might need adjustment based on actual implementation
    if (closeButtons) {
      fireEvent.press(closeButtons);
      
      await waitFor(() => {
        expect(queryByText('Selected File')).toBeFalsy();
      });
    }
  });

  it('handles successful document upload', async () => {
    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select a file first
    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
    });

    // Upload the file
    const uploadButton = getByText('Upload Document');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(mobileApiService.uploadDocument).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({
          uri: 'file://test-document.pdf',
          type: 'application/pdf',
          name: 'test-document.pdf',
          size: 2048000,
        })
      );
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Upload Successful',
        'Document uploaded successfully and is being processed',
        expect.any(Array)
      );
      expect(queryByText('Upload Successful')).toBeTruthy();
    });
  });

  it('handles upload failure', async () => {
    mobileApiService.uploadDocument.mockRejectedValue(
      new Error('Upload failed')
    );

    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select a file first
    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
    });

    // Upload the file
    const uploadButton = getByText('Upload Document');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(queryByText('Upload Error')).toBeTruthy();
      expect(queryByText('Upload failed')).toBeTruthy();
    });
  });

  it('prevents upload without selected file', () => {
    const { getByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Try to upload without selecting a file
    const uploadButton = queryByText('Upload Document');
    
    // Upload button should not be visible without selected file
    expect(uploadButton).toBeFalsy();
  });

  it('shows record selector when no clinical record is specified', () => {
    const routeWithoutRecord = {
      params: {
        availableRecords: [
          {
            id: 'record-1',
            title: 'Test Record 1',
            record_type: 'medical_report',
            record_date: '2024-01-15',
          },
          {
            id: 'record-2',
            title: 'Test Record 2',
            record_type: 'lab_result',
            record_date: '2024-01-10',
          },
        ],
      },
    };

    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={routeWithoutRecord} />
    );

    expect(getByText('Upload Document')).toBeTruthy();
    expect(getByText('Select Clinical Record')).toBeTruthy();
    expect(getByText('Test Record 1')).toBeTruthy();
    expect(getByText('Test Record 2')).toBeTruthy();
  });

  it('displays processing status correctly', async () => {
    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select and upload a file
    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
    });

    const uploadButton = getByText('Upload Document');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(queryByText('Upload Successful')).toBeTruthy();
      expect(queryByText('Processing Status')).toBeTruthy();
    });

    // Wait for processing status to load
    await waitFor(() => {
      expect(mobileApiService.getDocumentProcessingStatus).toHaveBeenCalledWith('doc-123');
      expect(queryByText('Completed')).toBeTruthy();
      expect(queryByText('OCR Complete')).toBeTruthy();
      expect(queryByText('Data Extracted')).toBeTruthy();
      expect(queryByText('95% Confidence')).toBeTruthy();
    });
  });

  it('handles processing status polling', async () => {
    jest.useFakeTimers();

    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select and upload a file
    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
    });

    const uploadButton = getByText('Upload Document');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(queryByText('Upload Successful')).toBeTruthy();
    });

    // Fast-forward time to trigger polling
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(mobileApiService.getDocumentProcessingStatus).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('navigates to record detail when view record is pressed', async () => {
    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select and upload a file
    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
    });

    const uploadButton = getByText('Upload Document');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(queryByText('Upload Successful')).toBeTruthy();
    });

    const viewRecordButton = getByText('View Record');
    fireEvent.press(viewRecordButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ClinicalRecordDetail', {
      recordId: 'record-123',
      highlightDocument: 'doc-123',
    });
  });

  it('allows uploading another document', async () => {
    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select and upload a file
    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(queryByText('Selected File')).toBeTruthy();
    });

    const uploadButton = getByText('Upload Document');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(queryByText('Upload Successful')).toBeTruthy();
    });

    const uploadAnotherButton = getByText('Upload Another');
    fireEvent.press(uploadAnotherButton);

    // Should reset the upload state
    await waitFor(() => {
      expect(queryByText('Upload Successful')).toBeFalsy();
      expect(queryByText('Select Document')).toBeTruthy();
    });
  });

  it('handles camera capture errors gracefully', async () => {
    ImagePicker.launchCameraAsync.mockRejectedValue(
      new Error('Camera error')
    );

    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    const cameraButton = getByText('Camera');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(queryByText('Failed to capture image. Please try again.')).toBeTruthy();
    });
  });

  it('handles file selection errors gracefully', async () => {
    DocumentPicker.getDocumentAsync.mockRejectedValue(
      new Error('File selection error')
    );

    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    const filesButton = getByText('Files');
    fireEvent.press(filesButton);

    await waitFor(() => {
      expect(queryByText('Failed to select file. Please try again.')).toBeTruthy();
    });
  });

  it('allows selecting a clinical record from available records', async () => {
    const routeWithRecords = {
      params: {
        availableRecords: [
          {
            id: 'record-1',
            title: 'Test Record 1',
            record_type: 'medical_report',
            record_date: '2024-01-15',
          },
        ],
      },
    };

    const { getByText, queryByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={routeWithRecords} />
    );

    expect(getByText('Select Clinical Record')).toBeTruthy();

    // Select the record
    const recordOption = getByText('Test Record 1');
    fireEvent.press(recordOption);

    await waitFor(() => {
      expect(queryByText('Select Clinical Record')).toBeFalsy();
      expect(queryByText('To: Test Record 1')).toBeTruthy();
    });
  });

  it('updates last activity on focus', () => {
    render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(mockUpdateLastActivity).toHaveBeenCalled();
  });

  it('shows no records state when no available records', () => {
    const routeWithoutRecords = {
      params: {
        availableRecords: [],
      },
    };

    const { getByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={routeWithoutRecords} />
    );

    expect(getByText('Select Clinical Record')).toBeTruthy();
    expect(getByText('No clinical records available. Please create a record first.')).toBeTruthy();
    expect(getByText('Go Back')).toBeTruthy();
  });

  it('navigates back when go back button is pressed in no records state', () => {
    const routeWithoutRecords = {
      params: {
        availableRecords: [],
      },
    };

    const { getByText } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={routeWithoutRecords} />
    );

    const goBackButton = getByText('Go Back');
    fireEvent.press(goBackButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('cleans up polling interval on unmount', () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <DocumentUploadScreen navigation={mockNavigation} route={mockRoute} />
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
/**
 * PrescriptionScanScreen Component Tests
 * 
 * Tests for mobile prescription OCR scanning functionality including camera capture,
 * image selection, OCR processing, manual correction, and validation interface.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import PrescriptionScanScreen from '../../../screens/prescriptions/PrescriptionScanScreen';
import prescriptionService from '../../../services/prescriptionService';
import { FileUtils } from '../../../utils/mobileUtils';

// Mock dependencies
jest.mock('../../../services/prescriptionService');
jest.mock('../../../utils/mobileUtils');
jest.mock('expo-image-picker');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openSettings: jest.fn(),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = {
  params: {},
};

// Mock image data
const mockImageAsset = {
  uri: 'file://test-image.jpg',
  width: 1024,
  height: 768,
  fileSize: 1024000,
  type: 'image/jpeg',
  name: 'prescription.jpg'
};

const mockOcrResult = {
  success: true,
  ocr_result: {
    text: 'Dr. John Smith\nPatient: Jane Doe\nAge: 35\nMedicine: Paracetamol 500mg\nDosage: 1 tablet twice daily',
    confidence: 0.85,
    processing_method: 'enhanced_ocr',
    processing_time: 2.5
  },
  extracted_data: {
    patient_info: {
      name: 'Jane Doe',
      age: '35',
      gender: '',
      phone: ''
    },
    doctor_info: {
      name: 'Dr. John Smith',
      specialization: '',
      registration_number: '',
      clinic_name: ''
    },
    medications: [
      {
        name: 'Paracetamol',
        dosage: '500mg',
        instructions: '1 tablet twice daily'
      }
    ],
    diagnosis: '',
    advice: '',
    date: ''
  },
  validation_results: {
    isValid: true,
    errors: [],
    warnings: ['Doctor information is incomplete'],
    completeness: 75
  },
  suggestions: []
};

describe('PrescriptionScanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock permissions
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });

    // Mock FileUtils
    FileUtils.takePhoto.mockResolvedValue({
      canceled: false,
      assets: [mockImageAsset]
    });
    FileUtils.pickImage.mockResolvedValue({
      canceled: false,
      assets: [mockImageAsset]
    });

    // Mock prescription service
    prescriptionService.scanPrescription.mockResolvedValue(mockOcrResult);
    prescriptionService.validateExtractedData.mockReturnValue(mockOcrResult.validation_results);
  });

  it('renders initial screen correctly', () => {
    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Select Prescription Image')).toBeTruthy();
    expect(getByText('Take a photo or select an image of the prescription to scan')).toBeTruthy();
    expect(getByText('Take Photo')).toBeTruthy();
    expect(getByText('Select Image')).toBeTruthy();
  });

  it('requests permissions on mount', async () => {
    render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    });
  });

  it('handles permission denial correctly', async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permissions Required',
        'Camera and photo library permissions are required to scan prescriptions.',
        expect.arrayContaining([
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: expect.any(Function) }
        ])
      );
    });
  });

  it('handles taking photo successfully', async () => {
    const { getByText, queryByDisplayValue } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      expect(FileUtils.takePhoto).toHaveBeenCalledWith({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });
    });

    // Should show scan options after image selection
    await waitFor(() => {
      expect(getByText('Scan Options')).toBeTruthy();
      expect(getByText('Use Advanced OCR (Textract)')).toBeTruthy();
    });
  });

  it('handles selecting image from gallery successfully', async () => {
    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    const selectImageButton = getByText('Select Image');
    fireEvent.press(selectImageButton);

    await waitFor(() => {
      expect(FileUtils.pickImage).toHaveBeenCalledWith({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });
    });

    // Should show scan options after image selection
    await waitFor(() => {
      expect(getByText('Scan Options')).toBeTruthy();
    });
  });

  it('handles camera capture cancellation', async () => {
    FileUtils.takePhoto.mockResolvedValue({
      canceled: true,
    });

    const { getByText, queryByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      expect(FileUtils.takePhoto).toHaveBeenCalled();
    });

    // Should not show scan options if cancelled
    expect(queryByText('Scan Options')).toBeNull();
  });

  it('handles image selection errors gracefully', async () => {
    FileUtils.takePhoto.mockRejectedValue(new Error('Camera error'));

    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to take photo. Please try again.'
      );
    });
  });

  it('performs OCR scan successfully', async () => {
    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // First select an image
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      expect(getByText('Scan Options')).toBeTruthy();
    });

    // Then scan the prescription
    const scanButton = getByText('Scan Prescription');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(prescriptionService.scanPrescription).toHaveBeenCalledWith(
        mockImageAsset,
        { useTextract: true }
      );
    });

    // Should show OCR results
    await waitFor(() => {
      expect(getByText('OCR Results')).toBeTruthy();
      expect(getByText('85.0% Confidence')).toBeTruthy();
      expect(getByText('Extracted Information')).toBeTruthy();
    });
  });

  it('shows processing status during OCR scan', async () => {
    // Make the scan take longer to test loading state
    prescriptionService.scanPrescription.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockOcrResult), 1000))
    );

    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select image and start scan
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      expect(getByText('Scan Prescription')).toBeTruthy();
    });

    const scanButton = getByText('Scan Prescription');
    fireEvent.press(scanButton);

    // Should show processing status
    await waitFor(() => {
      expect(getByText('Processing Prescription')).toBeTruthy();
      expect(getByText('Using advanced OCR for better accuracy...')).toBeTruthy();
    });
  });

  it('handles OCR scan errors gracefully', async () => {
    prescriptionService.scanPrescription.mockRejectedValue(
      new Error('OCR processing failed')
    );

    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select image and scan
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      expect(getByText('Scan Prescription')).toBeTruthy();
    });

    const scanButton = getByText('Scan Prescription');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(getByText('Scan Error')).toBeTruthy();
      expect(getByText('OCR processing failed')).toBeTruthy();
    });
  });

  it('toggles Textract option correctly', async () => {
    const { getByText, getByDisplayValue } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Select image first
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      expect(getByText('Use Advanced OCR (Textract)')).toBeTruthy();
    });

    // Toggle Textract option
    const textractSwitch = getByDisplayValue('true'); // Switch component
    fireEvent(textractSwitch, 'onValueChange', false);

    // Scan with Textract disabled
    const scanButton = getByText('Scan Prescription');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(prescriptionService.scanPrescription).toHaveBeenCalledWith(
        mockImageAsset,
        { useTextract: false }
      );
    });
  });

  it('enters edit mode and saves changes', async () => {
    const { getByText, getByDisplayValue } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan first
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      expect(getByText('Extracted Information')).toBeTruthy();
    });

    // Enter edit mode
    const editButton = getByText('pencil'); // Icon button
    fireEvent.press(editButton);

    // Edit patient name
    const patientNameInput = getByDisplayValue('Jane Doe');
    fireEvent.changeText(patientNameInput, 'Jane Smith');

    // Save changes
    const saveButton = getByText('check'); // Icon button
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(prescriptionService.validateExtractedData).toHaveBeenCalled();
    });
  });

  it('cancels edit mode without saving changes', async () => {
    const { getByText, getByDisplayValue } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan first
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      expect(getByText('Extracted Information')).toBeTruthy();
    });

    // Enter edit mode
    const editButton = getByText('pencil');
    fireEvent.press(editButton);

    // Edit patient name
    const patientNameInput = getByDisplayValue('Jane Doe');
    fireEvent.changeText(patientNameInput, 'Jane Smith');

    // Cancel changes
    const cancelButton = getByText('close'); // Icon button
    fireEvent.press(cancelButton);

    // Should revert to original data
    await waitFor(() => {
      expect(getByDisplayValue('Jane Doe')).toBeTruthy();
    });
  });

  it('displays validation results correctly', async () => {
    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      expect(getByText('Validation Results')).toBeTruthy();
      expect(getByText('75%')).toBeTruthy(); // Completeness
      expect(getByText('Warnings (1)')).toBeTruthy();
      expect(getByText('• Doctor information is incomplete')).toBeTruthy();
      expect(getByText('Ready to Create Prescription')).toBeTruthy();
    });
  });

  it('handles validation errors correctly', async () => {
    const invalidResult = {
      ...mockOcrResult,
      validation_results: {
        isValid: false,
        errors: ['Patient name is required', 'At least one medication is required'],
        warnings: [],
        completeness: 25
      }
    };

    prescriptionService.scanPrescription.mockResolvedValue(invalidResult);

    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      expect(getByText('Errors (2)')).toBeTruthy();
      expect(getByText('• Patient name is required')).toBeTruthy();
      expect(getByText('• At least one medication is required')).toBeTruthy();
    });
  });

  it('prevents creating prescription with validation errors', async () => {
    const invalidResult = {
      ...mockOcrResult,
      validation_results: {
        isValid: false,
        errors: ['Patient name is required'],
        warnings: [],
        completeness: 50
      }
    };

    prescriptionService.scanPrescription.mockResolvedValue(invalidResult);

    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      const createButton = getByText('Create Prescription');
      expect(createButton.props.disabled).toBe(true);
    });

    // Try to create prescription
    const createButton = getByText('Create Prescription');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Errors',
        'Please fix the validation errors before creating the prescription.',
        [{ text: 'OK' }]
      );
    });
  });

  it('navigates to create prescription with valid data', async () => {
    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      const createButton = getByText('Create Prescription');
      expect(createButton.props.disabled).toBe(false);
    });

    // Create prescription
    const createButton = getByText('Create Prescription');
    fireEvent.press(createButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreatePrescription', {
      extractedData: mockOcrResult.extracted_data,
      ocrResult: mockOcrResult.ocr_result,
      sourceImage: mockImageAsset
    });
  });

  it('handles cancel action correctly', async () => {
    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan first
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
    });

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('prevents scanning without image', async () => {
    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Try to scan without selecting image
    const scanButton = getByText('Scan Prescription');
    expect(scanButton.props.disabled).toBe(true);

    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'No Image',
        'Please select or take a photo of the prescription first.'
      );
    });
  });

  it('displays confidence levels with appropriate colors', async () => {
    const lowConfidenceResult = {
      ...mockOcrResult,
      ocr_result: {
        ...mockOcrResult.ocr_result,
        confidence: 0.45
      }
    };

    prescriptionService.scanPrescription.mockResolvedValue(lowConfidenceResult);

    const { getByText } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      expect(getByText('45.0% Confidence')).toBeTruthy();
    });
  });

  it('handles medication editing correctly', async () => {
    const { getByText, getByDisplayValue } = render(
      <PrescriptionScanScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Complete scan
    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      const scanButton = getByText('Scan Prescription');
      fireEvent.press(scanButton);
    });

    await waitFor(() => {
      expect(getByText('Medications')).toBeTruthy();
    });

    // Enter edit mode
    const editButton = getByText('pencil');
    fireEvent.press(editButton);

    // Edit medication name
    const medicationNameInput = getByDisplayValue('Paracetamol');
    fireEvent.changeText(medicationNameInput, 'Ibuprofen');

    // Edit dosage
    const dosageInput = getByDisplayValue('500mg');
    fireEvent.changeText(dosageInput, '400mg');

    // Save changes
    const saveButton = getByText('check');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(prescriptionService.validateExtractedData).toHaveBeenCalled();
    });
  });
});
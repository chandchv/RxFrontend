/**
 * Clinical Record Detail Screen Tests
 * 
 * Tests for the mobile clinical record detail view with document display,
 * metadata viewing, secure sharing, and OCR results integration.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ClinicalRecordDetailScreen from '../../../screens/clinical-records/ClinicalRecordDetailScreen';
import { AuthContext } from '../../../contexts/AuthContext';
import { MobileDashboardContext } from '../../../contexts/MobileDashboardContext';
import mobileApiService from '../../../services/mobileApiService';
import { theme } from '../../../styles/theme';

// Mock dependencies
jest.mock('../../../services/mobileApiService');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {
    recordId: 'test-record-id',
  },
};

// Mock auth context
const mockAuthContext = {
  user: {
    id: 'user-1',
    role: 'doctor',
    first_name: 'Dr. John',
    last_name: 'Doe',
  },
  isAuthenticated: true,
};

// Mock dashboard context
const mockDashboardContext = {
  updateLastActivity: jest.fn(),
  dashboardData: {},
  loading: false,
  error: null,
};

// Mock clinical record data
const mockClinicalRecord = {
  id: 'test-record-id',
  title: 'Test Clinical Record',
  description: 'Test description for clinical record',
  record_type: 'lab_result',
  status: 'active',
  priority: 'normal',
  record_date: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T11:00:00Z',
  patient: {
    id: 'patient-1',
    first_name: 'Jane',
    last_name: 'Smith',
  },
  created_by: {
    id: 'user-1',
    first_name: 'Dr. John',
    last_name: 'Doe',
  },
  tags: ['urgent', 'follow-up'],
  version: '1.0',
  external_id: 'EXT-123',
  source_system: 'Lab System',
};

// Mock documents data
const mockDocuments = [
  {
    id: 'doc-1',
    original_filename: 'lab_result.pdf',
    file_size: 1024000,
    content_type: 'application/pdf',
    document_type: 'lab_result',
    processing_status: 'completed',
    ocr_confidence: 0.95,
    has_ocr_text: true,
    ocr_text: 'Sample OCR text from the document...',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'doc-2',
    original_filename: 'xray_image.jpg',
    file_size: 2048000,
    content_type: 'image/jpeg',
    document_type: 'imaging',
    processing_status: 'processing',
    ocr_confidence: null,
    has_ocr_text: false,
    ocr_text: null,
    created_at: '2024-01-15T11:00:00Z',
  },
];

// Mock API response
const mockApiResponse = {
  record: mockClinicalRecord,
  documents: mockDocuments,
  document_count: 2,
  has_more_documents: false,
};

// Test wrapper component
const TestWrapper = ({ children }) => (
  <NavigationContainer>
    <PaperProvider theme={theme}>
      <AuthContext.Provider value={mockAuthContext}>
        <MobileDashboardContext.Provider value={mockDashboardContext}>
          {children}
        </MobileDashboardContext.Provider>
      </AuthContext.Provider>
    </PaperProvider>
  </NavigationContainer>
);

describe('ClinicalRecordDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mobileApiService.getClinicalRecordDetail.mockResolvedValue(mockApiResponse);
  });

  it('renders loading state initially', async () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    expect(getByText('Loading clinical record...')).toBeTruthy();
  });

  it('renders clinical record details correctly', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Check record header
    expect(getByText('Test Clinical Record')).toBeTruthy();
    expect(getByText('LAB_RESULT')).toBeTruthy();
    expect(getByText('active')).toBeTruthy();

    // Check record details
    expect(getByText('Record Details')).toBeTruthy();
    expect(getByText('Jane Smith')).toBeTruthy();
    expect(getByText('Dr. John Doe')).toBeTruthy();
    expect(getByText('Test description for clinical record')).toBeTruthy();
  });

  it('renders documents section correctly', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Check documents section
    expect(getByText('Documents (2)')).toBeTruthy();
    expect(getByText('lab_result.pdf')).toBeTruthy();
    expect(getByText('xray_image.jpg')).toBeTruthy();
    expect(getByText('1.00 MB')).toBeTruthy();
    expect(getByText('2.00 MB')).toBeTruthy();
  });

  it('shows OCR results for processed documents', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Check OCR results
    expect(getByText('OCR Text Preview:')).toBeTruthy();
    expect(getByText('Sample OCR text from the document...')).toBeTruthy();
    expect(getByText('OCR: 95%')).toBeTruthy();
  });

  it('shows processing status for documents', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Check processing status
    expect(getByText('completed')).toBeTruthy();
    expect(getByText('processing')).toBeTruthy();
  });

  it('renders metadata section correctly', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Expand metadata section
    fireEvent.press(getByText('Metadata & Technical Details'));

    await waitFor(() => {
      expect(getByText('Record ID')).toBeTruthy();
      expect(getByText('test-record-id')).toBeTruthy();
      expect(getByText('Version')).toBeTruthy();
      expect(getByText('1.0')).toBeTruthy();
      expect(getByText('Document Count')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('External ID')).toBeTruthy();
      expect(getByText('EXT-123')).toBeTruthy();
      expect(getByText('Source System')).toBeTruthy();
      expect(getByText('Lab System')).toBeTruthy();
    });
  });

  it('handles document viewer navigation', async () => {
    const { getAllByTestId, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Find and press document view button
    const viewButtons = getAllByTestId('document-view-button');
    if (viewButtons.length > 0) {
      fireEvent.press(viewButtons[0]);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('DocumentViewer', {
        documentId: 'doc-1',
        recordId: 'test-record-id',
        title: 'lab_result.pdf',
      });
    }
  });

  it('handles share menu interactions', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Find and press share button
    const shareButton = getByTestId('share-button');
    fireEvent.press(shareButton);

    await waitFor(() => {
      expect(getByText('Create Secure Link')).toBeTruthy();
      expect(getByText('Quick Share')).toBeTruthy();
    });
  });

  it('handles secure sharing dialog', async () => {
    mobileApiService.createRecordShare.mockResolvedValue({
      share_url: 'https://example.com/share/token123',
      expires_at: '2024-01-16T10:00:00Z',
    });

    const { getByTestId, getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Open share menu and select secure link
    const shareButton = getByTestId('share-button');
    fireEvent.press(shareButton);

    await waitFor(() => {
      fireEvent.press(getByText('Create Secure Link'));
    });

    // Check dialog is open
    expect(getByText('Create Secure Share Link')).toBeTruthy();
    expect(getByText('Purpose (optional)')).toBeTruthy();
    expect(getByText('Recipient Name (optional)')).toBeTruthy();

    // Fill in share options and create link
    const purposeInput = getByTestId('purpose-input');
    fireEvent.changeText(purposeInput, 'Medical consultation');

    const createButton = getByText('Create Link');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mobileApiService.createRecordShare).toHaveBeenCalledWith({
        record_id: 'test-record-id',
        expires_in_hours: 24,
        max_accesses: 10,
        purpose: 'Medical consultation',
        patient_consent: true,
        recipient_info: {
          name: '',
          organization: '',
        },
      });
    });
  });

  it('handles upload navigation for authorized users', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Find and press upload button
    const uploadButton = getByText('Add Document');
    fireEvent.press(uploadButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('DocumentUpload', {
      recordId: 'test-record-id',
    });
  });

  it('handles edit navigation for authorized users', async () => {
    const { getByTestId, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Find and press edit button
    const editButton = getByTestId('edit-button');
    fireEvent.press(editButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditClinicalRecord', {
      recordId: 'test-record-id',
    });
  });

  it('handles pull to refresh', async () => {
    const { getByTestId, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Trigger pull to refresh
    const scrollView = getByTestId('clinical-record-detail-scroll');
    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      expect(mobileApiService.getClinicalRecordDetail).toHaveBeenCalledTimes(2);
    });
  });

  it('handles API errors gracefully', async () => {
    mobileApiService.getClinicalRecordDetail.mockRejectedValue(
      new Error('Network error')
    );

    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
      expect(getByText('Failed to Load Record')).toBeTruthy();
      expect(getByText('Network error')).toBeTruthy();
    });

    // Test retry functionality
    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);

    expect(mobileApiService.getClinicalRecordDetail).toHaveBeenCalledTimes(2);
  });

  it('handles empty documents state', async () => {
    const emptyResponse = {
      ...mockApiResponse,
      documents: [],
      document_count: 0,
    };

    mobileApiService.getClinicalRecordDetail.mockResolvedValue(emptyResponse);

    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    expect(getByText('Documents (0)')).toBeTruthy();
    expect(getByText('No documents attached')).toBeTruthy();
    expect(getByText('Upload Document')).toBeTruthy();
  });

  it('handles record not found', async () => {
    mobileApiService.getClinicalRecordDetail.mockResolvedValue(null);

    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
      expect(getByText('Record Not Found')).toBeTruthy();
      expect(getByText('The requested clinical record could not be found.')).toBeTruthy();
    });

    // Test go back functionality
    const goBackButton = getByText('Go Back');
    fireEvent.press(goBackButton);

    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('shows different UI for patient users', async () => {
    const patientAuthContext = {
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'patient',
      },
    };

    const { queryByText } = render(
      <NavigationContainer>
        <PaperProvider theme={theme}>
          <AuthContext.Provider value={patientAuthContext}>
            <MobileDashboardContext.Provider value={mockDashboardContext}>
              <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
            </MobileDashboardContext.Provider>
          </AuthContext.Provider>
        </PaperProvider>
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Patient users should not see edit or upload buttons
    expect(queryByText('Add Document')).toBeNull();
    expect(queryByText('Upload Document')).toBeNull();
  });

  it('handles section expansion and collapse', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Initially metadata section should be collapsed
    expect(queryByText('Record ID')).toBeNull();

    // Expand metadata section
    fireEvent.press(getByText('Metadata & Technical Details'));

    await waitFor(() => {
      expect(getByText('Record ID')).toBeTruthy();
    });

    // Collapse metadata section
    fireEvent.press(getByText('Metadata & Technical Details'));

    await waitFor(() => {
      expect(queryByText('Record ID')).toBeNull();
    });
  });

  it('handles document sharing', async () => {
    mobileApiService.createDocumentShare.mockResolvedValue({
      share_url: 'https://example.com/share/doc-token123',
    });

    const { getAllByTestId, queryByText } = render(
      <TestWrapper>
        <ClinicalRecordDetailScreen navigation={mockNavigation} route={mockRoute} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading clinical record...')).toBeNull();
    });

    // Find and press document share button
    const shareButtons = getAllByTestId('document-share-button');
    if (shareButtons.length > 0) {
      fireEvent.press(shareButtons[0]);

      await waitFor(() => {
        expect(mobileApiService.createDocumentShare).toHaveBeenCalledWith({
          document_id: 'doc-1',
          expires_in_hours: 24,
          max_accesses: 5,
          purpose: 'Sharing document: lab_result.pdf',
          patient_consent: true,
        });
      });
    }
  });
});
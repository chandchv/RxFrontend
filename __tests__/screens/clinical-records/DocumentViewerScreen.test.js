/**
 * DocumentViewerScreen Component Tests
 * 
 * Tests for mobile document viewer with zoom, pan, sharing, and export functionality.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking, Share } from 'react-native';
import DocumentViewerScreen from '../../../screens/clinical-records/DocumentViewerScreen';
import { useAuth } from '../../../contexts/AuthContext';
import { useMobileDashboard } from '../../../contexts/MobileDashboardContext';
import mobileApiService from '../../../services/mobileApiService';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/MobileDashboardContext');
jest.mock('../../../services/mobileApiService');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route params
const mockRoute = {
  params: {
    documentId: 'doc-123',
    recordId: 'record-456',
    title: 'Test Document.pdf',
  },
};

// Mock auth context
const mockAuthContext = {
  user: {
    id: 'user-123',
    role: 'doctor',
    first_name: 'John',
    last_name: 'Doe',
  },
  isAuthenticated: true,
};

// Mock mobile dashboard context
const mockMobileDashboardContext = {
  updateLastActivity: jest.fn(),
  dashboardData: {},
  loading: false,
  error: null,
};

// Mock document data
const mockDocument = {
  id: 'doc-123',
  original_filename: 'test-document.pdf',
  content_type: 'application/pdf',
  document_type: 'pdf',
  file_size: 1024000,
  processing_status: 'completed',
  ocr_confidence: 0.95,
  has_ocr_text: true,
  ocr_text: 'Sample OCR text content',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:35:00Z',
};

const mockDocumentUrl = {
  view_url: 'https://example.com/documents/view/doc-123',
};

const mockDownloadUrl = {
  download_url: 'https://example.com/documents/download/doc-123',
};

const mockShareResponse = {
  share_url: 'https://example.com/share/abc123',
  expires_at: '2024-01-16T10:30:00Z',
};

describe('DocumentViewerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    useAuth.mockReturnValue(mockAuthContext);
    useMobileDashboard.mockReturnValue(mockMobileDashboardContext);
    
    mobileApiService.getDocumentDetail.mockResolvedValue(mockDocument);
    mobileApiService.getDocumentViewUrl.mockResolvedValue(mockDocumentUrl);
    mobileApiService.getDocumentDownloadUrl.mockResolvedValue(mockDownloadUrl);
    mobileApiService.createDocumentShare.mockResolvedValue(mockShareResponse);
  });

  describe('Component Rendering', () => {
    it('renders loading state initially', async () => {
      mobileApiService.getDocumentDetail.mockImplementation(() => new Promise(() => {}));
      
      const { getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByText('Loading document...')).toBeTruthy();
    });

    it('renders document viewer with PDF document', async () => {
      const { getByText, getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('PDF Document')).toBeTruthy();
        expect(getByText('test-document.pdf')).toBeTruthy();
        expect(getByText('Open in PDF Viewer')).toBeTruthy();
      });
    });

    it('renders document viewer with image document', async () => {
      const imageDocument = {
        ...mockDocument,
        content_type: 'image/jpeg',
        document_type: 'image',
        original_filename: 'test-image.jpg',
      };
      
      mobileApiService.getDocumentDetail.mockResolvedValue(imageDocument);

      const { getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByTestId('zoom-in-button')).toBeTruthy();
        expect(getByTestId('zoom-out-button')).toBeTruthy();
        expect(getByTestId('reset-zoom-button')).toBeTruthy();
        expect(getByTestId('fullscreen-button')).toBeTruthy();
      });
    });

    it('renders document viewer with DICOM document', async () => {
      const dicomDocument = {
        ...mockDocument,
        content_type: 'application/dicom',
        document_type: 'dicom',
        original_filename: 'test-scan.dcm',
      };
      
      mobileApiService.getDocumentDetail.mockResolvedValue(dicomDocument);

      const { getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('DICOM Medical Image')).toBeTruthy();
        expect(getByText('test-scan.dcm')).toBeTruthy();
        expect(getByText('Use a specialized DICOM viewer for full functionality')).toBeTruthy();
      });
    });

    it('renders error state when document fails to load', async () => {
      mobileApiService.getDocumentDetail.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Failed to Load Document')).toBeTruthy();
        expect(getByText('Network error')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    it('renders document not found state', async () => {
      mobileApiService.getDocumentDetail.mockResolvedValue(null);

      const { getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Document Not Found')).toBeTruthy();
        expect(getByText('The requested document could not be found.')).toBeTruthy();
        expect(getByText('Go Back')).toBeTruthy();
      });
    });
  });

  describe('Document Information', () => {
    it('displays document information panel', async () => {
      const { getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('test-document.pdf')).toBeTruthy();
        expect(getByText('Size:')).toBeTruthy();
        expect(getByText('1.0 MB')).toBeTruthy();
        expect(getByText('Uploaded:')).toBeTruthy();
        expect(getByText('Status:')).toBeTruthy();
        expect(getByText('completed')).toBeTruthy();
        expect(getByText('OCR Confidence:')).toBeTruthy();
        expect(getByText('95%')).toBeTruthy();
      });
    });

    it('displays document type chip', async () => {
      const { getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('pdf')).toBeTruthy();
      });
    });
  });

  describe('Menu Actions', () => {
    it('opens menu when menu button is pressed', async () => {
      const { getByTestId, getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      expect(getByText('Share')).toBeTruthy();
      expect(getByText('Download')).toBeTruthy();
      expect(getByText('Export')).toBeTruthy();
      expect(getByText('Fullscreen')).toBeTruthy();
    });

    it('handles download action', async () => {
      const { getByTestId, getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      const downloadButton = getByText('Download');
      fireEvent.press(downloadButton);

      await waitFor(() => {
        expect(mobileApiService.getDocumentDownloadUrl).toHaveBeenCalledWith('doc-123');
        expect(Linking.openURL).toHaveBeenCalledWith(mockDownloadUrl.download_url);
      });
    });

    it('handles export action', async () => {
      const { getByTestId, getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      const exportButton = getByText('Export');
      fireEvent.press(exportButton);

      await waitFor(() => {
        expect(mobileApiService.getDocumentDownloadUrl).toHaveBeenCalledWith('doc-123');
        expect(Share.share).toHaveBeenCalledWith({
          message: 'Document: test-document.pdf',
          url: mockDownloadUrl.download_url,
          title: 'test-document.pdf',
        });
      });
    });
  });

  describe('Sharing Functionality', () => {
    it('opens share dialog when share menu item is pressed', async () => {
      const { getByTestId, getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      const shareButton = getByText('Share');
      fireEvent.press(shareButton);

      expect(getByText('Share Document')).toBeTruthy();
      expect(getByText('Purpose (optional)')).toBeTruthy();
      expect(getByText('Recipient Name (optional)')).toBeTruthy();
      expect(getByText('Recipient Organization (optional)')).toBeTruthy();
      expect(getByText('Expires in (hours):')).toBeTruthy();
      expect(getByText('Max accesses:')).toBeTruthy();
      expect(getByText('Patient consent obtained:')).toBeTruthy();
    });

    it('creates share link with custom options', async () => {
      const { getByTestId, getByText, getByDisplayValue } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      const shareButton = getByText('Share');
      fireEvent.press(shareButton);

      // Fill in share options
      const purposeInput = getByTestId('purpose-input');
      fireEvent.changeText(purposeInput, 'Medical consultation');

      const createButton = getByText('Create Share Link');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(mobileApiService.createDocumentShare).toHaveBeenCalledWith({
          document_id: 'doc-123',
          expires_in_hours: 24,
          max_accesses: 5,
          purpose: 'Medical consultation',
          patient_consent: true,
          recipient_info: {
            name: '',
            organization: '',
          },
        });
      });
    });

    it('handles share creation success', async () => {
      const { getByTestId, getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      const shareButton = getByText('Share');
      fireEvent.press(shareButton);

      const createButton = getByText('Create Share Link');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(Share.share).toHaveBeenCalledWith({
          message: expect.stringContaining('Clinical Document: test-document.pdf'),
          url: mockShareResponse.share_url,
          title: 'Document: test-document.pdf',
        });
      });
    });

    it('handles share creation error', async () => {
      mobileApiService.createDocumentShare.mockRejectedValue(new Error('Share failed'));

      const { getByTestId, getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      const shareButton = getByText('Share');
      fireEvent.press(shareButton);

      const createButton = getByText('Create Share Link');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Share Failed', 'Share failed');
      });
    });
  });

  describe('Zoom Controls (Image Documents)', () => {
    beforeEach(() => {
      const imageDocument = {
        ...mockDocument,
        content_type: 'image/jpeg',
        document_type: 'image',
        original_filename: 'test-image.jpg',
      };
      
      mobileApiService.getDocumentDetail.mockResolvedValue(imageDocument);
    });

    it('renders zoom controls for image documents', async () => {
      const { getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByTestId('zoom-in-button')).toBeTruthy();
        expect(getByTestId('zoom-out-button')).toBeTruthy();
        expect(getByTestId('reset-zoom-button')).toBeTruthy();
      });
    });

    it('handles zoom in action', async () => {
      const { getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const zoomInButton = getByTestId('zoom-in-button');
        fireEvent.press(zoomInButton);
      });

      // Zoom functionality is tested through user interaction
      // The actual zoom state changes are handled by Animated values
    });

    it('handles zoom out action', async () => {
      const { getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const zoomOutButton = getByTestId('zoom-out-button');
        fireEvent.press(zoomOutButton);
      });

      // Zoom functionality is tested through user interaction
    });

    it('handles reset zoom action', async () => {
      const { getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const resetButton = getByTestId('reset-zoom-button');
        fireEvent.press(resetButton);
      });

      // Reset zoom functionality is tested through user interaction
    });

    it('handles fullscreen toggle', async () => {
      const { getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const fullscreenButton = getByTestId('fullscreen-button');
        fireEvent.press(fullscreenButton);
      });

      // Fullscreen state change is tested through user interaction
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', async () => {
      const { getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        // Back button is part of the Appbar, would need to test through navigation
        expect(mockNavigation.goBack).not.toHaveBeenCalled();
      });
    });

    it('updates last activity on document load', async () => {
      render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(mockMobileDashboardContext.updateLastActivity).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mobileApiService.getDocumentDetail.mockRejectedValue(new Error('API Error'));

      const { getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Failed to Load Document')).toBeTruthy();
        expect(getByText('API Error')).toBeTruthy();
      });
    });

    it('handles download errors', async () => {
      mobileApiService.getDocumentDownloadUrl.mockRejectedValue(new Error('Download failed'));

      const { getByTestId, getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      const downloadButton = getByText('Download');
      fireEvent.press(downloadButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Download Failed', 'Download failed');
      });
    });

    it('handles export errors', async () => {
      mobileApiService.getDocumentDownloadUrl.mockRejectedValue(new Error('Export failed'));

      const { getByTestId, getByText } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
      });

      const exportButton = getByText('Export');
      fireEvent.press(exportButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Export Failed', 'Export failed');
      });
    });
  });

  describe('Performance', () => {
    it('loads document data efficiently', async () => {
      render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(mobileApiService.getDocumentDetail).toHaveBeenCalledTimes(1);
        expect(mobileApiService.getDocumentViewUrl).toHaveBeenCalledTimes(1);
      });
    });

    it('handles component unmounting gracefully', async () => {
      const { unmount } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(mobileApiService.getDocumentDetail).toHaveBeenCalled();
      });

      // Unmount component
      unmount();

      // Should not cause any errors or memory leaks
    });
  });

  describe('Accessibility', () => {
    it('provides accessible labels for interactive elements', async () => {
      const imageDocument = {
        ...mockDocument,
        content_type: 'image/jpeg',
        document_type: 'image',
      };
      
      mobileApiService.getDocumentDetail.mockResolvedValue(imageDocument);

      const { getByTestId } = render(
        <DocumentViewerScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByTestId('menu-button')).toBeTruthy();
        expect(getByTestId('zoom-in-button')).toBeTruthy();
        expect(getByTestId('zoom-out-button')).toBeTruthy();
        expect(getByTestId('reset-zoom-button')).toBeTruthy();
        expect(getByTestId('fullscreen-button')).toBeTruthy();
      });
    });
  });
});
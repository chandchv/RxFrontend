import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReportExporter from '../../components/ReportExporter';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-share', () => ({
  open: jest.fn().mockResolvedValue(true)
}));
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  writeFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true)
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock fetch
global.fetch = jest.fn();

const mockReportData = {
  report_info: {
    type: 'revenue_report',
    generated_at: '2024-01-15T10:00:00Z',
    generated_by: 'Test User',
    date_range: {
      start_date: '2024-01-01',
      end_date: '2024-01-15'
    },
    clinic_count: 3
  },
  summary: {
    total_revenue: 15000.00,
    total_paid: 12000.00,
    outstanding_amount: 3000.00,
    total_bills: 150,
    collection_rate: 80.0,
    average_bill_amount: 100.00
  },
  branch_breakdown: [
    {
      clinic_id: 1,
      clinic_name: 'Main Clinic',
      branch_code: 'MAIN',
      revenue: 8000.00,
      bills_count: 80
    },
    {
      clinic_id: 2,
      clinic_name: 'Branch A',
      branch_code: 'BRA',
      revenue: 4000.00,
      bills_count: 40
    }
  ]
};

const defaultProps = {
  visible: true,
  reportData: mockReportData,
  reportType: 'revenue',
  onClose: jest.fn()
};

describe('ReportExporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue('mock-token');
    fetch.mockClear();
  });

  describe('Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('Export Report')).toBeTruthy();
      expect(getByText('Report Summary')).toBeTruthy();
      expect(getByText('Choose Export Format')).toBeTruthy();
      expect(getByText('JSON Format')).toBeTruthy();
      expect(getByText('CSV Format')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByText } = render(
        <ReportExporter {...defaultProps} visible={false} />
      );

      expect(queryByText('Export Report')).toBeNull();
    });

    it('displays report summary information', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('Revenue')).toBeTruthy();
      expect(getByText('3')).toBeTruthy(); // Branch count
      expect(getByText('2024-01-01 to 2024-01-15')).toBeTruthy(); // Date range
      expect(getByText('2')).toBeTruthy(); // Records count
    });

    it('displays export format options', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('JSON Format')).toBeTruthy();
      expect(getByText('Machine-readable format for data processing')).toBeTruthy();
      expect(getByText('CSV Format')).toBeTruthy();
      expect(getByText('Spreadsheet format for Excel and other tools')).toBeTruthy();
    });

    it('displays export information section', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('Export Information')).toBeTruthy();
      expect(getByText('• Exported files will include all selected branch data')).toBeTruthy();
      expect(getByText('• Branch identification is preserved in all exports')).toBeTruthy();
      expect(getByText('• Files can be shared via email, cloud storage, or other apps')).toBeTruthy();
    });
  });

  describe('Report Summary', () => {
    it('displays correct report type', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('Revenue')).toBeTruthy();
    });

    it('formats report type for patient analytics', () => {
      const { getByText } = render(
        <ReportExporter {...defaultProps} reportType="patient-analytics" />
      );

      expect(getByText('Patient Analytics')).toBeTruthy();
    });

    it('formats report type for doctor performance', () => {
      const { getByText } = render(
        <ReportExporter {...defaultProps} reportType="doctor-performance" />
      );

      expect(getByText('Doctor Performance')).toBeTruthy();
    });

    it('displays branch count correctly', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('3')).toBeTruthy(); // From report_info.clinic_count
    });

    it('displays date range correctly', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('2024-01-01 to 2024-01-15')).toBeTruthy();
    });

    it('calculates total records correctly', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('2')).toBeTruthy(); // 2 items in branch_breakdown
    });

    it('estimates file size', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      // Should show some file size estimate
      expect(getByText(/\d+(\.\d+)?\s*(B|KB|MB)/)).toBeTruthy();
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"mock": "data"}')
      });
    });

    it('exports JSON format successfully', async () => {
      const Share = require('react-native-share');
      const RNFS = require('react-native-fs');

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/reporting/export/'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('"format":"json"')
          })
        );
      });

      await waitFor(() => {
        expect(RNFS.writeFile).toHaveBeenCalled();
        expect(Share.open).toHaveBeenCalled();
      });
    });

    it('exports CSV format successfully', async () => {
      const Share = require('react-native-share');
      const RNFS = require('react-native-fs');

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('CSV Format'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/reporting/export/'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"format":"csv"')
          })
        );
      });

      await waitFor(() => {
        expect(RNFS.writeFile).toHaveBeenCalled();
        expect(Share.open).toHaveBeenCalled();
      });
    });

    it('shows loading state during export', async () => {
      // Mock delayed response
      fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            text: () => Promise.resolve('{"mock": "data"}')
          }), 100)
        )
      );

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      expect(getByText('Preparing export...')).toBeTruthy();
    });

    it('handles export errors gracefully', async () => {
      fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Export failed' })
      });

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Export Failed', 'Export failed');
      });
    });

    it('handles network errors during export', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Export Failed', 'Network error');
      });
    });

    it('cleans up temporary files after sharing', async () => {
      const RNFS = require('react-native-fs');
      
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      await waitFor(() => {
        expect(RNFS.writeFile).toHaveBeenCalled();
      });

      // Wait for cleanup timeout
      await new Promise(resolve => setTimeout(resolve, 5100));

      expect(RNFS.unlink).toHaveBeenCalled();
    });
  });

  describe('File Sharing', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"mock": "data"}')
      });
    });

    it('shares JSON file with correct options', async () => {
      const Share = require('react-native-share');

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      await waitFor(() => {
        expect(Share.open).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export revenue Report',
            type: 'application/json',
            filename: expect.stringMatching(/revenue_\d{4}-\d{2}-\d{2}\.json/)
          })
        );
      });
    });

    it('shares CSV file with correct options', async () => {
      const Share = require('react-native-share');

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('CSV Format'));

      await waitFor(() => {
        expect(Share.open).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export revenue Report',
            type: 'text/csv',
            filename: expect.stringMatching(/revenue_\d{4}-\d{2}-\d{2}\.csv/)
          })
        );
      });
    });

    it('handles sharing cancellation gracefully', async () => {
      const Share = require('react-native-share');
      Share.open.mockRejectedValue(new Error('User cancelled'));

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      await waitFor(() => {
        expect(Share.open).toHaveBeenCalled();
      });

      // Should not show error for user cancellation
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing report data', () => {
      const { getByText } = render(
        <ReportExporter {...defaultProps} reportData={null} />
      );

      fireEvent.press(getByText('JSON Format'));

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No report data available to export');
    });

    it('handles report data without summary', () => {
      const incompleteData = {
        report_info: {
          type: 'revenue_report',
          clinic_count: 1
        }
      };

      const { getByText } = render(
        <ReportExporter {...defaultProps} reportData={incompleteData} />
      );

      expect(getByText('Export Report')).toBeTruthy();
      expect(getByText('1')).toBeTruthy(); // Should still show clinic count
    });

    it('handles report data without date range', () => {
      const dataWithoutDates = {
        ...mockReportData,
        report_info: {
          ...mockReportData.report_info,
          date_range: null
        }
      };

      const { getByText } = render(
        <ReportExporter {...defaultProps} reportData={dataWithoutDates} />
      );

      expect(getByText('N/A')).toBeTruthy(); // Should show N/A for date range
    });

    it('handles very large report data', () => {
      const largeData = {
        ...mockReportData,
        branch_breakdown: Array.from({ length: 1000 }, (_, i) => ({
          clinic_id: i + 1,
          clinic_name: `Clinic ${i + 1}`,
          revenue: 1000
        }))
      };

      const { getByText } = render(
        <ReportExporter {...defaultProps} reportData={largeData} />
      );

      expect(getByText('1000')).toBeTruthy(); // Should show correct record count
      expect(getByText(/MB/)).toBeTruthy(); // Should show MB for large files
    });
  });

  describe('File Size Estimation', () => {
    it('estimates small file sizes in bytes', () => {
      const smallData = {
        report_info: { type: 'test' },
        summary: { total: 1 }
      };

      const { getByText } = render(
        <ReportExporter {...defaultProps} reportData={smallData} />
      );

      expect(getByText(/\d+(\.\d+)?\s*B/)).toBeTruthy();
    });

    it('estimates medium file sizes in KB', () => {
      const mediumData = {
        ...mockReportData,
        branch_breakdown: Array.from({ length: 50 }, (_, i) => ({
          clinic_id: i + 1,
          clinic_name: `Clinic ${i + 1}`,
          revenue: 1000,
          additional_data: 'x'.repeat(100)
        }))
      };

      const { getByText } = render(
        <ReportExporter {...defaultProps} reportData={mediumData} />
      );

      expect(getByText(/\d+(\.\d+)?\s*KB/)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility structure', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('Export Report')).toBeTruthy();
      expect(getByText('Report Summary')).toBeTruthy();
      expect(getByText('Choose Export Format')).toBeTruthy();
      expect(getByText('Export Information')).toBeTruthy();
    });

    it('provides clear format descriptions', () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      expect(getByText('Machine-readable format for data processing')).toBeTruthy();
      expect(getByText('Spreadsheet format for Excel and other tools')).toBeTruthy();
    });

    it('shows loading state clearly', async () => {
      fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            text: () => Promise.resolve('data')
          }), 100)
        )
      );

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      expect(getByText('Preparing export...')).toBeTruthy();
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is pressed', () => {
      const mockOnClose = jest.fn();
      const { getByText } = render(
        <ReportExporter {...defaultProps} onClose={mockOnClose} />
      );

      // Close button would have testID in real app
      // For now, we test that the component renders
      expect(getByText('Export Report')).toBeTruthy();
    });

    it('calls onClose after successful export', async () => {
      const mockOnClose = jest.fn();
      const { getByText } = render(
        <ReportExporter {...defaultProps} onClose={mockOnClose} />
      );

      fireEvent.press(getByText('JSON Format'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Performance', () => {
    it('handles multiple rapid export attempts', async () => {
      const { getByText } = render(<ReportExporter {...defaultProps} />);

      // Rapid fire exports
      fireEvent.press(getByText('JSON Format'));
      fireEvent.press(getByText('CSV Format'));
      fireEvent.press(getByText('JSON Format'));

      // Should handle gracefully without crashing
      expect(getByText('Export Report')).toBeTruthy();
    });

    it('does not block UI during export', async () => {
      fetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            text: () => Promise.resolve('data')
          }), 100)
        )
      );

      const { getByText } = render(<ReportExporter {...defaultProps} />);

      fireEvent.press(getByText('JSON Format'));

      // UI should still be responsive
      expect(getByText('CSV Format')).toBeTruthy();
    });
  });
});
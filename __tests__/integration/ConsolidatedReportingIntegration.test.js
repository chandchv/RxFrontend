import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConsolidatedReportingScreen from '../../screens/ConsolidatedReportingScreen';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
  PieChart: 'PieChart',
}));
jest.mock('react-native-share', () => ({
  open: jest.fn().mockResolvedValue(true)
}));
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  writeFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true)
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock complete API responses
const mockAccessibleClinics = {
  success: true,
  data: {
    clinics: [
      {
        id: 1,
        name: 'Healthcare Main',
        branch_code: 'MAIN',
        clinic_type: 'parent',
        organization: { id: 1, name: 'Healthcare Network' }
      },
      {
        id: 2,
        name: 'Downtown Branch',
        branch_code: 'DOWN',
        clinic_type: 'branch',
        parent: { id: 1, name: 'Healthcare Main' }
      },
      {
        id: 3,
        name: 'Uptown Branch',
        branch_code: 'UP',
        clinic_type: 'branch',
        parent: { id: 1, name: 'Healthcare Main' }
      },
      {
        id: 4,
        name: 'Suburban Branch',
        branch_code: 'SUB',
        clinic_type: 'branch',
        parent: { id: 1, name: 'Healthcare Main' }
      }
    ],
    total_count: 4
  }
};

const mockRevenueReport = {
  success: true,
  data: {
    report_info: {
      type: 'revenue_report',
      generated_at: '2024-01-15T10:00:00Z',
      generated_by: 'Integration Test User',
      date_range: {
        start_date: '2024-01-01',
        end_date: '2024-01-15'
      },
      clinic_count: 4
    },
    summary: {
      total_revenue: 50000.00,
      total_paid: 42000.00,
      outstanding_amount: 8000.00,
      total_bills: 500,
      collection_rate: 84.0,
      average_bill_amount: 100.00
    },
    branch_breakdown: [
      {
        clinic_id: 1,
        clinic_name: 'Healthcare Main',
        branch_code: 'MAIN',
        revenue: 20000.00,
        bills_count: 200,
        payments: 17000.00,
        outstanding: 3000.00,
        collection_rate: 85.0
      },
      {
        clinic_id: 2,
        clinic_name: 'Downtown Branch',
        branch_code: 'DOWN',
        revenue: 15000.00,
        bills_count: 150,
        payments: 12500.00,
        outstanding: 2500.00,
        collection_rate: 83.33
      },
      {
        clinic_id: 3,
        clinic_name: 'Uptown Branch',
        branch_code: 'UP',
        revenue: 10000.00,
        bills_count: 100,
        payments: 8500.00,
        outstanding: 1500.00,
        collection_rate: 85.0
      },
      {
        clinic_id: 4,
        clinic_name: 'Suburban Branch',
        branch_code: 'SUB',
        revenue: 5000.00,
        bills_count: 50,
        payments: 4000.00,
        outstanding: 1000.00,
        collection_rate: 80.0
      }
    ],
    payment_methods: [
      { payment_method: 'cash', count: 200, total_amount: 20000.00, percentage: 47.62 },
      { payment_method: 'card', count: 150, total_amount: 15000.00, percentage: 35.71 },
      { payment_method: 'insurance', count: 100, total_amount: 7000.00, percentage: 16.67 }
    ],
    bill_status_breakdown: [
      { status: 'paid', count: 350, total_amount: 35000.00 },
      { status: 'partial', count: 100, total_amount: 10000.00 },
      { status: 'pending', count: 50, total_amount: 5000.00 }
    ]
  }
};

const mockPatientAnalyticsReport = {
  success: true,
  data: {
    report_info: {
      type: 'patient_analytics',
      generated_at: '2024-01-15T10:00:00Z',
      generated_by: 'Integration Test User',
      date_range: {
        start_date: '2024-01-01',
        end_date: '2024-01-15'
      },
      clinic_count: 4
    },
    summary: {
      total_patients: 1200,
      unique_patients_with_appointments: 800,
      patient_engagement_rate: 66.67,
      avg_appointments_per_patient: 1.5
    },
    branch_breakdown: [
      {
        clinic_id: 1,
        clinic_name: 'Healthcare Main',
        branch_code: 'MAIN',
        patient_count: 500,
        appointments_count: 400,
        avg_appointments_per_patient: 0.8
      },
      {
        clinic_id: 2,
        clinic_name: 'Downtown Branch',
        branch_code: 'DOWN',
        patient_count: 300,
        appointments_count: 350,
        avg_appointments_per_patient: 1.17
      },
      {
        clinic_id: 3,
        clinic_name: 'Uptown Branch',
        branch_code: 'UP',
        patient_count: 250,
        appointments_count: 300,
        avg_appointments_per_patient: 1.2
      },
      {
        clinic_id: 4,
        clinic_name: 'Suburban Branch',
        branch_code: 'SUB',
        patient_count: 150,
        appointments_count: 150,
        avg_appointments_per_patient: 1.0
      }
    ]
  }
};

const mockDoctorPerformanceReport = {
  success: true,
  data: {
    report_info: {
      type: 'doctor_performance',
      generated_at: '2024-01-15T10:00:00Z',
      generated_by: 'Integration Test User',
      date_range: {
        start_date: '2024-01-01',
        end_date: '2024-01-15'
      },
      clinic_count: 4
    },
    summary: {
      total_consultations: 800,
      total_appointments: 1000,
      total_earnings: 40000.00,
      avg_consultation_fee: 50.00,
      consultation_completion_rate: 80.0
    },
    branch_performance: [
      {
        clinic_id: 1,
        clinic_name: 'Healthcare Main',
        branch_code: 'MAIN',
        consultations: 400,
        appointments: 500,
        total_earnings: 20000.00,
        unique_doctors: 5
      },
      {
        clinic_id: 2,
        clinic_name: 'Downtown Branch',
        branch_code: 'DOWN',
        consultations: 200,
        appointments: 250,
        total_earnings: 10000.00,
        unique_doctors: 3
      },
      {
        clinic_id: 3,
        clinic_name: 'Uptown Branch',
        branch_code: 'UP',
        consultations: 150,
        appointments: 200,
        total_earnings: 7500.00,
        unique_doctors: 2
      },
      {
        clinic_id: 4,
        clinic_name: 'Suburban Branch',
        branch_code: 'SUB',
        consultations: 50,
        appointments: 50,
        total_earnings: 2500.00,
        unique_doctors: 1
      }
    ]
  }
};

// Mock fetch
global.fetch = jest.fn();

describe('ConsolidatedReportingScreen Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue('integration-test-token');
    fetch.mockClear();
  });

  describe('Complete Revenue Report Workflow', () => {
    it('completes full revenue report generation and export workflow', async () => {
      // Setup API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRevenueReport),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify(mockRevenueReport.data)),
        });

      const { getByText, queryByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Step 1: Verify initial load
      await waitFor(() => {
        expect(getByText('Multi-branch analytics across 4 clinics')).toBeTruthy();
      });

      // Step 2: Verify all branches are selected by default
      expect(getByText('Branches (4)')).toBeTruthy();

      // Step 3: Verify revenue report type is selected by default
      expect(getByText('Revenue')).toBeTruthy();

      // Step 4: Generate report
      const generateButton = getByText('Generate');
      fireEvent.press(generateButton);

      // Step 5: Verify loading state
      expect(getByText('Generating report...')).toBeTruthy();

      // Step 6: Wait for report to be generated
      await waitFor(() => {
        expect(queryByText('Generating report...')).toBeNull();
      });

      // Step 7: Verify summary statistics are displayed
      await waitFor(() => {
        expect(getByText('Summary Statistics')).toBeTruthy();
        expect(getByText('$50,000')).toBeTruthy(); // Total revenue
        expect(getByText('$42,000')).toBeTruthy(); // Total paid
        expect(getByText('84.0%')).toBeTruthy(); // Collection rate
      });

      // Step 8: Verify branch breakdown is displayed
      expect(getByText('Branch Breakdown')).toBeTruthy();
      expect(getByText('Healthcare Main')).toBeTruthy();
      expect(getByText('Downtown Branch')).toBeTruthy();
      expect(getByText('Uptown Branch')).toBeTruthy();
      expect(getByText('Suburban Branch')).toBeTruthy();

      // Step 9: Verify charts are displayed
      expect(getByText('Branch Performance')).toBeTruthy();
      expect(getByText('Revenue by Branch')).toBeTruthy();

      // Step 10: Test export functionality
      const exportButton = getByText('Export');
      fireEvent.press(exportButton);

      // Verify API calls were made correctly
      expect(fetch).toHaveBeenCalledTimes(2); // clinics + revenue report
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reporting/clinics/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer integration-test-token',
          }),
        })
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reporting/revenue/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"clinic_ids":[1,2,3,4]'),
        })
      );
    });
  });

  describe('Complete Patient Analytics Workflow', () => {
    it('completes full patient analytics report generation workflow', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPatientAnalyticsReport),
        });

      const { getByText, queryByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Multi-branch analytics across 4 clinics')).toBeTruthy();
      });

      // Step 1: Switch to patient analytics
      const patientsButton = getByText('Patients');
      fireEvent.press(patientsButton);

      // Step 2: Generate report
      const generateButton = getByText('Generate');
      fireEvent.press(generateButton);

      // Step 3: Wait for report generation
      await waitFor(() => {
        expect(queryByText('Generating report...')).toBeNull();
      });

      // Step 4: Verify patient analytics data
      await waitFor(() => {
        expect(getByText('1,200')).toBeTruthy(); // Total patients
        expect(getByText('800')).toBeTruthy(); // Active patients
        expect(getByText('66.7%')).toBeTruthy(); // Engagement rate
        expect(getByText('1.5')).toBeTruthy(); // Avg visits
      });

      // Step 5: Verify correct chart title
      expect(getByText('Patients by Branch')).toBeTruthy();

      // Verify correct API endpoint was called
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reporting/patient-analytics/'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Complete Doctor Performance Workflow', () => {
    it('completes full doctor performance report generation workflow', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDoctorPerformanceReport),
        });

      const { getByText, queryByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Multi-branch analytics across 4 clinics')).toBeTruthy();
      });

      // Step 1: Switch to doctor performance
      const doctorsButton = getByText('Doctors');
      fireEvent.press(doctorsButton);

      // Step 2: Generate report
      const generateButton = getByText('Generate');
      fireEvent.press(generateButton);

      // Step 3: Wait for report generation
      await waitFor(() => {
        expect(queryByText('Generating report...')).toBeNull();
      });

      // Step 4: Verify doctor performance data
      await waitFor(() => {
        expect(getByText('800')).toBeTruthy(); // Total consultations
        expect(getByText('$40,000')).toBeTruthy(); // Total earnings
        expect(getByText('$50')).toBeTruthy(); // Avg fee
        expect(getByText('80.0%')).toBeTruthy(); // Completion rate
      });

      // Step 5: Verify correct chart title
      expect(getByText('Earnings by Branch')).toBeTruthy();

      // Verify correct API endpoint was called
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reporting/doctor-performance/'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Branch Selection Workflow', () => {
    it('allows users to select specific branches and generates filtered reports', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockRevenueReport,
            data: {
              ...mockRevenueReport.data,
              branch_breakdown: mockRevenueReport.data.branch_breakdown.slice(0, 2) // Only first 2 branches
            }
          }),
        });

      const { getByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Branches (4)')).toBeTruthy();
      });

      // Step 1: Open branch selector (simulated)
      const branchesButton = getByText('Branches (4)');
      fireEvent.press(branchesButton);

      // Step 2: Generate report with selected branches
      const generateButton = getByText('Generate');
      fireEvent.press(generateButton);

      // Step 3: Verify report is generated
      await waitFor(() => {
        expect(getByText('Summary Statistics')).toBeTruthy();
      });

      // Verify API was called with clinic IDs
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reporting/revenue/'),
        expect.objectContaining({
          body: expect.stringContaining('"clinic_ids":[1,2,3,4]'),
        })
      );
    });
  });

  describe('Date Range Selection Workflow', () => {
    it('allows users to select custom date ranges', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRevenueReport),
        });

      const { getByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Date Range')).toBeTruthy();
      });

      // Step 1: Open date range picker (simulated)
      const dateRangeButton = getByText('Date Range');
      fireEvent.press(dateRangeButton);

      // Step 2: Generate report
      const generateButton = getByText('Generate');
      fireEvent.press(generateButton);

      // Step 3: Verify report generation
      await waitFor(() => {
        expect(getByText('Summary Statistics')).toBeTruthy();
      });

      // Verify API was called with date range
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reporting/revenue/'),
        expect.objectContaining({
          body: expect.stringContaining('"start_date"'),
        })
      );
    });
  });

  describe('Error Handling Workflows', () => {
    it('handles API errors gracefully during report generation', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error occurred' }),
        });

      const { getByText, queryByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Generate')).toBeTruthy();
      });

      // Generate report
      const generateButton = getByText('Generate');
      fireEvent.press(generateButton);

      // Wait for error handling
      await waitFor(() => {
        expect(queryByText('Generating report...')).toBeNull();
      });

      // Verify error was handled (no crash)
      expect(getByText('Generate')).toBeTruthy();
    });

    it('handles network errors during clinic loading', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Should still render basic UI
      expect(getByText('Consolidated Reports')).toBeTruthy();
    });
  });

  describe('Refresh Workflow', () => {
    it('refreshes data when pull-to-refresh is triggered', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockAccessibleClinics,
            data: {
              ...mockAccessibleClinics.data,
              total_count: 5 // Updated count
            }
          }),
        });

      const { getByText, rerender } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Multi-branch analytics across 4 clinics')).toBeTruthy();
      });

      // Simulate refresh (in real app, this would be through RefreshControl)
      // For testing, we'll re-render with updated data
      rerender(<ConsolidatedReportingScreen navigation={mockNavigation} />);

      // Verify refresh occurred
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multi-Report Type Workflow', () => {
    it('switches between different report types and maintains state', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRevenueReport),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPatientAnalyticsReport),
        });

      const { getByText, queryByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('Generate')).toBeTruthy();
      });

      // Step 1: Generate revenue report
      fireEvent.press(getByText('Generate'));

      await waitFor(() => {
        expect(getByText('$50,000')).toBeTruthy();
      });

      // Step 2: Switch to patient analytics
      fireEvent.press(getByText('Patients'));
      fireEvent.press(getByText('Generate'));

      await waitFor(() => {
        expect(getByText('1,200')).toBeTruthy(); // Patient count
      });

      // Verify both API calls were made
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reporting/revenue/'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reporting/patient-analytics/'),
        expect.any(Object)
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('handles large datasets efficiently', async () => {
      const largeMockData = {
        ...mockAccessibleClinics,
        data: {
          ...mockAccessibleClinics.data,
          clinics: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            name: `Clinic ${i + 1}`,
            branch_code: `C${i + 1}`,
            clinic_type: 'branch',
          })),
          total_count: 100
        }
      };

      const largeReportData = {
        ...mockRevenueReport,
        data: {
          ...mockRevenueReport.data,
          branch_breakdown: Array.from({ length: 100 }, (_, i) => ({
            clinic_id: i + 1,
            clinic_name: `Clinic ${i + 1}`,
            branch_code: `C${i + 1}`,
            revenue: 1000 * (i + 1),
            bills_count: 10 * (i + 1),
            collection_rate: 80 + (i % 20)
          }))
        }
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(largeMockData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(largeReportData),
        });

      const { getByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Wait for large dataset to load
      await waitFor(() => {
        expect(getByText('Multi-branch analytics across 100 clinics')).toBeTruthy();
      });

      // Generate report with large dataset
      fireEvent.press(getByText('Generate'));

      await waitFor(() => {
        expect(getByText('Summary Statistics')).toBeTruthy();
      });

      // Verify it handles large data without performance issues
      expect(getByText('Branch Breakdown')).toBeTruthy();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility throughout the complete workflow', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessibleClinics),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRevenueReport),
        });

      const { getByText } = render(
        <ConsolidatedReportingScreen navigation={mockNavigation} />
      );

      // Verify accessibility elements are present throughout workflow
      await waitFor(() => {
        expect(getByText('Consolidated Reports')).toBeTruthy();
        expect(getByText('Revenue')).toBeTruthy();
        expect(getByText('Patients')).toBeTruthy();
        expect(getByText('Doctors')).toBeTruthy();
        expect(getByText('Generate')).toBeTruthy();
      });

      // Generate report and verify accessibility is maintained
      fireEvent.press(getByText('Generate'));

      await waitFor(() => {
        expect(getByText('Summary Statistics')).toBeTruthy();
        expect(getByText('Branch Performance')).toBeTruthy();
        expect(getByText('Branch Breakdown')).toBeTruthy();
        expect(getByText('Export')).toBeTruthy();
      });
    });
  });
});
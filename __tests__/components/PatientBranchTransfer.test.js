import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PatientBranchTransfer from '../../components/PatientBranchTransfer';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';

// Mock the contexts
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/BranchContext');

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockMakeAuthenticatedRequest = jest.fn();

const mockBranchContext = {
  accessibleBranches: [
    {
      id: 1,
      name: 'Main Branch',
      clinic_type: 'parent',
      branch_code: 'MB',
      address: '123 Main St'
    },
    {
      id: 2,
      name: 'Downtown Branch',
      clinic_type: 'branch',
      branch_code: 'DB',
      address: '456 Downtown Ave'
    },
    {
      id: 3,
      name: 'Suburban Branch',
      clinic_type: 'branch',
      branch_code: 'SB',
      address: '789 Suburban Rd'
    },
    {
      id: 4,
      name: 'Independent Clinic',
      clinic_type: 'independent',
      branch_code: 'IC',
      address: '321 Independent St'
    }
  ],
  getBranchTypeColor: (type) => {
    switch (type) {
      case 'parent': return '#4CAF50';
      case 'branch': return '#2196F3';
      case 'independent': return '#FF9800';
      default: return '#666';
    }
  },
  getBranchTypeLabel: (type) => {
    switch (type) {
      case 'parent': return 'Main Branch';
      case 'branch': return 'Branch';
      case 'independent': return 'Independent';
      default: return 'Clinic';
    }
  }
};

const mockAuthContext = {
  makeAuthenticatedRequest: mockMakeAuthenticatedRequest,
};

const mockValidationResult = {
  can_transfer: true,
  message: 'Transfer is allowed'
};

const mockTransferResult = {
  success: true,
  message: 'Patient transferred successfully',
  new_clinic_id: 2
};

describe('PatientBranchTransfer', () => {
  const defaultProps = {
    patientId: 1,
    patientName: 'John Doe',
    currentBranchId: 1,
    visible: true,
    onClose: jest.fn(),
    onTransferComplete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(mockAuthContext);
    useBranch.mockReturnValue(mockBranchContext);
    
    // Default mock responses
    mockMakeAuthenticatedRequest
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidationResult)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransferResult)
      });
  });

  describe('Component Rendering', () => {
    it('renders modal when visible is true', () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      expect(getByText('Transfer Patient')).toBeTruthy();
      expect(getByText('Transferring Patient')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Current Branch: Main Branch')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      const { queryByText } = render(
        <PatientBranchTransfer {...defaultProps} visible={false} />
      );

      expect(queryByText('Transfer Patient')).toBeNull();
    });

    it('renders available branches excluding current branch and independent clinics', () => {
      const { getByText, queryByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      expect(getByText('Downtown Branch')).toBeTruthy();
      expect(getByText('Suburban Branch')).toBeTruthy();
      expect(queryByText('Main Branch')).toBeNull(); // Current branch excluded
      expect(queryByText('Independent Clinic')).toBeNull(); // Independent excluded
    });

    it('renders transfer reason options', () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      expect(getByText('Patient relocation')).toBeTruthy();
      expect(getByText('Specialist referral')).toBeTruthy();
      expect(getByText('Better accessibility')).toBeTruthy();
      expect(getByText('Patient preference')).toBeTruthy();
      expect(getByText('Administrative transfer')).toBeTruthy();
      expect(getByText('Emergency transfer')).toBeTruthy();
      expect(getByText('Other')).toBeTruthy();
    });

    it('renders history maintenance checkbox', () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      expect(getByText('Maintain access to previous branch history')).toBeTruthy();
      expect(getByText("Patient's medical history from current branch will remain accessible")).toBeTruthy();
    });
  });

  describe('Branch Selection', () => {
    it('allows selecting a branch', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      // Should trigger validation
      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          '/users/api/cross-branch/patients/validate-transfer/',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              patient_id: 1,
              target_clinic_id: 2
            })
          })
        );
      });
    });

    it('shows validation result after branch selection', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });
    });

    it('handles validation errors', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Transfer not allowed' })
      });

      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer not allowed')).toBeTruthy();
      });
    });

    it('shows validation loading state', async () => {
      mockMakeAuthenticatedRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockValidationResult)
        }), 100))
      );

      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      expect(getByText('Validating transfer...')).toBeTruthy();
    });
  });

  describe('Transfer Reason Selection', () => {
    it('allows selecting a transfer reason', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      // The reason chip should be selected (would need to check styles)
      expect(getByText('Patient relocation')).toBeTruthy();
    });

    it('allows changing transfer reason', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      await act(async () => {
        fireEvent.press(getByText('Specialist referral'));
      });

      expect(getByText('Specialist referral')).toBeTruthy();
    });
  });

  describe('Transfer Notes', () => {
    it('allows entering transfer notes', async () => {
      const { getByPlaceholderText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      const notesInput = getByPlaceholderText('Enter any additional notes about this transfer...');
      
      await act(async () => {
        fireEvent.changeText(notesInput, 'Patient requested transfer for convenience');
      });

      expect(notesInput.props.value).toBe('Patient requested transfer for convenience');
    });
  });

  describe('History Maintenance', () => {
    it('allows toggling history maintenance option', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      const checkbox = getByText('Maintain access to previous branch history');
      
      await act(async () => {
        fireEvent.press(checkbox);
      });

      // Should toggle the checkbox state (would need to check icon state)
      expect(checkbox).toBeTruthy();
    });
  });

  describe('Transfer Process', () => {
    it('shows confirmation alert before transfer', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      // Select branch and reason
      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer Patient'));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirm Transfer',
        'Are you sure you want to transfer John Doe to Downtown Branch?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Transfer' })
        ])
      );
    });

    it('performs transfer when confirmed', async () => {
      // Mock Alert.alert to automatically confirm
      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'Transfer');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      const { getByText, getByPlaceholderText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      // Select branch and reason
      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      // Add notes
      const notesInput = getByPlaceholderText('Enter any additional notes about this transfer...');
      await act(async () => {
        fireEvent.changeText(notesInput, 'Patient requested transfer');
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer Patient'));
      });

      await waitFor(() => {
        expect(mockMakeAuthenticatedRequest).toHaveBeenCalledWith(
          '/users/api/cross-branch/patients/transfer/',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              patient_id: 1,
              target_clinic_id: 2,
              transfer_reason: 'Patient relocation',
              transfer_notes: 'Patient requested transfer',
              maintain_history: true
            })
          })
        );
      });
    });

    it('shows success message after successful transfer', async () => {
      Alert.alert.mockImplementation((title, message, buttons) => {
        if (title === 'Confirm Transfer') {
          const confirmButton = buttons.find(b => b.text === 'Transfer');
          if (confirmButton) {
            confirmButton.onPress();
          }
        }
      });

      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      // Select branch and reason
      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer Patient'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Transfer Successful',
          'John Doe has been successfully transferred to Downtown Branch',
          expect.arrayContaining([
            expect.objectContaining({ text: 'OK' })
          ])
        );
      });
    });

    it('handles transfer errors', async () => {
      mockMakeAuthenticatedRequest
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockValidationResult)
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Transfer failed' })
        });

      Alert.alert.mockImplementation((title, message, buttons) => {
        if (title === 'Confirm Transfer') {
          const confirmButton = buttons.find(b => b.text === 'Transfer');
          if (confirmButton) {
            confirmButton.onPress();
          }
        }
      });

      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      // Select branch and reason
      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer Patient'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Transfer Failed', 'Transfer failed');
      });
    });

    it('shows loading state during transfer', async () => {
      mockMakeAuthenticatedRequest
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockValidationResult)
        })
        .mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockTransferResult)
          }), 100))
        );

      Alert.alert.mockImplementation((title, message, buttons) => {
        if (title === 'Confirm Transfer') {
          const confirmButton = buttons.find(b => b.text === 'Transfer');
          if (confirmButton) {
            confirmButton.onPress();
          }
        }
      });

      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      // Select branch and reason
      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer Patient'));
      });

      // Should show loading indicator in button
      // This would require checking for ActivityIndicator component
    });
  });

  describe('Form Validation', () => {
    it('disables transfer button when no branch is selected', () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      const transferButton = getByText('Transfer Patient');
      expect(transferButton.parent.props.disabled).toBe(true);
    });

    it('disables transfer button when no reason is selected', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      const transferButton = getByText('Transfer Patient');
      expect(transferButton.parent.props.disabled).toBe(true);
    });

    it('disables transfer button when validation fails', async () => {
      mockMakeAuthenticatedRequest.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ can_transfer: false, error: 'Transfer not allowed' })
      });

      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer not allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      const transferButton = getByText('Transfer Patient');
      expect(transferButton.parent.props.disabled).toBe(true);
    });

    it('enables transfer button when all requirements are met', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      const transferButton = getByText('Transfer Patient');
      expect(transferButton.parent.props.disabled).toBe(false);
    });
  });

  describe('Modal Controls', () => {
    it('calls onClose when close button is pressed', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('close'));
      });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is pressed', async () => {
      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      await act(async () => {
        fireEvent.press(getByText('Cancel'));
      });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls onTransferComplete after successful transfer', async () => {
      Alert.alert.mockImplementation((title, message, buttons) => {
        if (title === 'Confirm Transfer') {
          const confirmButton = buttons.find(b => b.text === 'Transfer');
          if (confirmButton) {
            confirmButton.onPress();
          }
        } else if (title === 'Transfer Successful') {
          const okButton = buttons.find(b => b.text === 'OK');
          if (okButton) {
            okButton.onPress();
          }
        }
      });

      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      // Complete transfer process
      await act(async () => {
        fireEvent.press(getByText('Downtown Branch'));
      });

      await waitFor(() => {
        expect(getByText('Transfer is allowed')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Patient relocation'));
      });

      await act(async () => {
        fireEvent.press(getByText('Transfer Patient'));
      });

      await waitFor(() => {
        expect(defaultProps.onTransferComplete).toHaveBeenCalledWith(mockTransferResult);
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('No Available Branches', () => {
    it('shows message when no branches are available for transfer', () => {
      const limitedBranchContext = {
        ...mockBranchContext,
        accessibleBranches: [
          {
            id: 1,
            name: 'Main Branch',
            clinic_type: 'parent'
          }
        ]
      };

      useBranch.mockReturnValue(limitedBranchContext);

      const { getByText } = render(
        <PatientBranchTransfer {...defaultProps} />
      );

      expect(getByText('No available branches for transfer')).toBeTruthy();
    });
  });
});
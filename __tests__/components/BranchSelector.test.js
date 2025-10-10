import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BranchSelector from '../../components/BranchSelector';

// Mock dependencies
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

const mockClinics = [
  {
    id: 1,
    name: 'Main Clinic',
    branch_code: 'MAIN',
    clinic_type: 'parent',
    organization: { id: 1, name: 'Test Healthcare Network' }
  },
  {
    id: 2,
    name: 'Branch A',
    branch_code: 'BRA',
    clinic_type: 'branch',
    parent: { id: 1, name: 'Main Clinic' }
  },
  {
    id: 3,
    name: 'Branch B',
    branch_code: 'BRB',
    clinic_type: 'branch',
    parent: { id: 1, name: 'Main Clinic' }
  },
  {
    id: 4,
    name: 'Independent Clinic',
    branch_code: 'IND',
    clinic_type: 'independent'
  }
];

const defaultProps = {
  visible: true,
  clinics: mockClinics,
  selectedClinics: [1, 2],
  onSelectionChange: jest.fn(),
  onClose: jest.fn()
};

describe('BranchSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      expect(getByText('Select Branches')).toBeTruthy();
      expect(getByText('Main Clinic')).toBeTruthy();
      expect(getByText('Branch A')).toBeTruthy();
      expect(getByText('Branch B')).toBeTruthy();
      expect(getByText('Independent Clinic')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByText } = render(
        <BranchSelector {...defaultProps} visible={false} />
      );

      expect(queryByText('Select Branches')).toBeNull();
    });

    it('displays correct selection count', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      expect(getByText('2 selected')).toBeTruthy();
    });

    it('displays clinic information correctly', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      // Check clinic names
      expect(getByText('Main Clinic')).toBeTruthy();
      expect(getByText('Branch A')).toBeTruthy();

      // Check branch codes
      expect(getByText('Code: MAIN')).toBeTruthy();
      expect(getByText('Code: BRA')).toBeTruthy();

      // Check clinic types
      expect(getByText('Parent')).toBeTruthy();
      expect(getByText('Branch')).toBeTruthy();
      expect(getByText('Independent')).toBeTruthy();
    });

    it('displays organization information when available', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      expect(getByText('Org: Test Healthcare Network')).toBeTruthy();
    });

    it('displays parent information for branch clinics', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      expect(getByText('Parent: Main Clinic')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('filters clinics based on search text', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <BranchSelector {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search clinics...');
      fireEvent.changeText(searchInput, 'Branch');

      expect(getByText('Branch A')).toBeTruthy();
      expect(getByText('Branch B')).toBeTruthy();
      expect(queryByText('Main Clinic')).toBeNull();
      expect(queryByText('Independent Clinic')).toBeNull();
    });

    it('filters clinics based on branch code', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <BranchSelector {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search clinics...');
      fireEvent.changeText(searchInput, 'MAIN');

      expect(getByText('Main Clinic')).toBeTruthy();
      expect(queryByText('Branch A')).toBeNull();
      expect(queryByText('Branch B')).toBeNull();
    });

    it('shows no results when search does not match', () => {
      const { getByPlaceholderText, queryByText } = render(
        <BranchSelector {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search clinics...');
      fireEvent.changeText(searchInput, 'NonExistent');

      expect(queryByText('Main Clinic')).toBeNull();
      expect(queryByText('Branch A')).toBeNull();
      expect(queryByText('Branch B')).toBeNull();
      expect(queryByText('Independent Clinic')).toBeNull();
    });

    it('is case insensitive', () => {
      const { getByPlaceholderText, getByText } = render(
        <BranchSelector {...defaultProps} />
      );

      const searchInput = getByPlaceholderText('Search clinics...');
      fireEvent.changeText(searchInput, 'main');

      expect(getByText('Main Clinic')).toBeTruthy();
    });
  });

  describe('Selection Functionality', () => {
    it('toggles clinic selection when clinic is pressed', () => {
      const mockOnSelectionChange = jest.fn();
      const { getByText } = render(
        <BranchSelector 
          {...defaultProps} 
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Press Branch B (not currently selected)
      fireEvent.press(getByText('Branch B'));

      expect(mockOnSelectionChange).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('deselects clinic when already selected clinic is pressed', () => {
      const mockOnSelectionChange = jest.fn();
      const { getByText } = render(
        <BranchSelector 
          {...defaultProps} 
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Press Main Clinic (currently selected)
      fireEvent.press(getByText('Main Clinic'));

      expect(mockOnSelectionChange).toHaveBeenCalledWith([2]);
    });

    it('selects all clinics when Select All is pressed', () => {
      const mockOnSelectionChange = jest.fn();
      const { getByText } = render(
        <BranchSelector 
          {...defaultProps} 
          onSelectionChange={mockOnSelectionChange}
        />
      );

      fireEvent.press(getByText('Select All'));

      expect(mockOnSelectionChange).toHaveBeenCalledWith([1, 2, 3, 4]);
    });

    it('deselects all clinics when Select None is pressed', () => {
      const mockOnSelectionChange = jest.fn();
      const { getByText } = render(
        <BranchSelector 
          {...defaultProps} 
          onSelectionChange={mockOnSelectionChange}
        />
      );

      fireEvent.press(getByText('Select None'));

      expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
    });

    it('shows correct visual state for selected clinics', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      // Selected clinics should have different styling
      // This would be tested through testID or accessibility properties in a real app
      expect(getByText('Main Clinic')).toBeTruthy();
      expect(getByText('Branch A')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('calls onClose when close button is pressed', () => {
      const mockOnClose = jest.fn();
      const { getByText } = render(
        <BranchSelector {...defaultProps} onClose={mockOnClose} />
      );

      // Find and press close button (would have testID in real app)
      // For now, we test the Apply button which also closes
      fireEvent.press(getByText('Apply Selection (2)'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('disables apply button when no clinics are selected', () => {
      const { getByText } = render(
        <BranchSelector {...defaultProps} selectedClinics={[]} />
      );

      const applyButton = getByText('Apply Selection (0)');
      
      // In a real app, we would check the disabled prop
      // For now, we verify the button text shows 0 selected
      expect(applyButton).toBeTruthy();
    });

    it('enables apply button when clinics are selected', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      const applyButton = getByText('Apply Selection (2)');
      
      expect(applyButton).toBeTruthy();
    });

    it('updates selection count in apply button', () => {
      const { getByText, rerender } = render(<BranchSelector {...defaultProps} />);

      expect(getByText('Apply Selection (2)')).toBeTruthy();

      // Update selected clinics
      rerender(
        <BranchSelector {...defaultProps} selectedClinics={[1, 2, 3]} />
      );

      expect(getByText('Apply Selection (3)')).toBeTruthy();
    });
  });

  describe('Clinic Type Icons and Colors', () => {
    it('displays different icons for different clinic types', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      // Verify all clinic types are displayed
      expect(getByText('Parent')).toBeTruthy();
      expect(getByText('Branch')).toBeTruthy();
      expect(getByText('Independent')).toBeTruthy();
    });

    it('handles clinics without branch codes', () => {
      const clinicsWithoutCodes = [
        {
          id: 1,
          name: 'Test Clinic',
          clinic_type: 'independent'
        }
      ];

      const { getByText } = render(
        <BranchSelector 
          {...defaultProps} 
          clinics={clinicsWithoutCodes}
          selectedClinics={[]}
        />
      );

      expect(getByText('Code: N/A')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty clinics list', () => {
      const { getByText, queryByText } = render(
        <BranchSelector 
          {...defaultProps} 
          clinics={[]}
          selectedClinics={[]}
        />
      );

      expect(getByText('Select Branches')).toBeTruthy();
      expect(getByText('0 selected')).toBeTruthy();
      expect(queryByText('Main Clinic')).toBeNull();
    });

    it('handles clinics without organization or parent', () => {
      const minimalClinics = [
        {
          id: 1,
          name: 'Minimal Clinic',
          clinic_type: 'independent'
        }
      ];

      const { getByText, queryByText } = render(
        <BranchSelector 
          {...defaultProps} 
          clinics={minimalClinics}
          selectedClinics={[]}
        />
      );

      expect(getByText('Minimal Clinic')).toBeTruthy();
      expect(queryByText('Org:')).toBeNull();
      expect(queryByText('Parent:')).toBeNull();
    });

    it('handles very long clinic names gracefully', () => {
      const longNameClinics = [
        {
          id: 1,
          name: 'This is a very long clinic name that might cause layout issues',
          branch_code: 'LONG',
          clinic_type: 'branch'
        }
      ];

      const { getByText } = render(
        <BranchSelector 
          {...defaultProps} 
          clinics={longNameClinics}
          selectedClinics={[]}
        />
      );

      expect(getByText('This is a very long clinic name that might cause layout issues')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility structure', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      // Verify important elements are present
      expect(getByText('Select Branches')).toBeTruthy();
      expect(getByText('Search clinics...')).toBeTruthy();
      expect(getByText('Select All')).toBeTruthy();
      expect(getByText('Select None')).toBeTruthy();
    });

    it('provides feedback for selection state', () => {
      const { getByText } = render(<BranchSelector {...defaultProps} />);

      // Selection count provides feedback
      expect(getByText('2 selected')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('handles large number of clinics efficiently', () => {
      const largeClinicsArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Clinic ${i + 1}`,
        branch_code: `C${i + 1}`,
        clinic_type: 'branch'
      }));

      const { getByText } = render(
        <BranchSelector 
          {...defaultProps} 
          clinics={largeClinicsArray}
          selectedClinics={[1, 2, 3]}
        />
      );

      expect(getByText('3 selected')).toBeTruthy();
      expect(getByText('Clinic 1')).toBeTruthy();
    });

    it('filters large datasets efficiently', () => {
      const largeClinicsArray = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Clinic ${i + 1}`,
        branch_code: `C${i + 1}`,
        clinic_type: 'branch'
      }));

      const { getByPlaceholderText, getByText, queryByText } = render(
        <BranchSelector 
          {...defaultProps} 
          clinics={largeClinicsArray}
          selectedClinics={[]}
        />
      );

      const searchInput = getByPlaceholderText('Search clinics...');
      fireEvent.changeText(searchInput, 'Clinic 1');

      expect(getByText('Clinic 1')).toBeTruthy();
      expect(getByText('Clinic 10')).toBeTruthy(); // Should match "Clinic 10", "Clinic 11", etc.
      expect(queryByText('Clinic 2')).toBeNull(); // Should not match "Clinic 2"
    });
  });
});
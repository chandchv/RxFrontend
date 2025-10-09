/**
 * RxDoctor Branch Management Design System
 * 
 * This file contains shared design tokens and styles
 * for consistent UI/UX across React Native components.
 * 
 * Design Principles:
 * - Consistent color palette
 * - Unified typography scale
 * - Standardized spacing system
 * - Accessible contrast ratios
 * - Platform-specific adaptations
 */

import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ===================================
// Design Tokens
// ===================================

export const Colors = {
  // Brand Colors
  primary: '#007AFF',
  primaryDark: '#0056CC',
  primaryLight: '#4DA3FF',
  primaryBg: '#F0F8FF',
  
  // Branch Type Colors
  parent: '#4CAF50',
  parentBg: '#E8F5E8',
  branch: '#2196F3',
  branchBg: '#E3F2FD',
  independent: '#FF9800',
  independentBg: '#FFF3E0',
  
  // Semantic Colors
  success: '#28A745',
  successBg: '#D4EDDA',
  warning: '#FFC107',
  warningBg: '#FFF3CD',
  error: '#DC3545',
  errorBg: '#F8D7DA',
  info: '#17A2B8',
  infoBg: '#D1ECF1',
  
  // Neutral Colors
  gray50: '#F8F9FA',
  gray100: '#E9ECEF',
  gray200: '#DEE2E6',
  gray300: '#CED4DA',
  gray400: '#ADB5BD',
  gray500: '#6C757D',
  gray600: '#495057',
  gray700: '#343A40',
  gray800: '#212529',
  gray900: '#000000',
  white: '#FFFFFF',
  
  // Text Colors
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  textMuted: '#ADB5BD',
  textInverse: '#FFFFFF',
};

export const Typography = {
  // Font Families
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  fontFamilyMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,   // 1
  sm: 8,   // 2
  md: 12,  // 3
  base: 16, // 4
  lg: 20,  // 5
  xl: 24,  // 6
  '2xl': 32, // 8
  '3xl': 40, // 10
  '4xl': 48, // 12
  '5xl': 64, // 16
};

export const BorderRadius = {
  sm: 4,
  base: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
};

// ===================================
// Component Styles
// ===================================

export const BranchStyles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  
  contentContainer: {
    padding: Spacing.base,
  },
  
  section: {
    marginBottom: Spacing.xl,
  },
  
  // Typography Styles
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  
  body: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  
  caption: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    color: Colors.textSecondary,
  },
  
  // Branch Selector Styles
  branchSelector: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.gray300,
    ...Shadows.sm,
  },
  
  branchSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  
  branchSelectorText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  
  branchSelectorIcon: {
    color: Colors.gray500,
  },
  
  // Branch Context Indicator Styles
  branchContext: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.base,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  
  branchContextInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  
  branchContextName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  
  branchContextDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  branchContextType: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  
  branchContextCode: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  
  // Branch Badge Styles
  branchBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  
  branchBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  branchBadgeParent: {
    backgroundColor: Colors.parentBg,
  },
  
  branchBadgeParentText: {
    color: Colors.parent,
  },
  
  branchBadgeBranch: {
    backgroundColor: Colors.branchBg,
  },
  
  branchBadgeBranchText: {
    color: Colors.branch,
  },
  
  branchBadgeIndependent: {
    backgroundColor: Colors.independentBg,
  },
  
  branchBadgeIndependentText: {
    color: Colors.independent,
  },
  
  // Branch Card Styles
  branchCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadows.base,
  },
  
  branchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  
  branchCardInfo: {
    flex: 1,
  },
  
  branchCardName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  
  branchCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  
  branchCardAddress: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  
  branchCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.gray100,
    marginBottom: Spacing.md,
  },
  
  branchCardStat: {
    alignItems: 'center',
  },
  
  branchCardStatNumber: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  
  branchCardStatLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  
  branchCardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  
  // Button Styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  
  buttonSecondary: {
    backgroundColor: Colors.gray500,
  },
  
  buttonOutline: {
    backgroundColor: 'transparent',
    borderColor: Colors.gray300,
  },
  
  buttonSmall: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  
  buttonLarge: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  
  buttonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.white,
  },
  
  buttonTextOutline: {
    color: Colors.textPrimary,
  },
  
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  
  buttonIconRight: {
    marginLeft: Spacing.sm,
    marginRight: 0,
  },
  
  // Loading Styles
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    padding: Spacing['4xl'],
  },
  
  emptyStateIcon: {
    fontSize: 64,
    color: Colors.gray300,
    marginBottom: Spacing.base,
  },
  
  emptyStateTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  
  emptyStateDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  
  // Modal Styles
  modal: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  
  modalCloseButton: {
    padding: Spacing.sm,
  },
  
  modalContent: {
    flex: 1,
    padding: Spacing.base,
  },
  
  modalFooter: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
  },
  
  searchIcon: {
    marginRight: Spacing.sm,
    color: Colors.gray500,
  },
  
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    padding: 0, // Remove default padding on Android
  },
  
  // List Styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  
  listItemSelected: {
    backgroundColor: Colors.primaryBg,
    borderBottomColor: Colors.primary,
  },
  
  listItemContent: {
    flex: 1,
  },
  
  listItemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  
  listItemSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  
  listItemAction: {
    marginLeft: Spacing.md,
  },
  
  // Checkbox Styles
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  
  checkboxIcon: {
    color: Colors.white,
  },
});

// ===================================
// Utility Functions
// ===================================

export const getBranchTypeColor = (clinicType) => {
  switch (clinicType) {
    case 'parent':
      return Colors.parent;
    case 'branch':
      return Colors.branch;
    case 'independent':
      return Colors.independent;
    default:
      return Colors.gray500;
  }
};

export const getBranchTypeBgColor = (clinicType) => {
  switch (clinicType) {
    case 'parent':
      return Colors.parentBg;
    case 'branch':
      return Colors.branchBg;
    case 'independent':
      return Colors.independentBg;
    default:
      return Colors.gray100;
  }
};

export const getBranchTypeIcon = (clinicType) => {
  switch (clinicType) {
    case 'parent':
      return 'business';
    case 'branch':
      return 'location-on';
    case 'independent':
      return 'store';
    default:
      return 'business';
  }
};

export const getBranchTypeLabel = (clinicType) => {
  switch (clinicType) {
    case 'parent':
      return 'Main Branch';
    case 'branch':
      return 'Branch';
    case 'independent':
      return 'Independent';
    default:
      return 'Clinic';
  }
};

// ===================================
// Responsive Utilities
// ===================================

export const isTablet = screenWidth >= 768;
export const isLargeScreen = screenWidth >= 1024;

export const getResponsiveValue = (mobile, tablet, desktop) => {
  if (isLargeScreen && desktop !== undefined) {
    return desktop;
  }
  if (isTablet && tablet !== undefined) {
    return tablet;
  }
  return mobile;
};

export const responsiveStyles = StyleSheet.create({
  container: {
    paddingHorizontal: getResponsiveValue(Spacing.base, Spacing.xl, Spacing['2xl']),
  },
  
  grid: {
    flexDirection: getResponsiveValue('column', 'row', 'row'),
    flexWrap: 'wrap',
  },
  
  gridItem: {
    width: getResponsiveValue('100%', '48%', '32%'),
    marginBottom: Spacing.base,
  },
});

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  BranchStyles,
  getBranchTypeColor,
  getBranchTypeBgColor,
  getBranchTypeIcon,
  getBranchTypeLabel,
  isTablet,
  isLargeScreen,
  getResponsiveValue,
  responsiveStyles,
};
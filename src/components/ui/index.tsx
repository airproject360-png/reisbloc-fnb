/**
 * ============================================================
 * REISBLOC UI COMPONENT LIBRARY
 * ============================================================
 * 
 * Barrel export file for all UI components.
 * Provides a unified API for consistent design system usage.
 * 
 * USAGE:
 * import { Button, Card, Input, Alert } from '@/components/ui';
 */

// Form Components
export { Button } from './Button';
export { Card, Input, Select, Badge } from './FormComponents';

// Layout Components
export { Alert, Modal, Table, LoadingSpinner } from './LayoutComponents';

// Design System
export {
  designTokens,
  tailwindClasses,
  icons,
  breakpoints,
  animations,
  zIndex,
  classNames,
  getColorClass,
  getButtonClass,
} from '../styles/designSystem';

// ============================================================
// TYPE EXPORTS
// ============================================================

export type { ButtonProps } from './Button';
export type { CardProps, InputProps, SelectProps, BadgeProps } from './FormComponents';
export type { AlertProps, ModalProps, TableProps, TableColumn, LoadingSpinnerProps } from './LayoutComponents';

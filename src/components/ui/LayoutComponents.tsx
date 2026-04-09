import React, { useState } from 'react';

// ============================================================
// ALERT COMPONENT
// ============================================================

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      type = 'info',
      title,
      dismissible = true,
      onDismiss,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(true);

    const typeClasses = {
      success: 'bg-green-50 border-green-300 text-green-800',
      error: 'bg-red-50 border-red-300 text-red-800',
      warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
      info: 'bg-blue-50 border-blue-300 text-blue-800',
    };

    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '!',
      info: 'ℹ',
    };

    if (!isVisible) return null;

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    return (
      <div
        ref={ref}
        className={`
          px-4 py-4 rounded-md border flex gap-4
          ${typeClasses[type]}
          ${className}
        `}
        {...props}
      >
        <span className="flex-shrink-0 text-lg font-bold">{iconMap[type]}</span>

        <div className="flex-grow">
          {title && <strong className="block">{title}</strong>}
          <span className={title ? 'mt-1 block' : ''}>{children}</span>
        </div>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-lg hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// ============================================================
// MODAL COMPONENT
// ============================================================

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      size = 'md',
      children,
      footer,
      className = '',
      ...props
    },
    ref
  ) => {
    if (!isOpen) return null;

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
    };

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            ref={ref}
            className={`
              bg-white rounded-lg shadow-xl
              ${sizeClasses[size]}
              w-full
              ${className}
            `}
            {...props}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                {footer}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

Modal.displayName = 'Modal';

// ============================================================
// TABLE COMPONENT
// ============================================================

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export const Table = React.forwardRef<HTMLDivElement, TableProps<any>>(
  (
    {
      columns,
      data,
      onRowClick,
      isLoading = false,
      emptyMessage = 'No data available',
      className = '',
      ...props
    },
    ref
  ) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full"></div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div ref={ref} className={`overflow-x-auto rounded-lg border border-gray-200 ${className}`} {...props}>
        <table className="w-full">
          {/* Header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className="px-6 py-3 text-left text-sm font-semibold text-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`
                  border-b border-gray-200
                  ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                  transition-colors
                `}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-6 py-4 text-sm text-gray-900"
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

// ============================================================
// LOADING SPINNER
// ============================================================

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      size = 'md',
      message = 'Loading...',
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'w-6 h-6 border-2',
      md: 'w-8 h-8 border-4',
      lg: 'w-12 h-12 border-4',
    };

    return (
      <div ref={ref} className={`flex flex-col items-center justify-center gap-4 ${className}`} {...props}>
        <div
          className={`
            animate-spin inline-block
            border-current border-t-transparent rounded-full
            ${sizeClasses[size]}
          `}
        />
        {message && <span className="text-gray-600 text-sm">{message}</span>}
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

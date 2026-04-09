/**
 * ============================================================
 * REISBLOC POS - DESIGN SYSTEM & STYLE GUIDE
 * ============================================================
 * 
 * Esta guía define los estilos, colores y componentes uniformes
 * para toda la aplicación. Todos los módulos deben seguir estas
 * convenciones para mantener coherencia visual.
 */

// ============================================================
// 1. PALETA DE COLORES
// ============================================================

export const designTokens = {
  colors: {
    // PRIMARIOS
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',  // Azul principal
      600: '#2563EB',
      700: '#1D4ED8',
    },
    
    // SECUNDARIOS
    secondary: {
      50: '#F0FDF4',
      500: '#10B981',  // Verde éxito
      600: '#059669',
    },
    
    // STATUS
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    
    // NEUTRALES
    neutral: {
      0: '#FFFFFF',
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },

  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
  },

  borderRadius: {
    none: '0',
    sm: '0.375rem',   // 6px
    base: '0.5rem',   // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  typography: {
    heading1: {
      fontSize: '2rem',      // 32px
      fontWeight: 700,
      lineHeight: 1.2,
    },
    heading2: {
      fontSize: '1.5rem',    // 24px
      fontWeight: 700,
      lineHeight: 1.3,
    },
    heading3: {
      fontSize: '1.25rem',   // 20px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body: {
      fontSize: '1rem',      // 16px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: '0.875rem',  // 14px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    label: {
      fontSize: '0.875rem',  // 14px
      fontWeight: 500,
      lineHeight: 1.25,
    },
  },
};

// ============================================================
// 2. CLASES TAILWIND REUTILIZABLES
// ============================================================

export const tailwindClasses = {
  // LAYOUTS
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  pageWrapper: 'min-h-screen bg-gray-50',
  
  // CARDS
  card: 'bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow',
  cardPadding: 'p-6',
  
  // BOTONES
  buttonBase: 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  buttonSecondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400',
  buttonDanger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  buttonSuccess: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  buttonDisabled: 'opacity-50 cursor-not-allowed',
  
  // INPUTS
  input: 'w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  inputError: 'border-red-500 focus:ring-red-500',
  label: 'block text-sm font-medium text-gray-700 mb-2',
  
  // BADGES
  badgeSuccess: 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium',
  badgeWarning: 'bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium',
  badgeDanger: 'bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium',
  badgeInfo: 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium',
  
  // TABLES
  tableHeader: 'bg-gray-50 border-b border-gray-200 px-6 py-3 text-left font-semibold text-gray-700',
  tableCell: 'px-6 py-4 border-b border-gray-200 text-gray-900',
  tableRow: 'hover:bg-gray-50 transition-colors',
};

// ============================================================
// 3. COMPONENTES GLOBALES (Tailwind + Utility Classes)
// ============================================================

/**
 * USO EJEMPLO:
 * 
 * <div className={`${tailwindClasses.card} ${tailwindClasses.cardPadding}`}>
 *   <h3 className="text-lg font-semibold">Mi Card</h3>
 * </div>
 */

// ============================================================
// 4. PALETA DE ICONOS
// ============================================================

export const icons = {
  // GENÉRICOS
  check: '✓',
  close: '✕',
  add: '+',
  minus: '−',
  edit: '✎',
  delete: '🗑',
  search: '🔍',
  menu: '☰',
  
  // ESTADOS
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',
  
  // NAVEGACIÓN
  back: '←',
  forward: '→',
  up: '↑',
  down: '↓',
  
  // ACCIONES
  download: '⬇️',
  upload: '⬆️',
  refresh: '🔄',
  settings: '⚙️',
  logout: '🚪',
};

// ============================================================
// 5. BREAKPOINTS RESPONSIVO
// ============================================================

export const breakpoints = {
  xs: '320px',   // Mobile pequeño
  sm: '640px',   // Mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop pequeño
  xl: '1280px',  // Desktop
  '2xl': '1536px', // Desktop grande
};

// ============================================================
// 6. ANIMACIONES
// ============================================================

export const animations = {
  fadeIn: 'fade-in 0.3s ease-in',
  slideIn: 'slide-in 0.3s ease-out',
  spin: 'spin 1s linear infinite',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
};

// ============================================================
// 7. Z-INDEX
// ============================================================

export const zIndex = {
  hide: -1,
  base: 0,
  fixed: 10,
  modal: 50,
  tooltip: 60,
  notification: 70,
};

// ============================================================
// 8. FUNCIONES HELPER
// ============================================================

export function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function getColorClass(
  status: 'success' | 'warning' | 'danger' | 'info'
): string {
  const colorMap = {
    success: tailwindClasses.badgeSuccess,
    warning: tailwindClasses.badgeWarning,
    danger: tailwindClasses.badgeDanger,
    info: tailwindClasses.badgeInfo,
  };
  return colorMap[status];
}

export function getButtonClass(
  variant: 'primary' | 'secondary' | 'danger' | 'success' = 'primary'
): string {
  const variantMap = {
    primary: tailwindClasses.buttonPrimary,
    secondary: tailwindClasses.buttonSecondary,
    danger: tailwindClasses.buttonDanger,
    success: tailwindClasses.buttonSuccess,
  };
  return `${tailwindClasses.buttonBase} ${variantMap[variant]}`;
}

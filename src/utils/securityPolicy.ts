/**
 * Security & Compliance Policy Guidelines (OWASP Top 10 & PCI DSS Readiness)
 * Reisbloc POS - F&B Edition
 */

export interface SecurityAuditResult {
  passed: boolean;
  score: number; // 0 - 100
  findings: Array<{
    category: 'PCI_DSS' | 'OWASP' | 'DATA_PRIVACY' | 'AUTH';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    remediation: string;
  }>;
}

/**
 * Mask sensitive payment data (e.g. credit card last 4 digits only)
 * Ensures PCI DSS compliance (never store or display full PAN)
 */
export function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 4) return '****';
  return `**** **** **** ${clean.slice(-4)}`;
}

/**
 * Mask sensitive user PINs for staff
 */
export function maskPin(pin: string): string {
  return '•'.repeat(pin.length || 4);
}

/**
 * Sanitize input text against XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Perform security audit check on current client environment
 */
export function runSecurityAudit(): SecurityAuditResult {
  const findings: SecurityAuditResult['findings'] = [];

  // Check 1: HTTPS enforced
  if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    findings.push({
      category: 'PCI_DSS',
      severity: 'CRITICAL',
      message: 'Conexión no cifrada (HTTP en lugar de HTTPS)',
      remediation: 'Redirigir todo el tráfico a HTTPS con certificados TLS v1.3.'
    });
  }

  // Check 2: Storage checks
  if (typeof localStorage !== 'undefined') {
    const rawAuthToken = localStorage.getItem('reisbloc_auth_token');
    if (rawAuthToken && rawAuthToken.includes('cardNumber')) {
      findings.push({
        category: 'PCI_DSS',
        severity: 'CRITICAL',
        message: 'Posible almacenamiento de datos sensibles de tarjeta en LocalStorage',
        remediation: 'Elimine cualquier referencia a números de tarjeta completos en almacenamiento local.'
      });
    }
  }

  // Check 3: Content Security Policy
  const cspMeta = typeof document !== 'undefined' ? document.querySelector('meta[http-equiv="Content-Security-Policy"]') : null;
  if (!cspMeta) {
    findings.push({
      category: 'OWASP',
      severity: 'MEDIUM',
      message: 'Etiqueta meta CSP (Content Security Policy) no detectada en la página principal',
      remediation: 'Añadir directiva CSP restrictiva para prevenir inyección de scripts (XSS).'
    });
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'CRITICAL').length * 40 - findings.filter(f => f.severity === 'HIGH').length * 20 - findings.filter(f => f.severity === 'MEDIUM').length * 10);

  return {
    passed: findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length === 0,
    score,
    findings
  };
}

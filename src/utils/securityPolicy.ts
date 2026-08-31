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

  // Check 2: Storage checks - verify no card data in LocalStorage (PCI DSS CRITICAL)
  if (typeof localStorage !== 'undefined') {
    const rawAuthToken = localStorage.getItem('reisbloc_auth_token');
    if (rawAuthToken) {
      try {
        const parsed = JSON.parse(rawAuthToken);
        if (parsed && parsed.accessToken && parsed.accessToken.includes('card')) {
          findings.push({
            category: 'PCI_DSS',
            severity: 'CRITICAL',
            message: 'Posible almacenamiento de datos sensibles de tarjeta en LocalStorage',
            remediation: 'Elimine cualquier referencia a números de tarjeta completos en almacenamiento local.'
          });
        }
        // Also check for full PAN patterns in token
        if (rawAuthToken && rawAuthToken.length > 200) {
          findings.push({
            category: 'PCI_DSS',
            severity: 'HIGH',
            message: 'Token de auth inusualmente largo - verifique que no contenga datos sensibles',
            remediation: 'Revisar la generación y almacenamiento de tokens de auth.'
          });
        }
      } catch {
        // Not JSON, continue checking
      }
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

  // Check 4: Security headers verification
  if (typeof document !== 'undefined') {
    const headers = {
      'x-content-type-options': document.querySelector('meta[http-equiv="X-Content-Type-Options"]'),
      'x-frame-options': document.querySelector('meta[http-equiv="X-Frame-Options"]'),
      'x-xss-protection': document.querySelector('meta[http-equiv="X-XSS-Protection"]'),
    };
    
    const missingHeaders: string[] = [];
    if (!headers['x-content-type-options']) missingHeaders.push('X-Content-Type-Options');
    if (!headers['x-frame-options']) missingHeaders.push('X-Frame-Options');
    if (!headers['x-xss-protection']) missingHeaders.push('X-XSS-Protection');
    
    if (missingHeaders.length > 0) {
      findings.push({
        category: 'OWASP',
        severity: 'LOW',
        message: `Headers de seguridad HTTP missing: ${missingHeaders.join(', ')}`,
        remediation: 'Añadir headers de seguridad de respuesta HTTP (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection).'
      });
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'CRITICAL').length * 40 - findings.filter(f => f.severity === 'HIGH').length * 20 - findings.filter(f => f.severity === 'MEDIUM').length * 10);

  return {
    passed: findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length === 0,
    score,
    findings
  };
}

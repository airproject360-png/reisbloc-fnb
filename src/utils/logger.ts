type Level = 'info' | 'warn' | 'error'

const tag: Record<Level, string> = {
  info: 'LOG',
  warn: 'WARN',
  error: 'ERROR'
}

const icon: Record<Level, string> = {
  info: '🔎',
  warn: '⚠️',
  error: '❌'
}

function format(level: Level, scope: string, message: string) {
  return `${tag[level]}${icon[level]} [${scope}] ${message}`
}

const nativeConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

let loggerDepth = 0

function safeConsole(level: Level, payload: unknown[]) {
  // Prevent re-entrant loops if console methods are monkey-patched elsewhere.
  if (loggerDepth > 2) {
    return
  }

  loggerDepth += 1
  try {
    if (level === 'info') nativeConsole.log(...payload)
    if (level === 'warn') nativeConsole.warn(...payload)
    if (level === 'error') nativeConsole.error(...payload)
  } finally {
    loggerDepth -= 1
  }
}

export const logger = {
  info(scope: string, message: string, ...args: unknown[]) {
    safeConsole('info', [format('info', scope, message), ...args])
  },
  warn(scope: string, message: string, ...args: unknown[]) {
    safeConsole('warn', [format('warn', scope, message), ...args])
  },
  error(scope: string, message: string, ...args: unknown[]) {
    safeConsole('error', [format('error', scope, message), ...args])
  }
}

export default logger

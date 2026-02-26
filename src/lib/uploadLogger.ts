import type { UploadLogEntry } from '@/models/imageCollection';

export class UploadLogger {
  private logs: UploadLogEntry[] = [];

  info(message: string, details?: Record<string, any>) {
    this.addLog('info', message, details);
  }

  success(message: string, details?: Record<string, any>) {
    this.addLog('success', message, details);
  }

  warning(message: string, details?: Record<string, any>) {
    this.addLog('warning', message, details);
  }

  error(message: string, details?: Record<string, any>) {
    this.addLog('error', message, details);
  }

  private addLog(
    level: 'info' | 'success' | 'warning' | 'error',
    message: string,
    details?: Record<string, any>
  ) {
    const entry: UploadLogEntry = {
      timestamp: new Date(),
      level,
      message,
      ...(details && { details }),
    };
    
    this.logs.push(entry);
    
    // Also console log for server-side debugging
    const prefix = `[${level.toUpperCase()}]`;
    if (details) {
      console.log(prefix, message, details);
    } else {
      console.log(prefix, message);
    }
  }

  getLogs(): UploadLogEntry[] {
    return [...this.logs];
  }

  getLogCount(level?: 'info' | 'success' | 'warning' | 'error'): number {
    if (level) {
      return this.logs.filter(log => log.level === level).length;
    }
    return this.logs.length;
  }

  hasErrors(): boolean {
    return this.logs.some(log => log.level === 'error');
  }

  hasWarnings(): boolean {
    return this.logs.some(log => log.level === 'warning');
  }

  clear() {
    this.logs = [];
  }
}

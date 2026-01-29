/**
 * Simple logging utility
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatLog(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  private output(entry: LogEntry) {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${entry.message}`;

    if (entry.data) {
      console.log(message, entry.data);
    } else {
      console.log(message);
    }
  }

  info(message: string, data?: any) {
    this.output(this.formatLog('info', message, data));
  }

  warn(message: string, data?: any) {
    this.output(this.formatLog('warn', message, data));
  }

  error(message: string, data?: any) {
    this.output(this.formatLog('error', message, data));
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      this.output(this.formatLog('debug', message, data));
    }
  }
}

export const logger = new Logger();

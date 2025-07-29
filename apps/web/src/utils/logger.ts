// Simple logger utility that respects environment
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args); // eslint-disable-line no-console
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(...args); // eslint-disable-line no-console
  },
  error: (...args: unknown[]) => {
    console.error(...args); // eslint-disable-line no-console
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args); // eslint-disable-line no-console
    }
  }
};
/**
 * Mock Data Guard
 * Prevents mock data from being used in production
 */

import { EnvironmentConfig } from '../config/environment';
import * as fs from 'fs';

export class MockDataGuard {
  private static config = EnvironmentConfig.getInstance();
  
  /**
   * Decorator to prevent mock methods from running in production
   */
  static preventInProduction() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = function (...args: any[]) {
        if (MockDataGuard.config.isProduction()) {
          console.error(`❌ Attempted to call mock method '${propertyKey}' in production!`);
          
          // Log to monitoring service
          MockDataGuard.logSecurityViolation({
            type: 'mock_data_in_production',
            method: propertyKey,
            class: target.constructor.name,
            timestamp: new Date().toISOString()
          });
          
          // Return empty array instead of mock data
          return [];
        }
        
        // In development/test, allow mock data but log it
        console.warn(`⚠️ Using mock data from ${propertyKey} (${MockDataGuard.config.isDevelopment() ? 'dev' : 'test'} mode)`);
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
  
  /**
   * Runtime check before returning mock data
   */
  static checkMockAllowed(context: string): boolean {
    if (!MockDataGuard.config.canUseMockData()) {
      console.error(`❌ Mock data requested in production context: ${context}`);
      
      // In production, log this as a critical issue
      if (MockDataGuard.config.isProduction()) {
        MockDataGuard.logSecurityViolation({
          type: 'mock_data_attempt',
          context,
          timestamp: new Date().toISOString()
        });
      }
      
      return false;
    }
    
    return true;
  }
  
  /**
   * Wrap any mock data with this guard
   */
  static wrapMockData<T>(data: T, source: string): T | [] {
    if (!MockDataGuard.checkMockAllowed(source)) {
      return [] as any; // Return empty instead of mock
    }
    
    // Add metadata to track mock data
    if (typeof data === 'object' && data !== null) {
      (data as any).__isMockData = true;
      (data as any).__mockSource = source;
      (data as any).__mockTimestamp = Date.now();
    }
    
    return data;
  }
  
  /**
   * Check if data is mock (for debugging)
   */
  static isMockData(data: any): boolean {
    return data && data.__isMockData === true;
  }
  
  /**
   * Log security violations (mock data in production)
   */
  private static logSecurityViolation(violation: any): void {
    // Log to console with high visibility
    console.error('🚨 SECURITY VIOLATION 🚨');
    console.error(JSON.stringify(violation, null, 2));
    
    // In production, you would send this to your monitoring service
    // Examples:
    // - Sentry.captureException(new Error('Mock data in production'), { extra: violation });
    // - DataDog.log('error', 'Mock data attempted in production', violation);
    // - CloudWatch.putMetricData({ MetricName: 'MockDataViolation', Value: 1 });
    
    // Could also write to a security audit log
    if (process.env.SECURITY_AUDIT_LOG) {
      fs.appendFileSync(
        process.env.SECURITY_AUDIT_LOG,
        JSON.stringify({ ...violation, severity: 'CRITICAL' }) + '\n'
      );
    }
  }
}
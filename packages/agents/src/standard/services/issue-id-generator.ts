/**
 * Issue ID Generator Service
 * Generates unique IDs for issues based on their content
 */

import * as crypto from 'crypto';

export class IssueIdGenerator {
  /**
   * Generate a unique ID for an issue based on its content
   */
  static generateIssueId(issue: {
    category?: string;
    type?: string;
    location?: { file?: string; line?: number };
    message?: string;
    severity?: string;
  }): string {
    const components = [
      issue.category || 'unknown',
      issue.type || 'issue',
      issue.location?.file || 'unknown',
      issue.location?.line?.toString() || '0',
      issue.message || 'no-message'
    ];
    
    const hash = crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 8);
    
    return `${issue.category}-${issue.type}-${hash}`;
  }
  
  /**
   * Generate a fingerprint for an issue for matching purposes
   */
  static generateFingerprint(issue: {
    category?: string;
    location?: { file?: string; line?: number };
    message?: string;
  }): string {
    const components = [
      issue.category || '',
      issue.location?.file || '',
      issue.message || ''
    ];
    
    return crypto
      .createHash('md5')
      .update(components.join('|'))
      .digest('hex');
  }
}
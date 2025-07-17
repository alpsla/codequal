/**
 * E2E Test Configuration
 * 
 * This file contains the configuration for E2E tests using existing users
 * instead of creating new ones during the test run.
 */

export interface TestUser {
  email: string;
  password: string;
  description: string;
  expectedBilling: {
    subscriptionTier: string;
    hasPaymentMethod: boolean;
    isTrialUser: boolean;
  };
}

export const TEST_USERS: Record<string, TestUser> = {
  payPerScan: {
    email: 'slavataichi@gmail.com',
    password: process.env.TEST_USER_PAY_PER_SCAN_PASSWORD || '',
    description: 'Pay-per-scan user ($0.50 per scan)',
    expectedBilling: {
      subscriptionTier: 'free',
      hasPaymentMethod: true,
      isTrialUser: false
    }
  },
  individual: {
    email: 'rostislav.alpin@gmail.com',
    password: process.env.TEST_USER_INDIVIDUAL_PASSWORD || '',
    description: 'Individual subscription plan user',
    expectedBilling: {
      subscriptionTier: 'individual',
      hasPaymentMethod: true,
      isTrialUser: false
    }
  }
};

export const E2E_CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  
  // Test repositories
  testRepositories: {
    small: {
      url: 'https://github.com/facebook/react',
      prNumber: 25000,
      description: 'Small PR for quick tests'
    },
    medium: {
      url: 'https://github.com/microsoft/vscode',
      prNumber: 200000,
      description: 'Medium-sized PR'
    },
    large: {
      url: 'https://github.com/nodejs/node',
      prNumber: 45000,
      description: 'Large PR with security changes'
    }
  },
  
  // Test timeouts
  timeouts: {
    auth: 10000, // 10 seconds
    analysis: 300000, // 5 minutes
    polling: 5000 // 5 seconds between polls
  },
  
  // Feature flags for tests
  features: {
    testTrialLimits: true,
    testPaymentFlow: false, // Disable real payment tests
    testEducationalContent: true,
    testReportGeneration: true
  }
};
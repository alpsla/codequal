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
export declare const TEST_USERS: Record<string, TestUser>;
export declare const E2E_CONFIG: {
    apiUrl: string;
    webUrl: string;
    testRepositories: {
        small: {
            url: string;
            prNumber: number;
            description: string;
        };
        medium: {
            url: string;
            prNumber: number;
            description: string;
        };
        large: {
            url: string;
            prNumber: number;
            description: string;
        };
    };
    timeouts: {
        auth: number;
        analysis: number;
        polling: number;
    };
    features: {
        testTrialLimits: boolean;
        testPaymentFlow: boolean;
        testEducationalContent: boolean;
        testReportGeneration: boolean;
    };
};

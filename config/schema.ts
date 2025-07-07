// Central configuration schema for CodeQual
// This provides type safety across all packages

export interface Config {
  app: AppConfig;
  api: ApiConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  pricing: PricingConfig;
  features: FeatureFlags;
  stripe: StripeConfig;
  monitoring: MonitoringConfig;
}

export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production' | 'test';
  baseUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ApiConfig {
  port: number;
  baseUrl: string;
  corsOrigins: string[];
  bodyLimit: string;
  timeout: number;
}

export interface AuthConfig {
  providers: {
    magic: boolean;
    github: boolean;
    gitlab: boolean;
    google: boolean;
    microsoft: boolean;
  };
  sessionDurationHours: number;
  requireEmailVerification: boolean;
  useSupabaseWorkaround: boolean;
}

export interface DatabaseConfig {
  // Connection strings in env vars only
  poolSize: number;
  timeout: number;
  ssl: boolean;
}

export interface PricingTier {
  name: string;
  price: number;
  interval: 'month' | 'year' | null;
  features: string[];
  limits: {
    apiCallsPerMonth: number; // -1 for unlimited
    repositoriesPerMonth: number;
    teamMembers: number;
    maxRepositorySize: string | number; // e.g., "50MB" or -1
  };
  stripePriceId: string | null;
  customPricing?: boolean;
}

export interface PricingConfig {
  currency: string;
  tiers: {
    [key: string]: PricingTier;
  };
  addons?: {
    [key: string]: {
      name: string;
      price: number;
      stripePriceId: string;
    };
  };
}

export interface FeatureFlags {
  auth: {
    useSupabaseWorkaround: boolean;
    providers: Record<string, boolean>;
    requireEmailVerification: boolean;
    sessionDurationHours: number;
  };
  billing: {
    enabled: boolean;
    sandbox: boolean;
    allowTrials: boolean;
    trialDurationDays: number;
    requirePaymentUpfront: boolean;
  };
  api: {
    rateLimiting: boolean;
    requireApiKey: boolean;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
  analysis: {
    enableAiAnalysis: boolean;
    enableSecurityScanning: boolean;
    enablePerformanceAnalysis: boolean;
    enableDependencyAnalysis: boolean;
    maxFileSizeKb: number;
    supportedLanguages: string[];
  };
  ui: {
    enableDarkMode: boolean;
    enableBetaFeatures: boolean;
    showPricingPage: boolean;
    enableFeedbackWidget: boolean;
  };
  integrations: Record<string, boolean>;
  maintenance: {
    enabled: boolean;
    message: string;
  };
}

export interface StripeConfig {
  publicKey: string;
  // secretKey and webhookSecret in env only
  webhookEndpoint: string;
  customerPortalUrl?: string;
}

export interface MonitoringConfig {
  sentry?: {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
  };
  analytics?: {
    mixpanel?: string;
    googleAnalytics?: string;
    posthog?: string;
  };
}

// Helper type for client-safe config (no secrets)
export type PublicConfig = Omit<Config, 'database' | 'stripe'> & {
  stripe: Pick<StripeConfig, 'publicKey'>;
};
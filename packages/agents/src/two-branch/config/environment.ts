/**
 * Environment Configuration
 * Controls behavior based on environment (development vs production)
 */

export enum Environment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private environment: Environment;
  private allowMockData: boolean;
  
  private constructor() {
    this.environment = this.detectEnvironment();
    this.allowMockData = this.shouldAllowMockData();
    
    // Log configuration on startup
    console.log(`🔧 Environment: ${this.environment}`);
    console.log(`🔧 Mock Data: ${this.allowMockData ? 'ENABLED (dev/test only)' : 'DISABLED (production)'}`);
  }
  
  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }
  
  private detectEnvironment(): Environment {
    const env = process.env.NODE_ENV?.toLowerCase() || 'development';
    
    switch (env) {
      case 'production':
      case 'prod':
        return Environment.PRODUCTION;
      case 'staging':
      case 'stage':
        return Environment.STAGING;
      case 'test':
      case 'testing':
        return Environment.TEST;
      default:
        return Environment.DEVELOPMENT;
    }
  }
  
  private shouldAllowMockData(): boolean {
    // NEVER allow mock data in production or staging
    if (this.environment === Environment.PRODUCTION || 
        this.environment === Environment.STAGING) {
      return false;
    }
    
    // Allow in dev/test unless explicitly disabled
    return process.env.DISABLE_MOCK_DATA !== 'true';
  }
  
  isProduction(): boolean {
    return this.environment === Environment.PRODUCTION;
  }
  
  isDevelopment(): boolean {
    return this.environment === Environment.DEVELOPMENT;
  }
  
  isTest(): boolean {
    return this.environment === Environment.TEST;
  }
  
  canUseMockData(): boolean {
    if (this.allowMockData === false) {
      return false;
    }
    
    // Additional safety check - even if allowed, check for production indicators
    const productionIndicators = [
      process.env.VERCEL_ENV === 'production',
      process.env.RAILWAY_ENVIRONMENT === 'production',
      process.env.HEROKU_APP_NAME && !process.env.HEROKU_APP_NAME.includes('staging'),
      process.env.AWS_EXECUTION_ENV,
      process.env.K_SERVICE // Google Cloud Run
    ];
    
    if (productionIndicators.some(indicator => indicator)) {
      console.warn('⚠️ Production environment detected - disabling mock data');
      return false;
    }
    
    return true;
  }
  
  /**
   * Throw error if mock data is attempted in production
   */
  assertMockDataAllowed(): void {
    if (!this.canUseMockData()) {
      throw new Error(
        'Mock data is not allowed in production environment. ' +
        'Use real security scanning tools or return empty results.'
      );
    }
  }
}
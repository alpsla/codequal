// Central configuration loader for CodeQual
import * as fs from 'fs';
import * as path from 'path';
import { Config, PublicConfig } from '../../config/schema';

class ConfigManager {
  private config: Config;
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    const configDir = path.join(process.cwd(), 'config');
    
    // Load default config
    const defaultConfig = this.loadJsonFile(path.join(configDir, 'default.json'));
    
    // Load environment-specific config
    const envConfig = this.loadJsonFile(path.join(configDir, `${this.environment}.json`));
    
    // Load pricing config
    const pricingConfig = this.loadJsonFile(path.join(configDir, 'pricing.json'));
    
    // Load features config
    const featuresConfig = this.loadJsonFile(path.join(configDir, 'features.json'));
    
    // Merge configs (env overrides default)
    return {
      ...defaultConfig,
      ...envConfig,
      pricing: pricingConfig,
      features: featuresConfig,
      // Override with environment variables
      stripe: {
        ...defaultConfig.stripe,
        ...envConfig.stripe,
        publicKey: process.env.STRIPE_PUBLIC_KEY || '',
      }
    };
  }

  private loadJsonFile(filePath: string): any {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (error) {
      console.warn(`Failed to load config from ${filePath}:`, error);
    }
    return {};
  }

  get<K extends keyof Config>(key: K): Config[K];
  get(path: string): any {
    const keys = path.split('.');
    let result: any = this.config;
    
    for (const key of keys) {
      result = result?.[key];
      if (result === undefined) {
        throw new Error(`Config key not found: ${path}`);
      }
    }
    
    return result;
  }

  getPublicConfig(): PublicConfig {
    const { database, stripe, ...publicConfig } = this.config;
    return {
      ...publicConfig,
      stripe: {
        publicKey: stripe.publicKey
      }
    };
  }

  isPricingEnabled(): boolean {
    return this.config.features.billing.enabled;
  }

  getPricingTier(tierId: string) {
    return this.config.pricing.tiers[tierId];
  }

  isFeatureEnabled(feature: string): boolean {
    const keys = feature.split('.');
    let result: any = this.config.features;
    
    for (const key of keys) {
      result = result?.[key];
    }
    
    return Boolean(result);
  }
}

// Singleton instance
const configManager = new ConfigManager();

// Named exports for convenience
export const config = configManager;
export const publicConfig = configManager.getPublicConfig();
export default configManager;
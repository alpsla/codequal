import { AuthenticatedUser } from '../middleware/auth-middleware';
// import { SupportedLanguage } from '@codequal/agents/translator/translator-agent';

// API Key data type (from api-key-auth.ts)
interface ApiKeyData {
  id: string;
  name: string;
  key_hash: string;
  user_id: string;
  organization_id: string;
  permissions: string[] | null;
  rate_limit_per_hour: number;
  usage_count: number;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
  metadata: any;
}

declare global {
  namespace Express {
    interface Request {
      // From auth-middleware
      user?: AuthenticatedUser;
      
      // From api-key-auth
      apiKey?: ApiKeyData;
      customerId?: string;
      requestStartTime?: number;
      
      // From i18n-middleware
      // language?: SupportedLanguage;
      // t?: (key: string, params?: Record<string, any>) => string;
    }
  }
}

export {};
/**
 * OAuth configuration
 * Note: OAuth credentials are configured in Supabase Dashboard,
 * not in environment variables, since Supabase handles the OAuth flow
 */

export interface OAuthConfig {
  // These are just for reference - actual credentials are in Supabase
  providers: string[];
}

/**
 * Check if OAuth provider is enabled
 */
export function isOAuthProviderEnabled(provider: 'github' | 'gitlab'): boolean {
  switch (provider) {
    case 'github':
      return process.env.ENABLE_GITHUB_AUTH === 'true';
    case 'gitlab':
      return process.env.ENABLE_GITLAB_AUTH === 'true';
    default:
      return false;
  }
}

/**
 * Get all enabled OAuth providers
 */
export function getEnabledOAuthProviders(): string[] {
  const providers: string[] = [];
  
  if (isOAuthProviderEnabled('github')) {
    providers.push('github');
  }
  
  if (isOAuthProviderEnabled('gitlab')) {
    providers.push('gitlab');
  }
  
  return providers;
}
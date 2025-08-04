/**
 * Service for extracting and mapping usernames from various sources
 * Supports GitHub, GitLab, and other platforms
 */

export interface UsernameMapping {
  userId: string;
  githubUsername?: string;
  gitlabUsername?: string;
  email?: string;
  displayName?: string;
}

export interface PlatformInfo {
  platform: 'github' | 'gitlab' | 'bitbucket' | 'unknown';
  organizationName?: string;
  repositoryName?: string;
}

export class UsernameExtractorService {
  constructor(
    private userMappingProvider?: {
      getUserMapping(userId: string): Promise<UsernameMapping | null>;
    }
  ) {}

  /**
   * Extract platform info from repository URL
   */
  extractPlatformInfo(repositoryUrl: string): PlatformInfo {
    if (!repositoryUrl) {
      return { platform: 'unknown' };
    }

    // GitHub pattern: https://github.com/org/repo
    const githubMatch = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
    if (githubMatch) {
      return {
        platform: 'github',
        organizationName: githubMatch[1],
        repositoryName: githubMatch[2].replace(/\.git$/, '')
      };
    }

    // GitLab pattern: https://gitlab.com/org/repo or self-hosted
    const gitlabMatch = repositoryUrl.match(/gitlab\.[^\/]+\/([^\/]+)\/([^\/\?]+)/);
    if (gitlabMatch || repositoryUrl.includes('gitlab')) {
      const match = repositoryUrl.match(/\/([^\/]+)\/([^\/\?]+)$/);
      if (match) {
        return {
          platform: 'gitlab',
          organizationName: match[1],
          repositoryName: match[2].replace(/\.git$/, '')
        };
      }
    }

    // Bitbucket pattern: https://bitbucket.org/org/repo
    const bitbucketMatch = repositoryUrl.match(/bitbucket\.org\/([^\/]+)\/([^\/\?]+)/);
    if (bitbucketMatch) {
      return {
        platform: 'bitbucket',
        organizationName: bitbucketMatch[1],
        repositoryName: bitbucketMatch[2].replace(/\.git$/, '')
      };
    }

    return { platform: 'unknown' };
  }

  /**
   * Extract username for a specific platform
   */
  async extractUsername(
    userId: string,
    repositoryUrl: string,
    prMetadata?: any,
    userProfile?: any
  ): Promise<{ username: string; platform: string }> {
    const platformInfo = this.extractPlatformInfo(repositoryUrl);

    // 1. First try to get from database mapping
    if (this.userMappingProvider) {
      try {
        const mapping = await this.userMappingProvider.getUserMapping(userId);
        if (mapping) {
          if (platformInfo.platform === 'github' && mapping.githubUsername) {
            return { username: mapping.githubUsername, platform: 'github' };
          }
          if (platformInfo.platform === 'gitlab' && mapping.gitlabUsername) {
            return { username: mapping.gitlabUsername, platform: 'gitlab' };
          }
        }
      } catch (error) {
        console.warn('Failed to fetch user mapping:', error);
      }
    }

    // 2. Try to extract from PR metadata
    if (prMetadata) {
      // Check for explicit platform usernames
      if (platformInfo.platform === 'github' && prMetadata.github_username) {
        return { username: prMetadata.github_username, platform: 'github' };
      }
      if (platformInfo.platform === 'gitlab' && prMetadata.gitlab_username) {
        return { username: prMetadata.gitlab_username, platform: 'gitlab' };
      }

      // Check for author_username or author_login
      if (prMetadata.author_username) {
        return { username: prMetadata.author_username, platform: platformInfo.platform };
      }
      if (prMetadata.author_login) {
        return { username: prMetadata.author_login, platform: platformInfo.platform };
      }
    }

    // 3. Try to extract from user profile
    if (userProfile) {
      // Check if username looks like a platform username (not a UUID)
      if (userProfile.username && !this.isUUID(userProfile.username)) {
        return { username: userProfile.username, platform: platformInfo.platform };
      }

      // Try to extract from email
      if (userProfile.email) {
        const username = this.extractUsernameFromEmail(userProfile.email, platformInfo);
        if (username) {
          return { username, platform: platformInfo.platform };
        }
      }
    }

    // 4. Try to extract from commit author info
    if (prMetadata?.commits) {
      const firstCommit = Array.isArray(prMetadata.commits) ? prMetadata.commits[0] : null;
      if (firstCommit?.author?.username) {
        return { username: firstCommit.author.username, platform: platformInfo.platform };
      }
    }

    // 5. Fallback to generic username
    const fallbackUsername = this.generateFallbackUsername(userProfile, prMetadata);
    return { username: fallbackUsername, platform: platformInfo.platform };
  }

  /**
   * Extract display name (full name) from various sources
   */
  extractDisplayName(prMetadata?: any, userProfile?: any): string {
    // Priority order for display name
    if (prMetadata?.author_name) return prMetadata.author_name;
    if (prMetadata?.authorName) return prMetadata.authorName;
    if (userProfile?.displayName) return userProfile.displayName;
    if (userProfile?.fullName) return userProfile.fullName;
    if (userProfile?.name) return userProfile.name;
    
    // Try to construct from email
    if (userProfile?.email) {
      const emailName = userProfile.email.split('@')[0];
      const parts = emailName.split(/[._-]/);
      if (parts.length >= 2) {
        // Capitalize first letter of each part
        return parts
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      }
    }

    return 'Developer';
  }

  /**
   * Check if string is a UUID
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Extract username from email based on platform conventions
   */
  private extractUsernameFromEmail(email: string, platformInfo: PlatformInfo): string | null {
    if (!email || !email.includes('@')) return null;

    const [localPart, domain] = email.split('@');

    // GitHub often uses firstname.lastname@company.com -> flastname
    if (platformInfo.platform === 'github') {
      const parts = localPart.split(/[._-]/);
      if (parts.length >= 2) {
        // Common pattern: first initial + last name
        return parts[0].charAt(0).toLowerCase() + parts[parts.length - 1].toLowerCase();
      }
      return localPart.toLowerCase();
    }

    // GitLab often uses full email prefix
    if (platformInfo.platform === 'gitlab') {
      return localPart.toLowerCase().replace(/[._]/g, '-');
    }

    // Default: use email prefix
    return localPart.toLowerCase();
  }

  /**
   * Generate fallback username
   */
  private generateFallbackUsername(userProfile?: any, prMetadata?: any): string {
    // Try to use initials from display name
    const displayName = this.extractDisplayName(prMetadata, userProfile);
    if (displayName && displayName !== 'Developer') {
      const parts = displayName.split(' ');
      if (parts.length >= 2) {
        return parts.map(p => p.charAt(0).toLowerCase()).join('');
      }
    }

    // Last resort
    return 'developer';
  }

  /**
   * Format username for display (with @ prefix)
   */
  formatUsername(username: string, platform?: string): string {
    if (!username) return '@unknown';
    
    // Add platform prefix if not github/gitlab
    if (platform && platform !== 'github' && platform !== 'gitlab') {
      return `@${username} (${platform})`;
    }
    
    return `@${username}`;
  }
}

/**
 * Create a mock username mapping provider for testing
 */
export function createMockUserMappingProvider(): any {
  const mappings: Record<string, UsernameMapping> = {
    '3c1f1438-f5bd-41d2-a9ef-bf4268b77ff7': {
      userId: '3c1f1438-f5bd-41d2-a9ef-bf4268b77ff7',
      githubUsername: 'sarahchen92',
      gitlabUsername: 'sarah-chen',
      email: 'sarah.chen@techcorp.com',
      displayName: 'Sarah Chen'
    },
    'e3a79551-1c68-48cf-8d45-d6fd5b33c11e': {
      userId: 'e3a79551-1c68-48cf-8d45-d6fd5b33c11e',
      githubUsername: 'jsmith-dev',
      gitlabUsername: 'john.smith',
      email: 'john.smith@techcorp.com',
      displayName: 'John Smith'
    }
  };

  return {
    async getUserMapping(userId: string): Promise<UsernameMapping | null> {
      return mappings[userId] || null;
    }
  };
}
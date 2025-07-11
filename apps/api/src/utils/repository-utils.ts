/**
 * Normalizes repository URLs to ensure consistent comparison
 * Handles both GitHub and GitLab URLs
 */
export function normalizeRepositoryUrl(url: string): string {
  // Remove GitHub PR path if present
  const githubPrMatch = url.match(/^(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/pull\/\d+/);
  if (githubPrMatch) {
    return githubPrMatch[1];
  }
  
  // Remove GitLab MR (merge request) path if present
  const gitlabMrMatch = url.match(/^(https:\/\/gitlab\.com\/[^\/]+\/[^\/]+)(?:\/-)?\/merge_requests\/\d+/);
  if (gitlabMrMatch) {
    return gitlabMrMatch[1];
  }
  
  // Remove trailing .git
  url = url.replace(/\.git$/, '');
  
  // Remove any trailing slashes
  url = url.replace(/\/$/, '');
  
  return url;
}

/**
 * Extracts repository base URL and PR/MR number from a full URL
 */
export function parseRepositoryUrl(url: string): { repositoryUrl: string; prNumber?: number } {
  // GitHub PR
  const githubPrMatch = url.match(/^(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/pull\/(\d+)/);
  if (githubPrMatch) {
    return {
      repositoryUrl: githubPrMatch[1],
      prNumber: parseInt(githubPrMatch[2])
    };
  }
  
  // GitLab MR
  const gitlabMrMatch = url.match(/^(https:\/\/gitlab\.com\/[^\/]+\/[^\/]+)(?:\/-)?\/merge_requests\/(\d+)/);
  if (gitlabMrMatch) {
    return {
      repositoryUrl: gitlabMrMatch[1],
      prNumber: parseInt(gitlabMrMatch[2])
    };
  }
  
  // Just a repository URL
  return {
    repositoryUrl: normalizeRepositoryUrl(url)
  };
}
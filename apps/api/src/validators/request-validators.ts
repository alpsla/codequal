export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PRAnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  analysisMode: 'quick' | 'comprehensive' | 'deep';
  githubToken?: string;
}

export function validatePRAnalysisRequest(body: unknown): ValidationResult {
  const errors: string[] = [];

  // Type guard - ensure body is an object
  if (!body || typeof body !== 'object') {
    errors.push('Request body must be an object');
    return {
      isValid: false,
      errors
    };
  }

  const request = body as Record<string, any>;

  // Check required fields
  if (!request.repositoryUrl) {
    errors.push('repositoryUrl is required');
  } else if (typeof request.repositoryUrl !== 'string') {
    errors.push('repositoryUrl must be a string');
  } else if (!isValidRepositoryUrl(request.repositoryUrl)) {
    errors.push('repositoryUrl must be a valid GitHub or GitLab repository URL');
  }

  if (request.prNumber === undefined || request.prNumber === null) {
    errors.push('prNumber is required');
  } else if (!Number.isInteger(request.prNumber) || request.prNumber <= 0) {
    errors.push('prNumber must be a positive integer');
  }

  if (!request.analysisMode) {
    errors.push('analysisMode is required');
  } else if (!['quick', 'comprehensive', 'deep'].includes(request.analysisMode)) {
    errors.push('analysisMode must be one of: quick, comprehensive, deep');
  }

  // Check optional fields
  if (request.githubToken && typeof request.githubToken !== 'string') {
    errors.push('githubToken must be a string if provided');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateAnalysisMode(mode: string): boolean {
  return ['quick', 'comprehensive', 'deep'].includes(mode);
}

export function validateRepositoryUrl(url: string): boolean {
  return isValidRepositoryUrl(url);
}

// Helper functions
function isValidRepositoryUrl(url: string): boolean {
  // GitHub patterns
  const githubPatterns = [
    /^https:\/\/github\.com\/[^/]+\/[^/]+$/,
    /^https:\/\/github\.com\/[^/]+\/[^/]+\.git$/,
    /^git@github\.com:[^/]+\/[^/]+\.git$/
  ];

  // GitLab patterns
  const gitlabPatterns = [
    /^https:\/\/gitlab\.com\/[^/]+\/[^/]+$/,
    /^https:\/\/gitlab\.com\/[^/]+\/[^/]+\.git$/,
    /^git@gitlab\.com:[^/]+\/[^/]+\.git$/
  ];

  const allPatterns = [...githubPatterns, ...gitlabPatterns];
  
  return allPatterns.some(pattern => pattern.test(url));
}
import {
  validatePRAnalysisRequest,
  validateAnalysisMode,
  validateRepositoryUrl,
  PRAnalysisRequest,
  ValidationResult
} from '../../validators/request-validators';

describe('Request Validators', () => {
  describe('validatePRAnalysisRequest', () => {
    test('should validate a complete valid request', () => {
      const validRequest: PRAnalysisRequest = {
        repositoryUrl: 'https://github.com/owner/repo',
        prNumber: 123,
        analysisMode: 'comprehensive',
        githubToken: 'ghp_test_token'
      };

      const result = validatePRAnalysisRequest(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should validate minimal valid request without optional fields', () => {
      const minimalRequest = {
        repositoryUrl: 'https://github.com/owner/repo',
        prNumber: 456,
        analysisMode: 'quick'
      };

      const result = validatePRAnalysisRequest(minimalRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    describe('Repository URL Validation', () => {
      test('should reject missing repositoryUrl', () => {
        const request = {
          prNumber: 123,
          analysisMode: 'quick'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('repositoryUrl is required');
      });

      test('should reject non-string repositoryUrl', () => {
        const request = {
          repositoryUrl: 123,
          prNumber: 123,
          analysisMode: 'quick'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('repositoryUrl must be a string');
      });

      test('should reject invalid repositoryUrl format', () => {
        const request = {
          repositoryUrl: 'not-a-valid-url',
          prNumber: 123,
          analysisMode: 'quick'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('repositoryUrl must be a valid GitHub or GitLab repository URL');
      });

      test('should accept various valid GitHub URL formats', () => {
        const validUrls = [
          'https://github.com/owner/repo',
          'https://github.com/owner/repo.git',
          'git@github.com:owner/repo.git'
        ];

        validUrls.forEach(url => {
          const request = {
            repositoryUrl: url,
            prNumber: 123,
            analysisMode: 'quick'
          };

          const result = validatePRAnalysisRequest(request);
          expect(result.isValid).toBe(true);
        });
      });

      test('should accept various valid GitLab URL formats', () => {
        const validUrls = [
          'https://gitlab.com/owner/repo',
          'https://gitlab.com/owner/repo.git',
          'git@gitlab.com:owner/repo.git'
        ];

        validUrls.forEach(url => {
          const request = {
            repositoryUrl: url,
            prNumber: 123,
            analysisMode: 'quick'
          };

          const result = validatePRAnalysisRequest(request);
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('PR Number Validation', () => {
      test('should reject missing prNumber', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          analysisMode: 'quick'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('prNumber is required');
      });

      test('should reject zero prNumber', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 0,
          analysisMode: 'quick'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('prNumber must be a positive integer');
      });

      test('should reject negative prNumber', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: -5,
          analysisMode: 'quick'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('prNumber must be a positive integer');
      });

      test('should reject non-integer prNumber', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123.5,
          analysisMode: 'quick'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('prNumber must be a positive integer');
      });

      test('should reject string prNumber', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: '123',
          analysisMode: 'quick'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('prNumber must be a positive integer');
      });

      test('should accept valid positive integers', () => {
        const validNumbers = [1, 42, 123, 999999];

        validNumbers.forEach(num => {
          const request = {
            repositoryUrl: 'https://github.com/owner/repo',
            prNumber: num,
            analysisMode: 'quick'
          };

          const result = validatePRAnalysisRequest(request);
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('Analysis Mode Validation', () => {
      test('should reject missing analysisMode', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('analysisMode is required');
      });

      test('should reject invalid analysisMode', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'invalid-mode'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('analysisMode must be one of: quick, comprehensive, deep');
      });

      test('should accept all valid analysis modes', () => {
        const validModes = ['quick', 'comprehensive', 'deep'];

        validModes.forEach(mode => {
          const request = {
            repositoryUrl: 'https://github.com/owner/repo',
            prNumber: 123,
            analysisMode: mode
          };

          const result = validatePRAnalysisRequest(request);
          expect(result.isValid).toBe(true);
        });
      });
    });

    describe('GitHub Token Validation', () => {
      test('should accept valid githubToken', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'quick',
          githubToken: 'ghp_test_token_123'
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      test('should reject non-string githubToken', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'quick',
          githubToken: 123456
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('githubToken must be a string if provided');
      });

      test('should accept undefined githubToken', () => {
        const request = {
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'quick',
          githubToken: undefined
        };

        const result = validatePRAnalysisRequest(request);

        expect(result.isValid).toBe(true);
      });
    });

    describe('Multiple Errors', () => {
      test('should collect all validation errors', () => {
        const invalidRequest = {
          repositoryUrl: 123,
          prNumber: -1,
          analysisMode: 'invalid',
          githubToken: 456
        };

        const result = validatePRAnalysisRequest(invalidRequest);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(4);
        expect(result.errors).toContain('repositoryUrl must be a string');
        expect(result.errors).toContain('prNumber must be a positive integer');
        expect(result.errors).toContain('analysisMode must be one of: quick, comprehensive, deep');
        expect(result.errors).toContain('githubToken must be a string if provided');
      });

      test('should handle completely empty request', () => {
        const emptyRequest = {};

        const result = validatePRAnalysisRequest(emptyRequest);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(3);
        expect(result.errors).toContain('repositoryUrl is required');
        expect(result.errors).toContain('prNumber is required');
        expect(result.errors).toContain('analysisMode is required');
      });
    });
  });

  describe('validateAnalysisMode', () => {
    test('should validate correct analysis modes', () => {
      expect(validateAnalysisMode('quick')).toBe(true);
      expect(validateAnalysisMode('comprehensive')).toBe(true);
      expect(validateAnalysisMode('deep')).toBe(true);
    });

    test('should reject invalid analysis modes', () => {
      expect(validateAnalysisMode('invalid')).toBe(false);
      expect(validateAnalysisMode('QUICK')).toBe(false);
      expect(validateAnalysisMode('')).toBe(false);
      expect(validateAnalysisMode('fast')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(validateAnalysisMode(' quick ')).toBe(false); // Spaces
      expect(validateAnalysisMode('Quick')).toBe(false); // Wrong case
    });
  });

  describe('validateRepositoryUrl', () => {
    test('should validate GitHub URLs', () => {
      const validGitHubUrls = [
        'https://github.com/owner/repo',
        'https://github.com/owner/repo.git',
        'git@github.com:owner/repo.git',
        'https://github.com/facebook/react',
        'https://github.com/microsoft/vscode.git'
      ];

      validGitHubUrls.forEach(url => {
        expect(validateRepositoryUrl(url)).toBe(true);
      });
    });

    test('should validate GitLab URLs', () => {
      const validGitLabUrls = [
        'https://gitlab.com/owner/repo',
        'https://gitlab.com/owner/repo.git',
        'git@gitlab.com:owner/repo.git',
        'https://gitlab.com/gitlab-org/gitlab'
      ];

      validGitLabUrls.forEach(url => {
        expect(validateRepositoryUrl(url)).toBe(true);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'https://bitbucket.org/owner/repo',
        'https://github.com/owner',
        'https://github.com/',
        'https://invalid-domain.com/owner/repo',
        'not-a-url',
        '',
        'ftp://github.com/owner/repo',
        'https://github.com/owner/repo/sub/path'
      ];

      invalidUrls.forEach(url => {
        expect(validateRepositoryUrl(url)).toBe(false);
      });
    });

    test('should handle edge cases', () => {
      expect(validateRepositoryUrl('https://github.com/a/b')).toBe(true);
      expect(validateRepositoryUrl('https://github.com/very-long-owner-name/very-long-repo-name')).toBe(true);
      expect(validateRepositoryUrl('https://github.com/owner-with-dashes/repo_with_underscores')).toBe(true);
    });
  });

  describe('Error Message Quality', () => {
    test('should provide clear and specific error messages', () => {
      const badRequest = {
        repositoryUrl: 'not-a-url',
        prNumber: 'not-a-number',
        analysisMode: 'not-a-mode',
        githubToken: 12345
      };

      const result = validatePRAnalysisRequest(badRequest);

      expect(result.errors.every(error => error.length > 10)).toBe(true);
      expect(result.errors.every(error => error.includes('must'))).toBe(true);
    });

    test('should maintain consistent error message format', () => {
      const badRequest = {
        repositoryUrl: 123,
        prNumber: -1,
        analysisMode: 'invalid'
      };

      const result = validatePRAnalysisRequest(badRequest);

      result.errors.forEach(error => {
        expect(error).toMatch(/^[a-zA-Z]+.*must.*$/);
      });
    });
  });

  describe('Type Safety', () => {
    test('should handle null and undefined values', () => {
      const requestWithNulls = {
        repositoryUrl: null,
        prNumber: null,
        analysisMode: null,
        githubToken: null
      };

      const result = validatePRAnalysisRequest(requestWithNulls);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle mixed data types', () => {
      const mixedRequest = {
        repositoryUrl: ['array', 'instead', 'of', 'string'],
        prNumber: { object: 'instead of number' },
        analysisMode: function() { return 'function'; },
        githubToken: Symbol('symbol')
      };

      const result = validatePRAnalysisRequest(mixedRequest);

      expect(result.isValid).toBe(false);
    });
  });
});
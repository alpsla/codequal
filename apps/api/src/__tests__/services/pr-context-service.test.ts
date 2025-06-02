import { PRContextService } from '../../services/pr-context-service';
import axios from 'axios';
import { createMockPRDetails, createMockDiffData } from '../setup';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PRContextService', () => {
  let service: PRContextService;

  beforeEach(() => {
    service = new PRContextService();
    jest.clearAllMocks();
  });

  describe('Repository URL Parsing', () => {
    test('should parse GitHub HTTPS URL correctly', () => {
      const result = (service as any).parseRepositoryUrl('https://github.com/owner/repo');
      expect(result).toEqual({
        platform: 'github',
        owner: 'owner',
        repo: 'repo'
      });
    });

    test('should parse GitHub SSH URL correctly', () => {
      const result = (service as any).parseRepositoryUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({
        platform: 'github',
        owner: 'owner',
        repo: 'repo'
      });
    });

    test('should parse GitLab HTTPS URL correctly', () => {
      const result = (service as any).parseRepositoryUrl('https://gitlab.com/owner/repo');
      expect(result).toEqual({
        platform: 'gitlab',
        owner: 'owner',
        repo: 'repo'
      });
    });

    test('should handle URLs with .git extension', () => {
      const result = (service as any).parseRepositoryUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({
        platform: 'github',
        owner: 'owner',
        repo: 'repo'
      });
    });

    test('should throw error for invalid URL', () => {
      expect(() => {
        (service as any).parseRepositoryUrl('invalid-url');
      }).toThrow('Unable to parse repository URL');
    });
  });

  describe('GitHub PR Details Fetching', () => {
    test('should fetch GitHub PR details successfully', async () => {
      const mockPRData = {
        number: 123,
        title: 'Test PR',
        body: 'Test description',
        user: { login: 'testuser' },
        base: { ref: 'main' },
        head: { ref: 'feature/test' },
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/123',
        created_at: '2025-06-01T10:00:00Z',
        updated_at: '2025-06-01T11:00:00Z',
        changed_files: 5,
        additions: 100,
        deletions: 20,
        merged_at: null
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockPRData });

      const result = await service.fetchPRDetails(
        'https://github.com/owner/repo',
        123
      );

      expect(result).toMatchObject({
        number: 123,
        title: 'Test PR',
        description: 'Test description',
        author: 'testuser',
        baseBranch: 'main',
        headBranch: 'feature/test',
        state: 'open',
        changedFiles: 5,
        additions: 100,
        deletions: 20
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json'
          })
        })
      );
    });

    test('should handle merged PR state correctly', async () => {
      const mockPRData = {
        number: 123,
        title: 'Test PR',
        body: 'Test description',
        user: { login: 'testuser' },
        base: { ref: 'main' },
        head: { ref: 'feature/test' },
        state: 'closed',
        html_url: 'https://github.com/owner/repo/pull/123',
        created_at: '2025-06-01T10:00:00Z',
        updated_at: '2025-06-01T11:00:00Z',
        changed_files: 5,
        additions: 100,
        deletions: 20,
        merged_at: '2025-06-01T12:00:00Z'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockPRData });

      const result = await service.fetchPRDetails(
        'https://github.com/owner/repo',
        123
      );

      expect(result.state).toBe('merged');
    });

    test('should include access token in headers when provided', async () => {
      const mockPRData = {
        number: 123,
        title: 'Test PR',
        body: null,
        user: { login: 'testuser' },
        base: { ref: 'main' },
        head: { ref: 'feature/test' },
        state: 'open',
        html_url: 'https://github.com/owner/repo/pull/123',
        created_at: '2025-06-01T10:00:00Z',
        updated_at: '2025-06-01T11:00:00Z',
        changed_files: 5,
        additions: 100,
        deletions: 20
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockPRData });

      await service.fetchPRDetails(
        'https://github.com/owner/repo',
        123,
        'test-token'
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token test-token'
          })
        })
      );
    });
  });

  describe('GitLab MR Details Fetching', () => {
    test('should fetch GitLab MR details successfully', async () => {
      const mockMRData = {
        iid: 123,
        title: 'Test MR',
        description: 'Test description',
        author: { username: 'testuser' },
        target_branch: 'main',
        source_branch: 'feature/test',
        state: 'opened',
        web_url: 'https://gitlab.com/owner/repo/-/merge_requests/123',
        created_at: '2025-06-01T10:00:00Z',
        updated_at: '2025-06-01T11:00:00Z',
        changes_count: 5
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockMRData });

      const result = await service.fetchPRDetails(
        'https://gitlab.com/owner/repo',
        123
      );

      expect(result).toMatchObject({
        number: 123,
        title: 'Test MR',
        description: 'Test description',
        author: 'testuser',
        baseBranch: 'main',
        headBranch: 'feature/test',
        state: 'opened',
        changedFiles: 5
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://gitlab.com/api/v4/projects/owner%2Frepo/merge_requests/123',
        expect.any(Object)
      );
    });
  });

  describe('Diff Analysis', () => {
    test('should fetch GitHub diff successfully', async () => {
      const mockDiffData = [
        {
          filename: 'src/components/Button.tsx',
          status: 'modified',
          additions: 15,
          deletions: 5,
          changes: 20,
          patch: '@@ -1,5 +1,10 @@\n-old code\n+new code'
        },
        {
          filename: 'src/utils/helpers.ts',
          status: 'added',
          additions: 50,
          deletions: 0,
          changes: 50
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockDiffData });

      const prDetails = createMockPRDetails();
      prDetails.url = 'https://github.com/owner/repo/pull/123';

      const result = await service.getPRDiff(prDetails);

      expect(result).toMatchObject({
        files: expect.arrayContaining([
          expect.objectContaining({
            filename: 'src/components/Button.tsx',
            status: 'modified',
            additions: 15,
            deletions: 5,
            changes: 20
          }),
          expect.objectContaining({
            filename: 'src/utils/helpers.ts',
            status: 'added',
            additions: 50,
            deletions: 0,
            changes: 50
          })
        ]),
        totalAdditions: 65,
        totalDeletions: 5,
        totalChanges: 70
      });
    });

    test('should extract changed files correctly', () => {
      const diffData = createMockDiffData();
      const result = service.extractChangedFiles(diffData);

      expect(result).toEqual([
        'src/components/Button.tsx',
        'src/utils/helpers.ts',
        'tests/Button.test.tsx'
      ]);
    });
  });

  describe('Change Analysis', () => {
    test('should analyze changes and determine impact level', () => {
      const diffData = createMockDiffData();
      const result = service.analyzeChanges(diffData);

      expect(result).toMatchObject({
        impactLevel: expect.oneOf(['low', 'medium', 'high', 'critical']),
        categories: expect.any(Array),
        affectedAreas: expect.any(Array),
        riskFactors: expect.any(Array),
        complexity: expect.any(Number)
      });

      expect(result.complexity).toBeGreaterThanOrEqual(0);
      expect(result.complexity).toBeLessThanOrEqual(10);
    });

    test('should categorize test files correctly', () => {
      const diffData = {
        ...createMockDiffData(),
        files: [
          {
            filename: 'src/components/Button.test.tsx',
            status: 'modified' as const,
            additions: 20,
            deletions: 5,
            changes: 25
          }
        ]
      };

      const result = service.analyzeChanges(diffData);
      expect(result.categories).toContain('tests');
    });

    test('should identify critical files', () => {
      const diffData = {
        ...createMockDiffData(),
        files: [
          {
            filename: 'package.json',
            status: 'modified' as const,
            additions: 2,
            deletions: 1,
            changes: 3
          }
        ]
      };

      const result = service.analyzeChanges(diffData);
      expect(result.riskFactors).toContain('Critical system files modified');
    });

    test('should calculate high impact for large changes', () => {
      const diffData = {
        files: Array.from({ length: 20 }, (_, i) => ({
          filename: `src/file${i}.ts`,
          status: 'modified' as const,
          additions: 100,
          deletions: 50,
          changes: 150
        })),
        totalAdditions: 2000,
        totalDeletions: 1000,
        totalChanges: 3000
      };

      const result = service.analyzeChanges(diffData);
      expect(['high', 'critical']).toContain(result.impactLevel);
    });
  });

  describe('Language Detection', () => {
    test('should detect TypeScript as primary language', async () => {
      const changedFiles = [
        'src/components/Button.tsx',
        'src/utils/helpers.ts',
        'src/services/api.ts',
        'package.json'
      ];

      const result = await service.detectPrimaryLanguage(
        'https://github.com/owner/repo',
        changedFiles
      );

      expect(result).toBe('typescript');
    });

    test('should detect JavaScript as primary language', async () => {
      const changedFiles = [
        'src/components/Button.jsx',
        'src/utils/helpers.js',
        'src/services/api.js'
      ];

      const result = await service.detectPrimaryLanguage(
        'https://github.com/owner/repo',
        changedFiles
      );

      expect(result).toBe('javascript');
    });

    test('should return unknown for mixed or unrecognized files', async () => {
      const changedFiles = [
        'README.md',
        'LICENSE',
        'unknown.xyz'
      ];

      const result = await service.detectPrimaryLanguage(
        'https://github.com/owner/repo',
        changedFiles
      );

      expect(result).toBe('unknown');
    });
  });

  describe('Repository Size Estimation', () => {
    test('should estimate small repository size', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { size: 500 } // 500 KB
      });

      const result = await service.estimateRepositorySize(
        'https://github.com/owner/repo'
      );

      expect(result).toBe('small');
    });

    test('should estimate medium repository size', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { size: 25000 } // 25 MB
      });

      const result = await service.estimateRepositorySize(
        'https://github.com/owner/repo'
      );

      expect(result).toBe('medium');
    });

    test('should estimate large repository size', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { size: 100000 } // 100 MB
      });

      const result = await service.estimateRepositorySize(
        'https://github.com/owner/repo'
      );

      expect(result).toBe('large');
    });

    test('should default to medium on error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.estimateRepositorySize(
        'https://github.com/owner/repo'
      );

      expect(result).toBe('medium');
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Rate Limit'));

      await expect(
        service.fetchPRDetails('https://github.com/owner/repo', 123)
      ).rejects.toThrow('PR fetch failed');
    });

    test('should handle invalid platform', async () => {
      await expect(
        service.fetchPRDetails('https://bitbucket.org/owner/repo', 123)
      ).rejects.toThrow('Unsupported platform');
    });
  });

  describe('File Type Detection Helpers', () => {
    test('should detect test files correctly', () => {
      const testFiles = [
        'src/components/Button.test.tsx',
        'src/utils/helpers.spec.ts',
        'tests/integration.test.js',
        '__tests__/unit.test.js'
      ];

      testFiles.forEach(file => {
        expect((service as any).isTestFile(file)).toBe(true);
      });
    });

    test('should detect configuration files correctly', () => {
      const configFiles = [
        'package.json',
        'tsconfig.json',
        'webpack.config.js',
        'babel.config.json',
        'jest.config.js'
      ];

      configFiles.forEach(file => {
        expect((service as any).isConfigFile(file)).toBe(true);
      });
    });

    test('should detect security-related files correctly', () => {
      const securityFiles = [
        'src/auth/middleware.ts',
        'src/security/validation.ts',
        'src/permissions/roles.ts'
      ];

      securityFiles.forEach(file => {
        expect((service as any).isSecurityFile(file)).toBe(true);
      });
    });
  });
});

// Integration test with real GitHub API (optional, requires environment setup)
describe('PRContextService Integration Tests', () => {
  let service: PRContextService;

  beforeEach(() => {
    service = new PRContextService();
  });

  // Skip unless GITHUB_TOKEN is provided for real testing
  test.skip('should fetch real GitHub PR details', async () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn('Skipping integration test - GITHUB_TOKEN not provided');
      return;
    }

    const result = await service.fetchPRDetails(
      'https://github.com/microsoft/TypeScript',
      1, // First PR in TypeScript repo
      token
    );

    expect(result).toMatchObject({
      number: expect.any(Number),
      title: expect.any(String),
      author: expect.any(String),
      state: expect.oneOf(['open', 'closed', 'merged'])
    });
  });
});
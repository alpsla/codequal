/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToolRunnerService } from '../tool-runner.service';

describe('ToolRunnerService', () => {
  let service: ToolRunnerService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    service = new ToolRunnerService(mockLogger);
  });

  describe('Tool Detection', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });

    it('should return empty results for non-existent repository', async () => {
      const config = {
        repositoryPath: '/fake/repo',
        enabledTools: ['npm-audit', 'license-checker']
      };
      
      const results = await service.runTools(config);
      
      // Should return empty results since the repository doesn't exist
      expect(results).toBeDefined();
      expect(Object.keys(results).length).toBe(0);
    });
  });

  describe('Tool Execution', () => {
    it('should handle tool execution errors gracefully', async () => {
      const config = {
        repositoryPath: '/fake/path',
        enabledTools: ['fake-tool'],
        timeout: 1000
      };
      
      const results = await service.runTools(config);
      
      // Should return empty results for unsupported tools
      expect(results).toBeDefined();
      expect(Object.keys(results).length).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith('No supported tools requested');
    });
  });
});

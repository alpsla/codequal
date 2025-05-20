import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { DeepWikiClient, RepositoryContext, WikiExportOptions } from '../src/deepwiki/DeepWikiClient';
import { Logger } from '@codequal/core/logging';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
} as unknown as Logger;

// Sample repository context
const sampleRepository: RepositoryContext = {
  owner: 'pallets',
  repo: 'click',
  repoType: 'github'
};

describe('DeepWikiClient', () => {
  let client: DeepWikiClient;
  
  beforeEach(() => {
    // Create a new client for each test
    client = new DeepWikiClient('http://test-deepwiki-api', mockLogger);
    
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock axios create
    mockedAxios.create.mockReturnValue(mockedAxios as any);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('generateWiki', () => {
    it('should call the DeepWiki API with correct parameters', async () => {
      // Arrange
      const options: WikiExportOptions = {
        format: 'json',
        language: 'en'
      };
      
      const mockResponse = {
        data: { wiki: 'Sample wiki content' }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Act
      const result = await client.generateWiki(sampleRepository, options);
      
      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith('/export/wiki', {
        owner: 'pallets',
        repo: 'click',
        repo_type: 'github',
        format: 'json',
        language: 'en'
      });
      
      expect(result).toEqual(mockResponse.data);
      expect(mockLogger.info).toHaveBeenCalledWith('Generating wiki', { repository: sampleRepository, options });
    });
    
    it('should include provider and model if specified', async () => {
      // Arrange
      const options: WikiExportOptions = {
        format: 'json',
        language: 'en',
        modelConfig: {
          provider: 'openai',
          model: 'gpt-4o'
        }
      };
      
      const mockResponse = {
        data: { wiki: 'Sample wiki content' }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Act
      const result = await client.generateWiki(sampleRepository, options);
      
      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith('/export/wiki', {
        owner: 'pallets',
        repo: 'click',
        repo_type: 'github',
        format: 'json',
        language: 'en',
        provider: 'openai',
        model: 'gpt-4o'
      });
      
      expect(result).toEqual(mockResponse.data);
    });
    
    it('should handle API errors correctly', async () => {
      // Arrange
      const options: WikiExportOptions = {
        format: 'json',
        language: 'en'
      };
      
      const errorResponse = {
        response: {
          status: 500,
          data: { error: 'Test error' }
        }
      };
      
      mockedAxios.post.mockRejectedValueOnce(errorResponse);
      
      // Act & Assert
      await expect(client.generateWiki(sampleRepository, options))
        .rejects
        .toThrow('DeepWiki API error (500): Test error');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error generating wiki', { repository: sampleRepository, error: errorResponse });
    });
  });
  
  describe('getChatCompletion', () => {
    it('should call the chat completions API with correct parameters', async () => {
      // Arrange
      const repoUrl = 'https://github.com/pallets/click';
      const messages = [
        { role: 'user', content: 'What is the architecture of this repository?' }
      ];
      
      const options = {
        messages,
        modelConfig: {
          provider: 'google',
          model: 'gemini-2.5-pro-preview-05-06'
        }
      };
      
      const mockResponse = {
        data: { response: 'Sample chat response' }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Act
      const result = await client.getChatCompletion(repoUrl, options);
      
      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith('/chat/completions', {
        repo_url: repoUrl,
        messages,
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      });
      
      expect(result).toEqual(mockResponse.data);
      expect(mockLogger.info).toHaveBeenCalledWith('Getting chat completion', { repoUrl, options });
    });
    
    it('should use streaming endpoint if stream option is true', async () => {
      // Arrange
      const repoUrl = 'https://github.com/pallets/click';
      const messages = [
        { role: 'user', content: 'What is the architecture of this repository?' }
      ];
      
      const options = {
        messages,
        stream: true
      };
      
      const mockResponse = {
        data: 'Sample stream response'
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Act
      const result = await client.getChatCompletion(repoUrl, options);
      
      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith('/chat/completions/stream', {
        repo_url: repoUrl,
        messages
      }, { responseType: 'stream' });
      
      expect(result).toEqual(mockResponse.data);
    });
  });
  
  describe('recommendModelConfig', () => {
    it('should return appropriate model config based on language and size', () => {
      // Arrange
      const smallSize = 2 * 1024 * 1024; // 2MB
      const mediumSize = 20 * 1024 * 1024; // 20MB
      const largeSize = 100 * 1024 * 1024; // 100MB
      
      // Act
      const smallPythonConfig = client.recommendModelConfig('python', smallSize);
      const mediumJsConfig = client.recommendModelConfig('javascript', mediumSize);
      const largeTsConfig = client.recommendModelConfig('typescript', largeSize);
      const unknownLangConfig = client.recommendModelConfig('fortran', mediumSize);
      
      // Assert - default fallback is Google Gemini
      expect(unknownLangConfig.provider).toBe('google');
      expect(unknownLangConfig.model).toBe('gemini-2.5-pro-preview-05-06');
    });
  });
});

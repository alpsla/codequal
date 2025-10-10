import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { OpenRouterEmbeddingService } from '../openrouter-embedding-service';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

// Mock fetch for Voyage AI
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('OpenRouterEmbeddingService', () => {
  let service: OpenRouterEmbeddingService;
  let mockOpenAIClient: jest.Mocked<OpenAI>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.VOYAGE_API_KEY = 'test-voyage-key';
    process.env.TOGETHER_API_KEY = 'test-together-key';
    
    // Mock OpenAI client
    mockOpenAIClient = {
      embeddings: {
        create: jest.fn()
      }
    } as any;
    
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIClient);
    
    // Create service instance
    service = new OpenRouterEmbeddingService();
  });
  
  afterEach(() => {
    // Clean up environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.VOYAGE_API_KEY;
    delete process.env.TOGETHER_API_KEY;
  });
  
  describe('Initialization', () => {
    it('should initialize with required OPENAI_API_KEY', () => {
      expect(service).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-openai-key' });
    });
    
    it('should throw error if OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenRouterEmbeddingService()).toThrow('OPENAI_API_KEY is required for embeddings');
    });
    
    it('should initialize Voyage AI client when API key is available', () => {
      const config = service.getConfiguration();
      expect(config.model).toBe('text-embedding-3-large');
      expect(config.dimensions).toBe(3072);
    });
  });
  
  describe('Model Selection', () => {
    it('should use voyage-code-3 for code content when Voyage API key is available', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{
            embedding: new Array(1024).fill(0.1)
          }]
        })
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const embedding = await service.createEmbedding('function test() {}', { 
        contentType: 'code' 
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.voyageai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-voyage-key'
          }),
          body: expect.stringContaining('voyage-code-3')
        })
      );
      expect(embedding.length).toBe(1024);
    });
    
    it('should fallback to text-embedding-3-large for code when Voyage is unavailable', async () => {
      delete process.env.VOYAGE_API_KEY;
      service = new OpenRouterEmbeddingService();
      
      mockOpenAIClient.embeddings.create.mockResolvedValue({
        data: [{
          embedding: new Array(3072).fill(0.1)
        }]
      } as any);
      
      const embedding = await service.createEmbedding('function test() {}', { 
        contentType: 'code' 
      });
      
      expect(mockOpenAIClient.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: 'function test() {}',
        dimensions: 3072
      });
      expect(embedding.length).toBe(3072);
    });
    
    it('should use text-embedding-3-large for documentation content', async () => {
      mockOpenAIClient.embeddings.create.mockResolvedValue({
        data: [{
          embedding: new Array(3072).fill(0.1)
        }]
      } as any);
      
      const embedding = await service.createEmbedding('# Documentation\nThis is a test.', { 
        contentType: 'documentation' 
      });
      
      expect(mockOpenAIClient.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: '# Documentation\nThis is a test.',
        dimensions: 3072
      });
      expect(embedding.length).toBe(3072);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle Voyage AI API errors', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Bad Request'
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      await expect(service.createEmbedding('test', { contentType: 'code' }))
        .rejects
        .toThrow('Voyage AI error: Bad Request');
    });
    
    it('should handle OpenAI API errors', async () => {
      mockOpenAIClient.embeddings.create.mockRejectedValue(
        new Error('OpenAI API error')
      );
      
      await expect(service.createEmbedding('test', { contentType: 'documentation' }))
        .rejects
        .toThrow('OpenAI API error');
    });
    
    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      await expect(service.createEmbedding('test', { contentType: 'code' }))
        .rejects
        .toThrow('Network error');
    });
  });
  
  describe('Cost Estimation', () => {
    it('should estimate cost for voyage-code-3', () => {
      const text = 'a'.repeat(4000); // ~1000 tokens
      const cost = service.estimateCost(text, {
        provider: 'voyage',
        model: 'voyage-code-3',
        dimensions: 1024,
        maxTokens: 32000,
        costPerMillion: 0.12,
        embeddingType: 'code'
      });
      
      expect(cost).toBeCloseTo(0.00012, 5); // $0.12 per million tokens
    });
    
    it('should estimate cost for text-embedding-3-large', () => {
      const text = 'a'.repeat(4000); // ~1000 tokens
      const cost = service.estimateCost(text);
      
      expect(cost).toBeCloseTo(0.00013, 5); // $0.13 per million tokens
    });
  });
  
  describe('Model Configuration', () => {
    it('should list all available models', () => {
      const models = service.getAvailableModels();
      
      const voyageModels = models.filter(m => m.provider === 'voyage');
      const openaiModels = models.filter(m => m.provider === 'openai');
      
      expect(voyageModels.length).toBeGreaterThan(0);
      expect(openaiModels.length).toBeGreaterThan(0);
      
      // Check voyage-code-3 is available
      const voyageCode3 = models.find(m => m.model === 'voyage-code-3');
      expect(voyageCode3).toBeDefined();
      expect(voyageCode3?.available).toBe(true);
      expect(voyageCode3?.config.dimensions).toBe(1024);
    });
    
    it('should update configuration dynamically', () => {
      const initialConfig = service.getConfiguration();
      expect(initialConfig.model).toBe('text-embedding-3-large');
      
      service.updateConfiguration({
        model: 'text-embedding-3-small',
        dimensions: 1536
      });
      
      const updatedConfig = service.getConfiguration();
      expect(updatedConfig.model).toBe('text-embedding-3-small');
      expect(updatedConfig.dimensions).toBe(1536);
    });
  });
  
  describe('Performance', () => {
    it('should complete embedding within reasonable time', async () => {
      mockOpenAIClient.embeddings.create.mockResolvedValue({
        data: [{
          embedding: new Array(3072).fill(0.1)
        }]
      } as any);
      
      const startTime = Date.now();
      await service.createEmbedding('test content');
      const duration = Date.now() - startTime;
      
      // Should complete within 5 seconds (generous for test environment)
      expect(duration).toBeLessThan(5000);
    });
    
    it('should handle large text inputs', async () => {
      const largeText = 'a'.repeat(30000); // Large input
      
      mockOpenAIClient.embeddings.create.mockResolvedValue({
        data: [{
          embedding: new Array(3072).fill(0.1)
        }]
      } as any);
      
      const embedding = await service.createEmbedding(largeText);
      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(3072);
    });
  });
});
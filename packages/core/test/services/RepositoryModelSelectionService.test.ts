/**
 * Tests for RepositoryModelSelectionService
 * 
 * This file contains unit tests for the RepositoryModelSelectionService
 * to ensure it correctly selects models based on repository context.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { 
  AnalysisTier, 
  ModelSelectionStrategy,
  RepositoryModelSelectionService 
} from '../../src/services/model-selection';
import { RepositoryContext } from '../../src/types/repository';

describe('RepositoryModelSelectionService', () => {
  let service: RepositoryModelSelectionService;
  let loggerStub: any;
  
  beforeEach(() => {
    // Create logger stub
    loggerStub = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub()
    };
    
    // Create service instance
    service = new RepositoryModelSelectionService(loggerStub);
  });
  
  afterEach(() => {
    // Restore stubs
    sinon.restore();
  });
  
  describe('getModelForRepository', () => {
    it('should select OpenAI GPT-4o for small Python repositories', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'python',
        sizeBytes: 2 * 1024 * 1024 // 2MB
      };
      
      // Get model for repository
      const result = service.getModelForRepository(repository, AnalysisTier.QUICK);
      
      // Verify result
      expect(result.provider).to.equal('openai');
      expect(result.model).to.equal('gpt-4o');
    });
    
    it('should select Claude for medium Python repositories', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'python',
        sizeBytes: 20 * 1024 * 1024 // 20MB
      };
      
      // Get model for repository
      const result = service.getModelForRepository(repository, AnalysisTier.COMPREHENSIVE);
      
      // Verify result
      expect(result.provider).to.equal('anthropic');
      expect(result.model).to.be.a('string');
    });
    
    it('should select Gemini for large TypeScript repositories', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'typescript',
        sizeBytes: 100 * 1024 * 1024 // 100MB
      };
      
      // Get model for repository
      const result = service.getModelForRepository(repository, AnalysisTier.COMPREHENSIVE);
      
      // Verify result
      expect(result.provider).to.equal('google');
      expect(result.model).to.equal('gemini-2.5-pro-preview-05-06');
    });
    
    it('should respect strategy override over tier', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'javascript',
        sizeBytes: 20 * 1024 * 1024 // 20MB
      };
      
      // Get model for repository with performance strategy (should override COMPREHENSIVE tier)
      const result = service.getModelForRepository(
        repository, 
        AnalysisTier.COMPREHENSIVE, 
        ModelSelectionStrategy.PERFORMANCE
      );
      
      // Verify result prioritizes performance (OpenAI) over detail (Claude)
      expect(result.provider).to.equal('openai');
      expect(result.model).to.equal('gpt-4o');
    });
    
    it('should fall back to defaults for unknown languages', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'exotic-lang',
        sizeBytes: 20 * 1024 * 1024 // 20MB
      };
      
      // Get model for repository
      const result = service.getModelForRepository(repository, AnalysisTier.COMPREHENSIVE);
      
      // Verify result falls back to default for medium size
      expect(result.provider).to.equal('anthropic');
      expect(result.model).to.be.a('string');
    });
  });
  
  describe('getModelForPR', () => {
    it('should prioritize performance for small PRs regardless of repo size', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'javascript',
        sizeBytes: 100 * 1024 * 1024 // 100MB (large repo)
      };
      
      // Get model for PR with small PR size
      const result = service.getModelForPR(
        repository,
        100 * 1024, // 100KB PR
        AnalysisTier.QUICK
      );
      
      // Verify result prioritizes performance for small PR
      expect(result.provider).to.equal('openai');
      expect(result.model).to.equal('gpt-4o');
    });
    
    it('should use repository size category for comprehensive analysis', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'javascript',
        sizeBytes: 100 * 1024 * 1024 // 100MB (large repo)
      };
      
      // Get model for PR with small PR size but comprehensive analysis
      const result = service.getModelForPR(
        repository,
        100 * 1024, // 100KB PR
        AnalysisTier.COMPREHENSIVE
      );
      
      // Verify result uses repository size for comprehensive analysis
      expect(result.provider).to.equal('anthropic');
      expect(result.model).to.be.a('string');
    });
  });
  
  describe('checkCalibrationNeeded', () => {
    it('should require calibration for unknown languages', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'dart',
        sizeBytes: 20 * 1024 * 1024 // 20MB
      };
      
      // Check if calibration is needed
      const decision = service.checkCalibrationNeeded(repository);
      
      // Verify decision
      expect(decision.requiresCalibration).to.be.true;
      expect(decision.calibrationType).to.equal('full');
      expect(decision.temporaryConfig).to.not.be.undefined;
    });
    
    it('should not require calibration for well-tested languages', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'python',
        sizeBytes: 20 * 1024 * 1024 // 20MB
      };
      
      // Check if calibration is needed
      const decision = service.checkCalibrationNeeded(repository);
      
      // Verify decision
      expect(decision.requiresCalibration).to.be.false;
      expect(decision.selectedConfig).to.not.be.undefined;
    });
    
    it('should require partial calibration for complex frameworks', () => {
      // Create repository context
      const repository: RepositoryContext = {
        owner: 'test-owner',
        repo: 'test-repo',
        repoType: 'github',
        language: 'javascript',
        frameworks: ['next.js', 'react'],
        sizeBytes: 20 * 1024 * 1024 // 20MB
      };
      
      // Check if calibration is needed
      const decision = service.checkCalibrationNeeded(repository);
      
      // Verify decision
      expect(decision.requiresCalibration).to.be.true;
      expect(decision.calibrationType).to.equal('partial');
      expect(decision.temporaryConfig).to.not.be.undefined;
    });
  });
});

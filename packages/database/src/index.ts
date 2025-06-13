// Export Supabase client
export { getSupabase, initSupabase } from './supabase/client';
export type { Tables } from './supabase/client';

// Import models
import { PRReviewModel as PRReviewModelImpl, AnalysisMode } from './models/pr-review';
import { RepositoryModel as RepositoryModelImpl } from './models/repository';
import { SkillModel as SkillModelImpl } from './models/skill';
import { RepositoryAnalysisModel as RepositoryAnalysisModelImpl, RepositoryAnalyzer } from './models/repository-analysis';
import { CalibrationModel as CalibrationModelImpl } from './models/calibration';

// Re-export models
export const PRReviewModel = PRReviewModelImpl;
export const RepositoryModel = RepositoryModelImpl;
export const SkillModel = SkillModelImpl;
export const RepositoryAnalysisModel = RepositoryAnalysisModelImpl;
export const CalibrationModel = CalibrationModelImpl;

// Export enums
export { AnalysisMode, RepositoryAnalyzer };

// Export types
export type { PRReview, AnalysisResultRecord } from './models/pr-review';
export type { Repository } from './models/repository';
export type { SkillCategory, DeveloperSkill, SkillHistoryEntry } from './models/skill';
export type { RepositoryAnalysis } from './models/repository-analysis';
export type { CalibrationRun, CalibrationTestResult } from './models/calibration';

// Export ingestion services
export { VectorStorageService } from './services/ingestion/vector-storage.service';
export type { EnhancedChunk, ChunkMetadata, VectorRecord } from './services/ingestion/types';

// Database service for easier access to models
export class DatabaseService {
  // Repositories
  static async findOrCreateRepository(
    provider: string,
    name: string,
    url: string,
    isPrivate = false
  ) {
    return RepositoryModelImpl.findOrCreate(provider, name, url, isPrivate);
  }
  
  static async getRepositoryById(id: string) {
    return RepositoryModelImpl.getById(id);
  }
  
  static async getRepositoriesByProviderAndOwner(provider: string, owner: string) {
    return RepositoryModelImpl.getByProviderAndOwner(provider, owner);
  }
  
  // PR Reviews
  static async createPRReview(
    prUrl: string,
    repositoryId: string,
    userId: string,
    analysisMode: AnalysisMode = AnalysisMode.QUICK,
    prTitle?: string,
    prDescription?: string
  ) {
    return PRReviewModelImpl.create(prUrl, repositoryId, userId, analysisMode, prTitle, prDescription);
  }
  
  static async getPRReviewById(id: string) {
    return PRReviewModelImpl.getById(id);
  }
  
  static async getPRReviewsByUserId(userId: string) {
    return PRReviewModelImpl.getByUserId(userId);
  }
  
  // Skills
  static async getAllSkillCategories() {
    return SkillModelImpl.getAllCategories();
  }
  
  static async getSkillCategoryById(id: string) {
    return SkillModelImpl.getCategoryById(id);
  }
  
  static async getUserSkills(userId: string) {
    return SkillModelImpl.getUserSkills(userId);
  }
  
  static async updateSkill(skillId: string, level: number, evidenceType: string, evidenceId?: string) {
    return SkillModelImpl.updateSkill(skillId, level, evidenceType, evidenceId);
  }
  
  // Repository Analysis
  static async getLatestRepositoryAnalysis(repositoryId: string, analyzer: RepositoryAnalyzer) {
    return RepositoryAnalysisModelImpl.getLatest(repositoryId, analyzer);
  }
  
  static async getValidRepositoryAnalysisCache(repositoryId: string, analyzer: RepositoryAnalyzer) {
    return RepositoryAnalysisModelImpl.getValidCache(repositoryId, analyzer);
  }
  
  static async storeRepositoryAnalysis(
    repositoryId: string,
    analyzer: RepositoryAnalyzer,
    analysisData: Record<string, any>,
    cacheTTL?: number,
    metadata?: Record<string, any>,
    executionTimeMs?: number,
    tokenCount?: number
  ) {
    return RepositoryAnalysisModelImpl.store(
      repositoryId,
      analyzer,
      analysisData,
      cacheTTL,
      metadata,
      executionTimeMs,
      tokenCount
    );
  }
  
  static async invalidateRepositoryAnalysisCache(repositoryId: string, analyzer?: RepositoryAnalyzer) {
    return RepositoryAnalysisModelImpl.invalidateCache(repositoryId, analyzer);
  }
  
  // Calibration
  static async storeCalibrationRun(
    runId: string,
    modelVersions: Record<string, string>,
    metrics: Record<string, any>[]
  ) {
    return CalibrationModelImpl.storeCalibrationRun(runId, modelVersions, metrics);
  }
  
  static async storeCalibrationTestResult(
    runId: string,
    repositoryId: string,
    size: string,
    languages: string[],
    architecture: string,
    results: Record<string, Record<string, number>>
  ) {
    return CalibrationModelImpl.storeTestResult(
      runId,
      repositoryId,
      size,
      languages,
      architecture,
      results
    );
  }
  
  static async getLatestCalibrationRun() {
    return CalibrationModelImpl.getLatestCalibrationRun();
  }
  
  static async getCalibrationRunById(runId: string) {
    return CalibrationModelImpl.getCalibrationRunById(runId);
  }
  
  static async getCalibrationTestResultsForRun(runId: string) {
    return CalibrationModelImpl.getTestResultsForRun(runId);
  }
}

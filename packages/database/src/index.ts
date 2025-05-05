// Export Supabase client
export { getSupabase, initSupabase } from './supabase/client';
export type { Tables } from './supabase/client';

// Import models
import { PRReviewModel as PRReviewModelImpl } from './models/pr-review';
import { RepositoryModel as RepositoryModelImpl } from './models/repository';
import { SkillModel as SkillModelImpl } from './models/skill';

// Re-export models
export const PRReviewModel = PRReviewModelImpl;
export const RepositoryModel = RepositoryModelImpl;
export const SkillModel = SkillModelImpl;

// Export types
export type { PRReview, AnalysisResultRecord } from './models/pr-review';
export type { Repository } from './models/repository';
export type { SkillCategory, DeveloperSkill, SkillHistoryEntry } from './models/skill';

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
    prTitle?: string,
    prDescription?: string
  ) {
    return PRReviewModelImpl.create(prUrl, repositoryId, userId, prTitle, prDescription);
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
}

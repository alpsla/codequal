"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = exports.VectorStorageService = exports.RepositoryAnalyzer = exports.AnalysisMode = exports.CalibrationModel = exports.RepositoryAnalysisModel = exports.SkillModel = exports.RepositoryModel = exports.PRReviewModel = exports.initSupabase = exports.getSupabase = void 0;
// Export Supabase client
var client_1 = require("./supabase/client");
Object.defineProperty(exports, "getSupabase", { enumerable: true, get: function () { return client_1.getSupabase; } });
Object.defineProperty(exports, "initSupabase", { enumerable: true, get: function () { return client_1.initSupabase; } });
// Import models
const pr_review_1 = require("./models/pr-review");
Object.defineProperty(exports, "AnalysisMode", { enumerable: true, get: function () { return pr_review_1.AnalysisMode; } });
const repository_1 = require("./models/repository");
const skill_1 = require("./models/skill");
const repository_analysis_1 = require("./models/repository-analysis");
Object.defineProperty(exports, "RepositoryAnalyzer", { enumerable: true, get: function () { return repository_analysis_1.RepositoryAnalyzer; } });
const calibration_1 = require("./models/calibration");
// Re-export models
exports.PRReviewModel = pr_review_1.PRReviewModel;
exports.RepositoryModel = repository_1.RepositoryModel;
exports.SkillModel = skill_1.SkillModel;
exports.RepositoryAnalysisModel = repository_analysis_1.RepositoryAnalysisModel;
exports.CalibrationModel = calibration_1.CalibrationModel;
// Export ingestion services
var vector_storage_service_1 = require("./services/ingestion/vector-storage.service");
Object.defineProperty(exports, "VectorStorageService", { enumerable: true, get: function () { return vector_storage_service_1.VectorStorageService; } });
// Database service for easier access to models
class DatabaseService {
    // Repositories
    static async findOrCreateRepository(provider, name, url, isPrivate = false) {
        return repository_1.RepositoryModel.findOrCreate(provider, name, url, isPrivate);
    }
    static async getRepositoryById(id) {
        return repository_1.RepositoryModel.getById(id);
    }
    static async getRepositoriesByProviderAndOwner(provider, owner) {
        return repository_1.RepositoryModel.getByProviderAndOwner(provider, owner);
    }
    // PR Reviews
    static async createPRReview(prUrl, repositoryId, userId, analysisMode = pr_review_1.AnalysisMode.QUICK, prTitle, prDescription) {
        return pr_review_1.PRReviewModel.create(prUrl, repositoryId, userId, analysisMode, prTitle, prDescription);
    }
    static async getPRReviewById(id) {
        return pr_review_1.PRReviewModel.getById(id);
    }
    static async getPRReviewsByUserId(userId) {
        return pr_review_1.PRReviewModel.getByUserId(userId);
    }
    // Skills
    static async getAllSkillCategories() {
        return skill_1.SkillModel.getAllCategories();
    }
    static async getSkillCategoryById(id) {
        return skill_1.SkillModel.getCategoryById(id);
    }
    static async getUserSkills(userId) {
        return skill_1.SkillModel.getUserSkills(userId);
    }
    static async updateSkill(skillId, level, evidenceType, evidenceId) {
        return skill_1.SkillModel.updateSkill(skillId, level, evidenceType, evidenceId);
    }
    // Repository Analysis
    static async getLatestRepositoryAnalysis(repositoryId, analyzer) {
        return repository_analysis_1.RepositoryAnalysisModel.getLatest(repositoryId, analyzer);
    }
    static async getValidRepositoryAnalysisCache(repositoryId, analyzer) {
        return repository_analysis_1.RepositoryAnalysisModel.getValidCache(repositoryId, analyzer);
    }
    static async storeRepositoryAnalysis(repositoryId, analyzer, analysisData, cacheTTL, metadata, executionTimeMs, tokenCount) {
        return repository_analysis_1.RepositoryAnalysisModel.store(repositoryId, analyzer, analysisData, cacheTTL, metadata, executionTimeMs, tokenCount);
    }
    static async invalidateRepositoryAnalysisCache(repositoryId, analyzer) {
        return repository_analysis_1.RepositoryAnalysisModel.invalidateCache(repositoryId, analyzer);
    }
    // Calibration
    static async storeCalibrationRun(runId, modelVersions, metrics) {
        return calibration_1.CalibrationModel.storeCalibrationRun(runId, modelVersions, metrics);
    }
    static async storeCalibrationTestResult(runId, repositoryId, size, languages, architecture, results) {
        return calibration_1.CalibrationModel.storeTestResult(runId, repositoryId, size, languages, architecture, results);
    }
    static async getLatestCalibrationRun() {
        return calibration_1.CalibrationModel.getLatestCalibrationRun();
    }
    static async getCalibrationRunById(runId) {
        return calibration_1.CalibrationModel.getCalibrationRunById(runId);
    }
    static async getCalibrationTestResultsForRun(runId) {
        return calibration_1.CalibrationModel.getTestResultsForRun(runId);
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=index.js.map
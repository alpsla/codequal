"use strict";
/**
 * Standard Framework Exports
 *
 * Main entry point for the Standard framework components
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillCalculator = exports.ReportGeneratorV8Final = exports.ReportGenerator = exports.ComparisonAgent = exports.MockDataStore = exports.MockSkillProvider = exports.MockConfigProvider = exports.createTestOrchestrator = exports.StandardAgentFactory = exports.ModelResearcherService = exports.ComparisonOrchestrator = void 0;
// Orchestrator
var comparison_orchestrator_1 = require("./orchestrator/comparison-orchestrator");
Object.defineProperty(exports, "ComparisonOrchestrator", { enumerable: true, get: function () { return comparison_orchestrator_1.ComparisonOrchestrator; } });
// Services
// The codebase uses MCP tools and the two-branch analysis system
// Model Research Service
var model_researcher_service_1 = require("./services/model-researcher-service");
Object.defineProperty(exports, "ModelResearcherService", { enumerable: true, get: function () { return model_researcher_service_1.ModelResearcherService; } });
// Factory
var factory_1 = require("./infrastructure/factory");
Object.defineProperty(exports, "StandardAgentFactory", { enumerable: true, get: function () { return factory_1.StandardAgentFactory; } });
Object.defineProperty(exports, "createTestOrchestrator", { enumerable: true, get: function () { return factory_1.createTestOrchestrator; } });
Object.defineProperty(exports, "MockConfigProvider", { enumerable: true, get: function () { return factory_1.MockConfigProvider; } });
Object.defineProperty(exports, "MockSkillProvider", { enumerable: true, get: function () { return factory_1.MockSkillProvider; } });
Object.defineProperty(exports, "MockDataStore", { enumerable: true, get: function () { return factory_1.MockDataStore; } });
// Comparison Agent
var comparison_agent_1 = require("./comparison/comparison-agent");
Object.defineProperty(exports, "ComparisonAgent", { enumerable: true, get: function () { return comparison_agent_1.ComparisonAgent; } });
// V8 is the current report generator
var report_generator_v8_final_1 = require("./comparison/report-generator-v8-final");
Object.defineProperty(exports, "ReportGenerator", { enumerable: true, get: function () { return report_generator_v8_final_1.ReportGeneratorV8Final; } });
var report_generator_v8_final_2 = require("./comparison/report-generator-v8-final");
Object.defineProperty(exports, "ReportGeneratorV8Final", { enumerable: true, get: function () { return report_generator_v8_final_2.ReportGeneratorV8Final; } });
// V7 generators have been removed - use V8 only
var skill_calculator_1 = require("./comparison/skill-calculator");
Object.defineProperty(exports, "SkillCalculator", { enumerable: true, get: function () { return skill_calculator_1.SkillCalculator; } });
// Types
__exportStar(require("./types/analysis-types"), exports);
__exportStar(require("./comparison/interfaces/comparison-agent.interface"), exports);

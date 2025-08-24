"use strict";
/**
 * Repository and analysis-related types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisSeverity = exports.AnalysisResultType = void 0;
/**
 * Repository analysis result types
 */
var AnalysisResultType;
(function (AnalysisResultType) {
    AnalysisResultType["CODE_QUALITY"] = "code_quality";
    AnalysisResultType["SECURITY"] = "security";
    AnalysisResultType["PERFORMANCE"] = "performance";
    AnalysisResultType["ARCHITECTURE"] = "architecture";
    AnalysisResultType["DOCUMENTATION"] = "documentation";
    AnalysisResultType["TESTING"] = "testing";
    AnalysisResultType["DEPENDENCY"] = "dependency";
})(AnalysisResultType || (exports.AnalysisResultType = AnalysisResultType = {}));
/**
 * Repository analysis result severity
 */
var AnalysisSeverity;
(function (AnalysisSeverity) {
    AnalysisSeverity["INFO"] = "info";
    AnalysisSeverity["WARNING"] = "warning";
    AnalysisSeverity["ERROR"] = "error";
    AnalysisSeverity["CRITICAL"] = "critical";
})(AnalysisSeverity || (exports.AnalysisSeverity = AnalysisSeverity = {}));

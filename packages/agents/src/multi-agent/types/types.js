"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisStrategy = exports.AgentPosition = void 0;
/**
 * Defines the position of an agent within a multi-agent system
 */
var AgentPosition;
(function (AgentPosition) {
    AgentPosition["PRIMARY"] = "primary";
    AgentPosition["SECONDARY"] = "secondary";
    AgentPosition["FALLBACK"] = "fallback";
    AgentPosition["SPECIALIST"] = "specialist"; // Used for specific types of analysis based on file types
})(AgentPosition || (exports.AgentPosition = AgentPosition = {}));
/**
 * Defines the type of analysis to be performed
 */
var AnalysisStrategy;
(function (AnalysisStrategy) {
    AnalysisStrategy["PARALLEL"] = "parallel";
    AnalysisStrategy["SEQUENTIAL"] = "sequential";
    AnalysisStrategy["SPECIALIZED"] = "specialized"; // Use specialized agents for specific file types
})(AnalysisStrategy || (exports.AnalysisStrategy = AnalysisStrategy = {}));

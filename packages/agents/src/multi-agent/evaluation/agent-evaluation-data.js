"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockAgentEvaluationData = exports.defaultTemperatures = void 0;
exports.shouldUseSecondaryAgent = shouldUseSecondaryAgent;
const agent_registry_1 = require("@codequal/core/config/agent-registry");
/**
 * Default temperatures by role
 * Used to optimize agent configuration
 */
// Default temperatures for each agent role
exports.defaultTemperatures = {
    [agent_registry_1.AgentRole.CODE_QUALITY]: 0.2, // More deterministic
    [agent_registry_1.AgentRole.SECURITY]: 0.3, // Balanced
    [agent_registry_1.AgentRole.PERFORMANCE]: 0.25, // More deterministic
    [agent_registry_1.AgentRole.ARCHITECTURE]: 0.3, // Balanced for structural analysis
    [agent_registry_1.AgentRole.EDUCATIONAL]: 0.5, // More creative
    [agent_registry_1.AgentRole.ORCHESTRATOR]: 0.3, // Balanced
    [agent_registry_1.AgentRole.DEPENDENCY]: 0.3, // Balanced
    [agent_registry_1.AgentRole.REPORT_GENERATION]: 0.4, // Slightly creative
    [agent_registry_1.AgentRole.RESEARCHER]: 0.35, // Balanced with slight creativity for discovery
    [agent_registry_1.AgentRole.LOCATION_FINDER]: 0.1, // Very deterministic for exact location finding
    [agent_registry_1.AgentRole.DEEPWIKI]: 0.3 // Moderate variance for comprehensive analysis
};
/**
 * Determines if a secondary agent should be used based on context
 * @param context Repository context
 * @param prContext PR context
 * @param primaryAgentResult Result from primary agent
 * @param criteria Decision criteria
 * @returns Whether to use a secondary agent
 */
function shouldUseSecondaryAgent(context, prContext, primaryAgentResult, // Using any for now, will be refined with actual type
criteria) {
    // Calculate a weighted score based on multiple factors
    let score = 0;
    // Add complexity factor
    score += context.complexity * 0.2;
    // Add impact factor
    score += prContext.changeImpact * 0.3;
    // Add confidence factor (lower confidence = higher score)
    const confidenceFactor = criteria.confidenceThreshold -
        (primaryAgentResult.metadata?.confidence || 0.5);
    score += Math.max(0, confidenceFactor) * 0.3;
    // Add language factor
    const language = context.primaryLanguages[0] || '';
    score += (criteria.languageFactors[language] || 0) * 0.1;
    // Add business criticality
    score += criteria.businessCriticalityScore * 0.1;
    // Decision threshold (configurable)
    return score > 50;
}
/**
 * Mock agent evaluation data for testing
 */
// Helper function to create a default agent evaluation data with basic values
const createDefaultAgentData = () => ({
    rolePerformance: {
        [agent_registry_1.AgentRole.ORCHESTRATOR]: {
            overallScore: 75,
            specialties: ['Basic Orchestration'],
            weaknesses: ['Complex Workflows'],
            bestPerformingLanguages: {
                'JavaScript': 75,
                'TypeScript': 75,
                'Python': 75,
                'Java': 75
            },
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.CODE_QUALITY]: {
            overallScore: 75,
            specialties: ['Basic Quality Analysis'],
            weaknesses: ['Advanced Analysis'],
            bestPerformingLanguages: {
                'JavaScript': 75,
                'TypeScript': 75,
                'Python': 75,
                'Java': 75
            },
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.SECURITY]: {
            overallScore: 75,
            specialties: ['Basic Security Analysis'],
            weaknesses: ['Complex Vulnerabilities'],
            bestPerformingLanguages: {},
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.PERFORMANCE]: {
            overallScore: 75,
            specialties: ['Basic Performance Analysis'],
            weaknesses: ['Advanced Optimization'],
            bestPerformingLanguages: {},
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.ARCHITECTURE]: {
            overallScore: 80,
            specialties: ['Architecture Analysis', 'Design Patterns'],
            weaknesses: ['Complex System Design'],
            bestPerformingLanguages: {},
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.DEPENDENCY]: {
            overallScore: 75,
            specialties: ['Basic Dependency Analysis'],
            weaknesses: ['Complex Dependency Trees'],
            bestPerformingLanguages: {},
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.EDUCATIONAL]: {
            overallScore: 75,
            specialties: ['Basic Educational Content'],
            weaknesses: ['Advanced Topics'],
            bestPerformingLanguages: {},
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.REPORT_GENERATION]: {
            overallScore: 75,
            specialties: ['Basic Reports'],
            weaknesses: ['Advanced Documentation'],
            bestPerformingLanguages: {},
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.RESEARCHER]: {
            overallScore: 85,
            specialties: ['Model Research', 'Market Analysis', 'Dynamic Discovery'],
            weaknesses: ['Implementation Details'],
            bestPerformingLanguages: {
                'researcher': 90,
                'analysis': 85
            },
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.LOCATION_FINDER]: {
            overallScore: 95,
            specialties: ['Exact Location Finding', 'Code Understanding', 'Pattern Matching'],
            weaknesses: ['Large Files'],
            bestPerformingLanguages: {
                'JavaScript': 95,
                'TypeScript': 95,
                'Python': 90,
                'Java': 85
            },
            bestFileTypes: {},
            bestScenarios: {}
        },
        [agent_registry_1.AgentRole.DEEPWIKI]: {
            overallScore: 90,
            specialties: ['Comprehensive Analysis', 'Deep Code Understanding', 'Security Issues'],
            weaknesses: ['Speed'],
            bestPerformingLanguages: {
                'JavaScript': 90,
                'TypeScript': 92,
                'Python': 88,
                'Java': 85
            },
            bestFileTypes: {},
            bestScenarios: {}
        }
    },
    languageSupport: {
        fullSupport: ['JavaScript', 'Python'],
        goodSupport: ['TypeScript', 'Java'],
        basicSupport: ['C++', 'Go'],
        limitedSupport: ['Rust', 'Scala']
    }
});
// Create the mock agent evaluation data for all providers
exports.mockAgentEvaluationData = {
    // MCP options
    [agent_registry_1.AgentProvider.MCP_CODE_REVIEW]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.MCP_DEPENDENCY]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.MCP_CODE_CHECKER]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.MCP_REPORTER]: createDefaultAgentData(),
    // Direct LLM providers
    [agent_registry_1.AgentProvider.CLAUDE]: {
        rolePerformance: {
            [agent_registry_1.AgentRole.ORCHESTRATOR]: {
                overallScore: 90,
                specialties: ['Complex Workflows', 'Coordination'],
                weaknesses: ['Hardware-specific Orchestration'],
                bestPerformingLanguages: {
                    'JavaScript': 90,
                    'TypeScript': 92,
                    'Python': 89,
                    'Java': 85
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.CODE_QUALITY]: {
                overallScore: 92,
                specialties: ['JavaScript', 'Python', 'API Design'],
                weaknesses: ['Assembly', 'Embedded Systems'],
                bestPerformingLanguages: {
                    'JavaScript': 93,
                    'TypeScript': 90,
                    'Python': 88,
                    'Java': 85
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.SECURITY]: {
                overallScore: 85,
                specialties: ['Web Security', 'Authorization'],
                weaknesses: ['Cryptography', 'Low-level Security'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.PERFORMANCE]: {
                overallScore: 78,
                specialties: ['Algorithm Analysis', 'Database Optimization'],
                weaknesses: ['Hardware Optimization', 'Kernel-level Performance'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.ARCHITECTURE]: {
                overallScore: 82,
                specialties: ['System Architecture', 'Design Patterns'],
                weaknesses: ['Complex Distributed Systems'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.DEPENDENCY]: {
                overallScore: 88,
                specialties: ['Dependency Resolution', 'Version Management'],
                weaknesses: ['Native Dependencies'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.EDUCATIONAL]: {
                overallScore: 95,
                specialties: ['Detailed Explanations', 'Beginner Tutorials'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.REPORT_GENERATION]: {
                overallScore: 90,
                specialties: ['API Documentation', 'User Guides'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.RESEARCHER]: {
                overallScore: 94,
                specialties: ['Model Discovery', 'Cross-Market Analysis', 'Reasoning'],
                weaknesses: ['Implementation Details'],
                bestPerformingLanguages: {
                    'researcher': 95,
                    'analysis': 92
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.LOCATION_FINDER]: {
                overallScore: 95,
                specialties: ['Exact Location Finding', 'Code Understanding', 'Pattern Matching'],
                weaknesses: ['Large Files'],
                bestPerformingLanguages: {
                    'JavaScript': 95,
                    'TypeScript': 95,
                    'Python': 90,
                    'Java': 85
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.DEEPWIKI]: {
                overallScore: 92,
                specialties: ['Comprehensive Analysis', 'Deep Code Understanding', 'Security Issues'],
                weaknesses: ['Speed'],
                bestPerformingLanguages: {
                    'JavaScript': 92,
                    'TypeScript': 93,
                    'Python': 90,
                    'Java': 87
                },
                bestFileTypes: {},
                bestScenarios: {}
            }
        },
        languageSupport: {
            fullSupport: ['JavaScript', 'TypeScript', 'Python', 'Java'],
            goodSupport: ['Go', 'Ruby', 'PHP', 'C#'],
            basicSupport: ['C++', 'Rust', 'Swift'],
            limitedSupport: ['Kotlin', 'Scala', 'Perl']
        }
    },
    [agent_registry_1.AgentProvider.OPENAI]: {
        rolePerformance: {
            [agent_registry_1.AgentRole.ORCHESTRATOR]: {
                overallScore: 89,
                specialties: ['Workflow Management', 'Task Distribution'],
                weaknesses: ['Complex System Integration'],
                bestPerformingLanguages: {
                    'JavaScript': 87,
                    'TypeScript': 88,
                    'Python': 90,
                    'Java': 84
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.CODE_QUALITY]: {
                overallScore: 88,
                specialties: ['Refactoring', 'Code Style'],
                weaknesses: ['Legacy Systems'],
                bestPerformingLanguages: {
                    'JavaScript': 86,
                    'TypeScript': 85,
                    'Python': 90,
                    'Java': 82
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.SECURITY]: {
                overallScore: 91,
                specialties: ['Injection Vulnerabilities', 'Authentication'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.PERFORMANCE]: {
                overallScore: 82,
                specialties: ['Memory Usage', 'Execution Efficiency'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.ARCHITECTURE]: {
                overallScore: 84,
                specialties: ['System Design', 'API Architecture'],
                weaknesses: ['Complex Distributed Systems'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.DEPENDENCY]: {
                overallScore: 85,
                specialties: ['Package Management', 'Library Compatibility'],
                weaknesses: ['Complex Dependency Trees'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.EDUCATIONAL]: {
                overallScore: 87,
                specialties: ['Interactive Tutorials', 'Concise Explanations'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.REPORT_GENERATION]: {
                overallScore: 85,
                specialties: ['Technical Writing', 'Code Comments'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.RESEARCHER]: {
                overallScore: 88,
                specialties: ['Model Evaluation', 'Market Research', 'Data Analysis'],
                weaknesses: ['Complex Reasoning'],
                bestPerformingLanguages: {
                    'researcher': 90,
                    'analysis': 85
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.LOCATION_FINDER]: {
                overallScore: 95,
                specialties: ['Exact Location Finding', 'Code Understanding', 'Pattern Matching'],
                weaknesses: ['Large Files'],
                bestPerformingLanguages: {
                    'JavaScript': 95,
                    'TypeScript': 95,
                    'Python': 90,
                    'Java': 85
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.DEEPWIKI]: {
                overallScore: 92,
                specialties: ['Comprehensive Analysis', 'Deep Code Understanding', 'Security Issues'],
                weaknesses: ['Speed'],
                bestPerformingLanguages: {
                    'JavaScript': 92,
                    'TypeScript': 93,
                    'Python': 90,
                    'Java': 87
                },
                bestFileTypes: {},
                bestScenarios: {}
            }
        },
        languageSupport: {
            fullSupport: ['JavaScript', 'Python', 'Java', 'C#'],
            goodSupport: ['TypeScript', 'Go', 'Ruby', 'PHP'],
            basicSupport: ['C++', 'Swift', 'Rust'],
            limitedSupport: ['Haskell', 'Scala', 'R']
        }
    },
    [agent_registry_1.AgentProvider.DEEPSEEK_CODER]: {
        rolePerformance: {
            [agent_registry_1.AgentRole.ORCHESTRATOR]: {
                overallScore: 82,
                specialties: ['System Analysis', 'Technical Integration'],
                weaknesses: ['Business Logic Orchestration'],
                bestPerformingLanguages: {
                    'C++': 90,
                    'JavaScript': 80,
                    'TypeScript': 82,
                    'Python': 86
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.CODE_QUALITY]: {
                overallScore: 83,
                specialties: ['Low-level Optimization', 'Complex Logic'],
                weaknesses: ['Web Frameworks'],
                bestPerformingLanguages: {
                    'C++': 92,
                    'JavaScript': 78,
                    'TypeScript': 80,
                    'Python': 85
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.SECURITY]: {
                overallScore: 76,
                specialties: ['Buffer Overflows', 'Memory Safety'],
                weaknesses: ['Web Security'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.PERFORMANCE]: {
                overallScore: 93,
                specialties: ['Algorithm Optimization', 'Execution Speed'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.ARCHITECTURE]: {
                overallScore: 78,
                specialties: ['System Architecture', 'Low-level Design'],
                weaknesses: ['High-level Business Architecture'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.DEPENDENCY]: {
                overallScore: 79,
                specialties: ['System Dependency Analysis', 'Binary Compatibility'],
                weaknesses: ['Modern Package Ecosystems'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.EDUCATIONAL]: {
                overallScore: 80,
                specialties: ['Advanced Topics', 'Deep Dives'],
                weaknesses: ['Beginner Material'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.REPORT_GENERATION]: {
                overallScore: 75,
                specialties: ['Technical API Details', 'Implementation Notes'],
                weaknesses: ['User-friendly Documentation'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.RESEARCHER]: {
                overallScore: 87,
                specialties: ['Technical Analysis', 'Performance Research', 'Code Understanding'],
                weaknesses: ['Market Research'],
                bestPerformingLanguages: {
                    'researcher': 88,
                    'analysis': 90
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.LOCATION_FINDER]: {
                overallScore: 90,
                specialties: ['Code Location', 'Pattern Matching', 'Error Detection'],
                weaknesses: ['Natural Language Understanding'],
                bestPerformingLanguages: {
                    'C++': 92,
                    'C': 92,
                    'Python': 88,
                    'Java': 85
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.DEEPWIKI]: {
                overallScore: 88,
                specialties: ['Low-Level Analysis', 'Security Issues', 'Performance'],
                weaknesses: ['Web Frameworks'],
                bestPerformingLanguages: {
                    'C++': 90,
                    'C': 90,
                    'Python': 86,
                    'Java': 84
                },
                bestFileTypes: {},
                bestScenarios: {}
            }
        },
        languageSupport: {
            fullSupport: ['C++', 'C', 'Rust', 'Go'],
            goodSupport: ['Python', 'Java', 'TypeScript'],
            basicSupport: ['JavaScript', 'C#', 'Ruby'],
            limitedSupport: ['PHP', 'Swift', 'Kotlin']
        }
    },
    [agent_registry_1.AgentProvider.GEMINI_2_5_PRO]: {
        rolePerformance: {
            [agent_registry_1.AgentRole.ORCHESTRATOR]: {
                overallScore: 88,
                specialties: ['Cross-discipline Coordination', 'Balanced Decision Making'],
                weaknesses: ['Complex System Engineering'],
                bestPerformingLanguages: {
                    'JavaScript': 89,
                    'TypeScript': 90,
                    'Python': 88,
                    'Java': 87
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.CODE_QUALITY]: {
                overallScore: 86,
                specialties: ['Mobile Development', 'Modern Frameworks'],
                weaknesses: ['Legacy Code'],
                bestPerformingLanguages: {
                    'JavaScript': 88,
                    'TypeScript': 89,
                    'Python': 87,
                    'Java': 90
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.SECURITY]: {
                overallScore: 84,
                specialties: ['Access Control', 'Secure Communication'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.PERFORMANCE]: {
                overallScore: 87,
                specialties: ['Resource Utilization', 'Concurrency'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.ARCHITECTURE]: {
                overallScore: 86,
                specialties: ['Modern Architecture', 'Cloud Design Patterns'],
                weaknesses: ['Legacy System Architecture'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.DEPENDENCY]: {
                overallScore: 83,
                specialties: ['Modern Package Ecosystems', 'Dependency Visualization'],
                weaknesses: ['System-level Dependencies'],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.EDUCATIONAL]: {
                overallScore: 91,
                specialties: ['Visual Explanations', 'Step-by-step Guides'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.REPORT_GENERATION]: {
                overallScore: 87,
                specialties: ['Comprehensive Coverage', 'Structured Documentation'],
                weaknesses: [],
                bestPerformingLanguages: {},
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.RESEARCHER]: {
                overallScore: 91,
                specialties: ['Comprehensive Analysis', 'Market Intelligence', 'Cost-Benefit Research'],
                weaknesses: ['Deep Technical Implementation'],
                bestPerformingLanguages: {
                    'researcher': 93,
                    'analysis': 89
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.LOCATION_FINDER]: {
                overallScore: 93,
                specialties: ['Multi-Language Support', 'Pattern Understanding', 'Context Analysis'],
                weaknesses: ['Precision in Large Files'],
                bestPerformingLanguages: {
                    'JavaScript': 93,
                    'TypeScript': 93,
                    'Python': 92,
                    'Java': 90
                },
                bestFileTypes: {},
                bestScenarios: {}
            },
            [agent_registry_1.AgentRole.DEEPWIKI]: {
                overallScore: 91,
                specialties: ['Comprehensive Analysis', 'Multi-Language Support', 'Documentation'],
                weaknesses: ['Real-time Performance'],
                bestPerformingLanguages: {
                    'JavaScript': 91,
                    'TypeScript': 92,
                    'Python': 90,
                    'Java': 89
                },
                bestFileTypes: {},
                bestScenarios: {}
            }
        },
        languageSupport: {
            fullSupport: ['JavaScript', 'TypeScript', 'Python', 'Kotlin'],
            goodSupport: ['Java', 'Go', 'Swift', 'C#'],
            basicSupport: ['C++', 'Ruby', 'PHP'],
            limitedSupport: ['Rust', 'Dart', 'Scala']
        }
    },
    // Add all remaining providers
    [agent_registry_1.AgentProvider.ANTHROPIC]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.GOOGLE]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.DEEPSEEK]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.OPENROUTER]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.DEEPSEEK_CODER_LITE]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.DEEPSEEK_CODER_PLUS]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.DEEPSEEK_CHAT]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.GEMINI_1_5_PRO]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.GEMINI_2_5_FLASH]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.BITO]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.CODE_RABBIT]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.MCP_GEMINI]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.MCP_OPENAI]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.MCP_GROK]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.MCP_LLAMA]: createDefaultAgentData(),
    [agent_registry_1.AgentProvider.MCP_DEEPSEEK]: createDefaultAgentData()
};

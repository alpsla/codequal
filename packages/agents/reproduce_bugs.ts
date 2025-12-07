
import { V9GroupedReportFormatter, EnrichedIssue } from './src/two-branch/analyzers/v9-grouped-report-formatter';
import { IssueGroup } from './src/two-branch/utils/issue-grouping';

// Mock data to reproduce BUG-079 and BUG-083
const mockIssues: EnrichedIssue[] = [
    // 1. Safe Auto-Fix (High Confidence) - e.g. UnusedImports
    {
        file: 'src/utils.ts',
        line: 10,
        rule: 'UnusedImports',
        tool: 'pmd',
        severity: 'medium',
        message: 'Unused import',
        category: 'NEW',
        detectedCategory: 'Code Quality',
        fixSuggestion: { fix: 'Remove import', correctedCode: '', explanation: '' }
    },
    // 2. Advanced Auto-Fix (Medium Confidence) - e.g. GuardLogStatement
    {
        file: 'src/logger.ts',
        line: 20,
        rule: 'GuardLogStatement',
        tool: 'pmd',
        severity: 'medium',
        message: 'Guard log statement',
        category: 'NEW',
        detectedCategory: 'Performance',
        fixSuggestion: { fix: 'Add guard', correctedCode: '', explanation: '' }
    },
    // 3. Manual Review (Low Confidence) - e.g. Security issue
    {
        rule: 'HardcodedPassword',
        tool: 'semgrep',
        severity: 'critical',
        message: 'Hardcoded password found',
        file: 'src/auth.ts',
        line: 30,
        category: 'NEW',
        detectedCategory: 'Security',
        fixSuggestion: { fix: 'Use env var', correctedCode: '', explanation: '' }
    },
    {
        rule: 'ComplexLogicError',
        tool: 'custom-tool',
        severity: 'high',
        message: 'Complex logic error requiring manual review',
        file: 'src/logic.ts',
        line: 42,
        category: 'NEW',
        detectedCategory: 'Logic'
    }
];

const mockGroups: IssueGroup[] = [
    {
        rule: 'UnusedImports',
        tool: 'pmd',
        severity: 'medium',
        description: 'Unused import',
        category: 'Code Quality',
        count: 1,
        examples: [],
        aiAnalyzed: true,
        costSaved: 0
    },
    {
        rule: 'GuardLogStatement',
        tool: 'pmd',
        severity: 'medium',
        description: 'Guard log statement',
        category: 'Performance',
        count: 1,
        examples: [],
        aiAnalyzed: true,
        costSaved: 0
    },
    {
        rule: 'HardcodedPassword',
        tool: 'semgrep',
        severity: 'critical',
        description: 'Hardcoded password',
        category: 'Security',
        count: 1,
        examples: [],
        aiAnalyzed: true,
        costSaved: 0
    },
    {
        rule: 'ComplexLogicError',
        tool: 'custom-tool',
        severity: 'high',
        description: 'Complex logic error requiring manual review',
        category: 'Logic',
        count: 1,
        examples: [],
        aiAnalyzed: true,
        costSaved: 0
    }
];

const mockMetadata = {
    repository: 'test/repo',
    prNumber: 123,
    totalFiles: 10,
    decision: 'APPROVED',
    blockingCount: 0,
    toolPerformance: [{ name: 'pmd', duration: 100 }] // Ensure toolsExecuted > 0
};

async function runReproduction() {
    const formatter = new V9GroupedReportFormatter();

    // Mock internal methods to avoid external dependencies
    (formatter as any).enrichIssuesWithAI = async () => ({
        enrichedIssues: mockIssues,
        modelsByAgent: {}
    });
    (formatter as any).generateCriticalBlockers = async () => "Critical Blockers Section";
    (formatter as any).generateTrendsAndRecommendations = async () => "Trends Section";
    (formatter as any).uploadAttachmentsToSupabase = async () => [];
    (formatter as any).generateLSPAndSARIFFormats = async () => ({});

    console.log("Generating report...");
    const result = await formatter.generateGroupedReport(mockIssues, mockGroups, mockMetadata);

    console.log("\n--- REPRODUCTION OUTPUT START ---\n");

    // Check for BUG-083 (Manual vs Auto-fix Confusion)
    console.log("Checking for Manual vs Auto-fix distinction...");
    if (result.markdown.includes("Manual Review")) {
        console.log("FOUND 'Manual Review' text in report.");
    } else {
        console.log("MISSING 'Manual Review' text in report.");
    }

    // Log the Action Required section content
    const actionRequiredSection = result.markdown.match(/\*\*Action Required\*\*:[\s\S]*?(?=\*\*By Severity\*\*)/);
    if (actionRequiredSection) {
        console.log("FOUND 'Action Required' section:");
        console.log(actionRequiredSection[0]);
    } else {
        console.log("MISSING 'Action Required' section in report.");
    }

    // Check for Manual Review Checklist
    console.log("\nChecking for Manual Review Checklist...");
    if (result.markdown.includes("Manual Review Checklist")) {
        console.log("FOUND 'Manual Review Checklist' section.");
    } else {
        console.log("MISSING 'Manual Review Checklist' section (might be 0 manual issues in mock data).");
    }

    // Check for BUG-079 (Confidence Breakdown)
    console.log("\nChecking Confidence Breakdown...");
    const confidenceSection = result.markdown.match(/\*\*Confidence Breakdown\*\*:[\s\S]*?(?=>)/);
    if (confidenceSection) {
        console.log(confidenceSection[0]);
    } else {
        console.log("Confidence Breakdown section not found.");
    }

    console.log("\n--- REPRODUCTION OUTPUT END ---\n");
}

runReproduction().catch(console.error);

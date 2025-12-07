/**
 * Rule-Based Tool Researcher Service
 *
 * Responsibilities:
 * 1. For each rule category we support, search the web for the best tools
 * 2. Use AI agent to compile search results and request additional searches if needed
 * 3. Validate tools exist on registries (npm/PyPI/Maven/GitHub)
 * 4. Store recommendations in Supabase for manual installation during maintenance
 *
 * Flow (Two-Step Process - Same as Educator):
 * - Step 1: Brave Search - Find best tools for each category (uses BRAVE_API_KEY)
 * - Step 2: AI Compilation - AI analyzes and compiles search results
 * - Step 3: Registry Validation - Verify tools on npm/PyPI/Maven/GitHub
 * - Step 4: Store in Supabase for manual Cloud installation
 *
 * NOTE: This service uses Brave Search (same as EducationalSearchService) to DISCOVER tools.
 * Tools discovered here need to be manually installed on Cloud instances during maintenance.
 */

import { createClient } from '@supabase/supabase-js';
import { AIService } from '../../standard/services/ai-service';
import axios from 'axios';

// Types
export interface RuleToolMapping {
  ruleId: string;
  ruleName: string;
  language: string;
  category: string;
  currentTool: string;
  currentVersion: string;
  bestTool: string;
  bestToolVersion: string;
  action: 'keep' | 'update_version' | 'replace';
  reason: string;
}

export interface ToolResearchResult {
  toolId: string;
  toolName: string;
  version: string;
  registry: 'npm' | 'pypi' | 'maven' | 'github';
  packageName: string;
  documentationUrl: string;
  installCommand: string;
  confidence: number; // 0-100
  reasoning: string;
  webSearchSources?: string[];
  registryValidated: boolean;
}

export interface ResearchReport {
  timestamp: Date;
  rulesProcessed: number;
  toolsKept: number;
  toolsUpdated: number;
  toolsReplaced: number;
  changes: RuleToolMapping[];
}

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

// Rule categories we support
const RULE_CATEGORIES = [
  'security',
  'quality',
  'style',
  'performance',
  'dependency',
  'type-safety',
  'secrets',
];

// Languages we support
const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'java',
  'go',
  'rust',
  'csharp',
  'cpp',
  'c',
  'ruby',
  'php',
  'swift',
  'kotlin',
];

export class RuleBasedToolResearcherService {
  private supabase: any;
  private aiService: AIService;
  private readonly braveApiKey?: string;
  private readonly RESEARCH_INTERVAL_DAYS = 90;
  private readonly MAX_SEARCH_ITERATIONS = 3;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.aiService = new AIService({
      openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
    });
    // Use same BRAVE_API_KEY as EducationalSearchService
    this.braveApiKey = process.env.BRAVE_API_KEY;
  }

  /**
   * Main entry point: Research best tools for all rules
   */
  async conductResearch(): Promise<ResearchReport> {
    console.log('🔬 Starting Rule-Based Tool Research');
    console.log('='.repeat(80));
    console.log('📋 Two-Step Research Process (Same as Educator):');
    console.log('   1. Brave Search - Find best tools for each category');
    console.log('   2. AI Compilation - Compile results, request more searches if needed');
    console.log('   3. Registry Validation - Verify tools on npm/PyPI/Maven/GitHub');
    console.log('   4. Store in Supabase for manual Cloud installation');

    if (!this.braveApiKey) {
      console.warn('⚠️ BRAVE_API_KEY not set - using AI knowledge fallback');
    }

    const changes: RuleToolMapping[] = [];
    let toolsKept = 0;
    let toolsUpdated = 0;
    let toolsReplaced = 0;

    // Step 1: Get all rules from Supabase
    console.log('\n📥 Step 1: Fetching all rules from Supabase...');
    const rules = await this.fetchAllRules();
    console.log(`   Found ${rules.length} rules across all tools`);

    // Step 2: Research best tools for each category/language
    console.log('\n🔍 Step 2: Researching best tools for each rule category...');

    for (const category of RULE_CATEGORIES) {
      for (const language of SUPPORTED_LANGUAGES) {
        const categoryRules = rules.filter(
          r => r.issue_type === category && r.language === language
        );

        if (categoryRules.length === 0) continue;

        console.log(`\n   📂 ${category}/${language}: ${categoryRules.length} rules`);

        // Two-step research: Brave Search + AI Compilation + Registry Validation
        const bestTool = await this.researchBestTool(category, language);

        if (!bestTool) {
          console.log(`      ⚠️ No tool found for ${category}/${language}`);
          continue;
        }

        console.log(`      🥇 Best tool: ${bestTool.toolName} v${bestTool.version}`);
        console.log(`         Install: ${bestTool.installCommand}`);
        console.log(`         Registry Validated: ${bestTool.registryValidated ? '✅' : '❌'}`);
        console.log(`         Confidence: ${bestTool.confidence}%`);

        // Compare with current tools for these rules
        for (const rule of categoryRules) {
          const mapping = await this.compareAndDecide(rule, bestTool);
          changes.push(mapping);

          if (mapping.action === 'keep') toolsKept++;
          else if (mapping.action === 'update_version') toolsUpdated++;
          else if (mapping.action === 'replace') toolsReplaced++;
        }
      }
    }

    // Step 3: Store changes in Supabase for manual installation
    console.log('\n💾 Step 3: Storing tool recommendations in Supabase...');
    await this.storeToolRecommendations(changes.filter(c => c.action !== 'keep'));

    // Generate report
    const report: ResearchReport = {
      timestamp: new Date(),
      rulesProcessed: rules.length,
      toolsKept,
      toolsUpdated,
      toolsReplaced,
      changes: changes.filter(c => c.action !== 'keep'),
    };

    this.printReport(report);

    return report;
  }

  /**
   * Two-Step Research Process:
   * 1. Brave Search - Find tools via web search (same API as Educator)
   * 2. AI Compilation - AI analyzes results, can request more searches
   * 3. Registry Validation - Verify on npm/PyPI/Maven/GitHub
   */
  private async researchBestTool(
    category: string,
    language: string
  ): Promise<ToolResearchResult | null> {
    const currentYear = new Date().getFullYear();
    const allSearchResults: BraveSearchResult[] = [];
    let iteration = 0;

    // Step 1: Initial Brave Search
    console.log(`      🔍 Step 1: Brave search for ${category} tools...`);
    const initialQueries = this.buildSearchQueries(category, language, currentYear);

    for (const query of initialQueries) {
      const results = await this.searchBrave(query);
      allSearchResults.push(...results);
    }

    console.log(`         Found ${allSearchResults.length} search results`);

    // Step 2: AI Compilation with potential additional searches
    console.log(`      🤖 Step 2: AI compilation of search results...`);

    let toolRecommendation: ToolResearchResult | null = null;

    while (iteration < this.MAX_SEARCH_ITERATIONS) {
      iteration++;

      const aiResult = await this.aiCompileSearchResults(
        category,
        language,
        allSearchResults,
        currentYear
      );

      if (aiResult.needsMoreSearch && aiResult.additionalQueries && iteration < this.MAX_SEARCH_ITERATIONS) {
        console.log(`         AI requests additional searches (iteration ${iteration})...`);
        for (const query of aiResult.additionalQueries) {
          const results = await this.searchBrave(query);
          allSearchResults.push(...results);
        }
      } else if (aiResult.recommendation) {
        toolRecommendation = aiResult.recommendation;
        break;
      } else {
        break;
      }
    }

    if (!toolRecommendation) {
      return null;
    }

    // Step 3: Registry Validation
    console.log(`      ✅ Step 3: Validating on ${toolRecommendation.registry}...`);
    const validatedTool = await this.validateOnRegistry(toolRecommendation);

    return validatedTool;
  }

  /**
   * Build initial search queries for a category/language
   */
  private buildSearchQueries(category: string, language: string, year: number): string[] {
    const queries = [
      `best ${category} analysis tool for ${language} ${year}`,
      `${language} ${category} linter comparison ${year}`,
      `top ${category} static analysis tools ${language}`,
    ];

    // Add category-specific queries
    if (category === 'security') {
      queries.push(`${language} security scanner SAST tool ${year}`);
      queries.push(`${language} vulnerability detection tool`);
    } else if (category === 'quality') {
      queries.push(`${language} code quality linter ${year}`);
    } else if (category === 'dependency') {
      queries.push(`${language} dependency vulnerability scanner ${year}`);
    } else if (category === 'secrets') {
      queries.push(`secret detection tool ${language} git ${year}`);
    }

    return queries;
  }

  /**
   * Perform web search using Brave Search API (same as EducationalSearchService)
   */
  private async searchBrave(query: string): Promise<BraveSearchResult[]> {
    if (!this.braveApiKey) {
      // Fallback: return empty and let AI use its training knowledge
      return [];
    }

    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&search_lang=en`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.braveApiKey}`,
        },
      });

      if (!response.ok) {
        console.log(`         ⚠️ Brave search failed for "${query}"`);
        return [];
      }

      const data = await response.json() as any;
      const results: BraveSearchResult[] = (data.web?.results || []).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        description: r.description || '',
      }));

      return results;
    } catch (error) {
      console.error(`         ❌ Search error for "${query}":`, error);
      return [];
    }
  }

  /**
   * AI compiles search results and may request additional searches
   */
  private async aiCompileSearchResults(
    category: string,
    language: string,
    searchResults: BraveSearchResult[],
    year: number
  ): Promise<{
    recommendation: ToolResearchResult | null;
    needsMoreSearch: boolean;
    additionalQueries?: string[];
  }> {
    const searchContext = searchResults.length > 0
      ? searchResults.map(r => `- ${r.title}: ${r.description} (${r.url})`).join('\n')
      : '(No search results - use your training knowledge of current tools)';

    const prompt = this.buildAICompilationPrompt(category, language, searchContext, year);

    try {
      const response = await this.aiService.call(
        {
          id: 'google/gemini-2.0-flash-001',
          model: 'gemini-2.0-flash-001',
          provider: 'google',
        },
        {
          systemPrompt: `You are a software tools researcher. Analyze search results to find the BEST ${category} analysis tool for ${language} programming. You can request additional searches if the current results are insufficient.`,
          prompt,
          temperature: 0.1,
          maxTokens: 2000,
        }
      );

      return this.parseAICompilationResponse(response.content, searchResults);
    } catch (error) {
      console.error('         ❌ AI compilation error:', error);
      return { recommendation: null, needsMoreSearch: false };
    }
  }

  /**
   * Build prompt for AI to compile search results
   */
  private buildAICompilationPrompt(
    category: string,
    language: string,
    searchContext: string,
    year: number
  ): string {
    return `
Analyze the following search results to find the BEST ${category} analysis tool for ${language} programming as of ${year}.

**SEARCH RESULTS:**
${searchContext}

**KNOWN TOOLS FOR ${category.toUpperCase()}/${language.toUpperCase()}:**
${this.getCategoryExamples(category, language)}

**YOUR TASK:**
1. If search results are sufficient, identify the BEST tool
2. If search results are insufficient, you can request additional searches
3. Consider: industry adoption, active maintenance, rule coverage, integration support

**RESPOND WITH JSON (no markdown):**

If you have enough information:
{
  "needsMoreSearch": false,
  "recommendation": {
    "toolId": "tool-name-lowercase",
    "toolName": "Tool Name",
    "version": "latest version",
    "registry": "npm|pypi|maven|github",
    "packageName": "exact package name",
    "documentationUrl": "https://...",
    "installCommand": "npm install X / pip install X / etc",
    "confidence": 85,
    "reasoning": "Why this is the best tool"
  }
}

If you need more searches:
{
  "needsMoreSearch": true,
  "additionalQueries": ["query 1", "query 2"],
  "partialReasoning": "What information is missing"
}

If no good tool exists:
{
  "needsMoreSearch": false,
  "recommendation": null
}
`;
  }

  /**
   * Parse AI compilation response
   */
  private parseAICompilationResponse(
    content: string,
    searchResults: BraveSearchResult[]
  ): {
    recommendation: ToolResearchResult | null;
    needsMoreSearch: boolean;
    additionalQueries?: string[];
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { recommendation: null, needsMoreSearch: false };
      }

      const result = JSON.parse(jsonMatch[0]);

      if (result.needsMoreSearch && result.additionalQueries) {
        return {
          recommendation: null,
          needsMoreSearch: true,
          additionalQueries: result.additionalQueries,
        };
      }

      if (result.recommendation) {
        return {
          recommendation: {
            ...result.recommendation,
            webSearchSources: searchResults.map(r => r.url).slice(0, 5),
            registryValidated: false, // Will be validated in next step
          },
          needsMoreSearch: false,
        };
      }

      return { recommendation: null, needsMoreSearch: false };
    } catch (error) {
      console.error('         ❌ Failed to parse AI response:', error);
      return { recommendation: null, needsMoreSearch: false };
    }
  }

  /**
   * Validate tool exists on its registry and get exact version info
   */
  private async validateOnRegistry(tool: ToolResearchResult): Promise<ToolResearchResult> {
    try {
      switch (tool.registry) {
        case 'npm':
          return await this.validateNpmPackage(tool);
        case 'pypi':
          return await this.validatePyPIPackage(tool);
        case 'maven':
          return await this.validateMavenPackage(tool);
        case 'github':
          return await this.validateGitHubRelease(tool);
        default:
          return tool;
      }
    } catch (error) {
      console.log(`         ⚠️ Registry validation failed, using unvalidated info`);
      return tool;
    }
  }

  /**
   * Validate npm package
   */
  private async validateNpmPackage(tool: ToolResearchResult): Promise<ToolResearchResult> {
    const response = await axios.get(`https://registry.npmjs.org/${tool.packageName}`);
    const latest = response.data['dist-tags'].latest;

    return {
      ...tool,
      version: latest,
      installCommand: `npm install ${tool.packageName}`,
      documentationUrl: `https://www.npmjs.com/package/${tool.packageName}`,
      registryValidated: true,
    };
  }

  /**
   * Validate PyPI package
   */
  private async validatePyPIPackage(tool: ToolResearchResult): Promise<ToolResearchResult> {
    const response = await axios.get(`https://pypi.org/pypi/${tool.packageName}/json`);
    const latest = response.data.info.version;

    return {
      ...tool,
      version: latest,
      installCommand: `pip install ${tool.packageName}`,
      documentationUrl: `https://pypi.org/project/${tool.packageName}`,
      registryValidated: true,
    };
  }

  /**
   * Validate Maven package
   */
  private async validateMavenPackage(tool: ToolResearchResult): Promise<ToolResearchResult> {
    const parts = tool.packageName.split(':');
    if (parts.length !== 2) {
      return tool;
    }

    const [groupId, artifactId] = parts;
    const searchUrl = `https://search.maven.org/solrsearch/select?q=g:${groupId}+AND+a:${artifactId}&rows=1&wt=json`;
    const response = await axios.get(searchUrl);

    const doc = response.data.response.docs[0];
    if (!doc) {
      return tool;
    }

    return {
      ...tool,
      version: doc.latestVersion,
      documentationUrl: `https://mvnrepository.com/artifact/${groupId}/${artifactId}`,
      registryValidated: true,
    };
  }

  /**
   * Validate GitHub release
   */
  private async validateGitHubRelease(tool: ToolResearchResult): Promise<ToolResearchResult> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const repo = tool.packageName.includes('/') ? tool.packageName : `${tool.toolId}/${tool.toolId}`;

    const response = await axios.get(
      `https://api.github.com/repos/${repo}/releases/latest`,
      { headers }
    );

    const latest = response.data.tag_name.replace(/^v/, '');

    return {
      ...tool,
      version: latest,
      documentationUrl: response.data.html_url,
      registryValidated: true,
    };
  }

  /**
   * Fetch all rules with their tool information from Supabase
   */
  private async fetchAllRules(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('rules')
      .select(`
        id,
        rule_id,
        issue_type,
        tool_id,
        tools!inner(
          id,
          name,
          version,
          tool_languages(language)
        )
      `);

    if (error) {
      console.error('Error fetching rules:', error);
      return [];
    }

    return (data || []).map((rule: any) => ({
      ...rule,
      language: rule.tools?.tool_languages?.[0]?.language || 'unknown',
      toolName: rule.tools?.name,
      toolVersion: rule.tools?.version,
    }));
  }

  /**
   * Get example tools for a category to help guide the search
   */
  private getCategoryExamples(category: string, language: string): string {
    const examples: Record<string, Record<string, string>> = {
      security: {
        typescript: 'eslint-plugin-security, snyk, npm audit, semgrep',
        javascript: 'eslint-plugin-security, snyk, npm audit, semgrep',
        python: 'bandit, safety, semgrep, snyk',
        java: 'spotbugs security plugin, find-sec-bugs, semgrep',
        go: 'gosec, staticcheck, semgrep',
        rust: 'cargo-audit, cargo-deny',
      },
      quality: {
        typescript: 'eslint, biome, typescript-eslint',
        javascript: 'eslint, biome, jshint',
        python: 'ruff, pylint, flake8',
        java: 'pmd, checkstyle, spotbugs',
        go: 'golangci-lint, staticcheck',
        rust: 'clippy, rust-analyzer',
      },
      style: {
        typescript: 'prettier, eslint, biome',
        javascript: 'prettier, eslint, biome',
        python: 'black, isort, autopep8',
        java: 'google-java-format, checkstyle',
        go: 'gofmt, goimports',
        rust: 'rustfmt',
      },
      performance: {
        typescript: 'eslint-plugin-perf, biome',
        javascript: 'eslint-plugin-perf',
        python: 'perflint, pylint performance checks',
        java: 'spotbugs performance detectors, pmd performance rules',
        go: 'golangci-lint performance linters',
        rust: 'clippy performance lints',
      },
      dependency: {
        typescript: 'npm audit, snyk, depcheck',
        javascript: 'npm audit, snyk, depcheck',
        python: 'safety, pip-audit, pipdeptree',
        java: 'owasp dependency-check, snyk',
        go: 'nancy, govulncheck',
        rust: 'cargo-audit, cargo-deny',
      },
      'type-safety': {
        typescript: 'typescript strict mode, eslint-plugin-typescript',
        javascript: 'typescript (for type checking), flow',
        python: 'mypy, pyright, pyre',
        java: 'native (strongly typed), nullaway',
        go: 'native (strongly typed), staticcheck',
        rust: 'native (strongly typed), clippy',
      },
      secrets: {
        typescript: 'gitleaks, trufflehog, detect-secrets',
        javascript: 'gitleaks, trufflehog, detect-secrets',
        python: 'gitleaks, trufflehog, detect-secrets',
        java: 'gitleaks, trufflehog, detect-secrets',
        go: 'gitleaks, trufflehog',
        rust: 'gitleaks, trufflehog',
      },
    };

    return examples[category]?.[language] || 'general purpose linters and analyzers';
  }

  /**
   * Compare current tool with best tool and decide action
   */
  private async compareAndDecide(
    rule: any,
    bestTool: ToolResearchResult
  ): Promise<RuleToolMapping> {
    const currentToolId = rule.tool_id?.toLowerCase() || '';
    const bestToolId = bestTool.toolId.toLowerCase();

    if (currentToolId === bestToolId || currentToolId.includes(bestToolId) || bestToolId.includes(currentToolId)) {
      const currentVersion = rule.toolVersion || 'unknown';
      const bestVersion = bestTool.version;

      if (currentVersion === bestVersion || currentVersion === 'unknown') {
        return {
          ruleId: rule.rule_id,
          ruleName: rule.rule_id,
          language: rule.language,
          category: rule.issue_type,
          currentTool: rule.tool_id,
          currentVersion,
          bestTool: bestTool.toolId,
          bestToolVersion: bestVersion,
          action: 'keep',
          reason: 'Already using the best tool with current version',
        };
      } else {
        return {
          ruleId: rule.rule_id,
          ruleName: rule.rule_id,
          language: rule.language,
          category: rule.issue_type,
          currentTool: rule.tool_id,
          currentVersion,
          bestTool: bestTool.toolId,
          bestToolVersion: bestVersion,
          action: 'update_version',
          reason: `New version available: ${currentVersion} → ${bestVersion}`,
        };
      }
    }

    return {
      ruleId: rule.rule_id,
      ruleName: rule.rule_id,
      language: rule.language,
      category: rule.issue_type,
      currentTool: rule.tool_id,
      currentVersion: rule.toolVersion || 'unknown',
      bestTool: bestTool.toolId,
      bestToolVersion: bestTool.version,
      action: 'replace',
      reason: `Better tool found: ${bestTool.toolName} (confidence: ${bestTool.confidence}%)`,
    };
  }

  /**
   * Store tool recommendations in Supabase for later manual installation
   */
  private async storeToolRecommendations(changes: RuleToolMapping[]): Promise<void> {
    for (const change of changes) {
      if (change.action === 'update_version') {
        const { error } = await this.supabase
          .from('tool_versions')
          .upsert({
            tool_id: change.currentTool,
            current_version: change.currentVersion,
            latest_version: change.bestToolVersion,
            needs_update: true,
            research_date: new Date().toISOString(),
            next_research_date: new Date(Date.now() + this.RESEARCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'tool_id' });

        if (error) {
          console.log(`      ❌ Failed to update ${change.currentTool}: ${error.message}`);
        } else {
          console.log(`      ✅ Version update recorded: ${change.currentTool} → v${change.bestToolVersion}`);
        }
      } else if (change.action === 'replace') {
        console.log(`      ⚠️ RECOMMEND REPLACE: ${change.currentTool} → ${change.bestTool}`);
        console.log(`         Reason: ${change.reason}`);
        console.log(`         NOTE: Manual installation required on Cloud instances`);

        const { error } = await this.supabase
          .from('tool_versions')
          .upsert({
            tool_id: change.bestTool,
            name: change.bestTool,
            registry: 'github',
            package_name: change.bestTool,
            current_version: change.currentTool,
            latest_version: change.bestToolVersion,
            needs_update: true,
            research_date: new Date().toISOString(),
            next_research_date: new Date(Date.now() + this.RESEARCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'tool_id' });

        if (error) {
          console.warn(`      ⚠️ Could not store recommendation for ${change.bestTool}`);
        }
      }
    }
  }

  /**
   * Print research report
   */
  private printReport(report: ResearchReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RULE-BASED TOOL RESEARCH REPORT');
    console.log('='.repeat(80));
    console.log(`   Date: ${report.timestamp.toISOString()}`);
    console.log(`   Rules processed: ${report.rulesProcessed}`);
    console.log(`   Tools kept (no change): ${report.toolsKept}`);
    console.log(`   Tools updated (new version): ${report.toolsUpdated}`);
    console.log(`   Tools to replace: ${report.toolsReplaced}`);

    if (report.changes.length > 0) {
      console.log('\n📝 Changes (require manual installation on Cloud):');
      for (const change of report.changes) {
        const icon = change.action === 'update_version' ? '🔄' : '🔁';
        console.log(`   ${icon} ${change.ruleId}: ${change.currentTool} → ${change.bestTool} (${change.action})`);
      }
    }

    console.log('\n⚠️ IMPORTANT: Tool changes require manual installation on Cloud instances');
    console.log('   Run the maintenance script to apply tool updates.\n');
    console.log('✅ Rule-based tool research complete!');
  }
}

/**
 * Standalone function to run rule-based tool research
 */
export async function runRuleBasedToolResearch(): Promise<ResearchReport> {
  const researcher = new RuleBasedToolResearcherService();
  return await researcher.conductResearch();
}

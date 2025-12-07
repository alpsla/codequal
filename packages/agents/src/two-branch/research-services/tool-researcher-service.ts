/**
 * Tool Researcher Service
 *
 * Responsibilities:
 * 1. Fetch latest tool versions from package registries (npm, PyPI, Maven, GitHub)
 * 2. Store tool configurations in Supabase
 * 3. Provide cached tool version info for the Three-Tier Fix System
 * 4. Runs quarterly alongside model research
 *
 * This complements the ModelResearcherService - that handles AI models,
 * this handles analysis/fixer tool versions.
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// ================================================================================
// TYPES
// ================================================================================

export interface ToolVersion {
  id: string;
  tool_id: string;
  name: string;
  registry: 'npm' | 'pypi' | 'maven' | 'github';
  package_name: string;
  current_version: string;
  latest_version: string;
  release_date: Date;
  changelog_url?: string;
  needs_update: boolean;
  research_date: Date;
  next_research_date: Date;
}

export interface ToolRegistry {
  type: 'npm' | 'pypi' | 'maven' | 'github';
  tools: {
    id: string;
    package: string;
    groupId?: string;  // Maven only
    artifactId?: string;  // Maven only
    repo?: string;  // GitHub only
  }[];
}

export interface VersionInfo {
  current: string;
  latest: string;
  releaseDate: Date;
  changelog?: string;
}

// ================================================================================
// TOOL DEFINITIONS BY REGISTRY
// ================================================================================

const NPM_TOOLS: ToolRegistry = {
  type: 'npm',
  tools: [
    { id: 'eslint', package: 'eslint' },
    { id: 'prettier', package: 'prettier' },
    { id: 'typescript', package: 'typescript' },
    { id: 'biome', package: '@biomejs/biome' },
    { id: 'typescript-eslint', package: '@typescript-eslint/eslint-plugin' },
  ]
};

const PYPI_TOOLS: ToolRegistry = {
  type: 'pypi',
  tools: [
    { id: 'ruff', package: 'ruff' },
    { id: 'black', package: 'black' },
    { id: 'bandit', package: 'bandit' },
    { id: 'pylint', package: 'pylint' },
    { id: 'mypy', package: 'mypy' },
    { id: 'autoflake', package: 'autoflake' },
    { id: 'isort', package: 'isort' },
    { id: 'pyupgrade', package: 'pyupgrade' },
    { id: 'safety', package: 'safety' },
  ]
};

const MAVEN_TOOLS: ToolRegistry = {
  type: 'maven',
  tools: [
    { id: 'pmd', package: 'pmd', groupId: 'net.sourceforge.pmd', artifactId: 'pmd-core' },
    { id: 'checkstyle', package: 'checkstyle', groupId: 'com.puppycrawl.tools', artifactId: 'checkstyle' },
    { id: 'spotbugs', package: 'spotbugs', groupId: 'com.github.spotbugs', artifactId: 'spotbugs' },
    { id: 'sorald', package: 'sorald', groupId: 'se.kth.castor', artifactId: 'sorald' },
  ]
};

const GITHUB_TOOLS: ToolRegistry = {
  type: 'github',
  tools: [
    { id: 'golangci-lint', package: 'golangci-lint', repo: 'golangci/golangci-lint' },
    { id: 'clippy', package: 'clippy', repo: 'rust-lang/rust-clippy' },
    { id: 'rubocop', package: 'rubocop', repo: 'rubocop/rubocop' },
    { id: 'semgrep', package: 'semgrep', repo: 'semgrep/semgrep' },
    { id: 'gitleaks', package: 'gitleaks', repo: 'gitleaks/gitleaks' },
    { id: 'trivy', package: 'trivy', repo: 'aquasecurity/trivy' },
    { id: 'detekt', package: 'detekt', repo: 'detekt/detekt' },
    { id: 'ktlint', package: 'ktlint', repo: 'pinterest/ktlint' },
    { id: 'swiftlint', package: 'swiftlint', repo: 'realm/SwiftLint' },
  ]
};

// ================================================================================
// SERVICE CLASS
// ================================================================================

export class ToolResearcherService {
  private supabase: any;
  private readonly RESEARCH_INTERVAL_DAYS = 90; // Quarterly

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Conduct quarterly research on all tool versions
   * Should be scheduled to run every 90 days alongside model research
   */
  async conductQuarterlyResearch(): Promise<{
    toolsChecked: number;
    needsUpdate: number;
    errors: string[];
  }> {
    console.log('🔧 Starting quarterly tool version research...');

    const errors: string[] = [];
    const results: ToolVersion[] = [];

    // Research all registries in parallel
    const registries = [NPM_TOOLS, PYPI_TOOLS, MAVEN_TOOLS, GITHUB_TOOLS];

    for (const registry of registries) {
      console.log(`\n📦 Checking ${registry.type.toUpperCase()} tools...`);

      for (const tool of registry.tools) {
        try {
          const versionInfo = await this.fetchVersionInfo(registry.type, tool);

          const toolVersion: ToolVersion = {
            id: `tool_${tool.id}_${Date.now()}`,
            tool_id: tool.id,
            name: tool.package,
            registry: registry.type,
            package_name: tool.package,
            current_version: versionInfo.current,
            latest_version: versionInfo.latest,
            release_date: versionInfo.releaseDate,
            changelog_url: versionInfo.changelog,
            needs_update: versionInfo.current !== versionInfo.latest,
            research_date: new Date(),
            next_research_date: new Date(Date.now() + (this.RESEARCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000)),
          };

          results.push(toolVersion);

          const status = toolVersion.needs_update ? '⬆️ UPDATE' : '✅ CURRENT';
          console.log(`   ${status} ${tool.id}: ${versionInfo.current} → ${versionInfo.latest}`);

        } catch (error) {
          const errorMsg = `Failed to check ${tool.id}: ${error}`;
          errors.push(errorMsg);
          console.error(`   ❌ ${tool.id}: ${error}`);
        }
      }
    }

    // Store results in Supabase
    console.log('\n💾 Storing tool research results...');
    await this.storeToolResearch(results);

    const needsUpdate = results.filter(r => r.needs_update).length;

    console.log(`\n✅ Tool research complete:`);
    console.log(`   Checked: ${results.length} tools`);
    console.log(`   Need update: ${needsUpdate} tools`);
    console.log(`   Errors: ${errors.length}`);

    return {
      toolsChecked: results.length,
      needsUpdate,
      errors,
    };
  }

  /**
   * Fetch version info from the appropriate registry
   */
  private async fetchVersionInfo(
    registry: 'npm' | 'pypi' | 'maven' | 'github',
    tool: { id: string; package: string; groupId?: string; artifactId?: string; repo?: string }
  ): Promise<VersionInfo> {
    switch (registry) {
      case 'npm':
        return this.fetchNpmVersion(tool.package);
      case 'pypi':
        return this.fetchPyPIVersion(tool.package);
      case 'maven':
        return this.fetchMavenVersion(tool.groupId!, tool.artifactId!);
      case 'github':
        return this.fetchGitHubVersion(tool.repo!);
      default:
        throw new Error(`Unknown registry: ${registry}`);
    }
  }

  /**
   * Fetch latest version from npm registry
   */
  private async fetchNpmVersion(packageName: string): Promise<VersionInfo> {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
    const data = response.data;

    const latest = data['dist-tags'].latest;
    const releaseDate = new Date(data.time[latest]);

    // Get currently configured version from Supabase (if any)
    const { data: existing } = await this.supabase
      .from('tool_versions')
      .select('current_version')
      .eq('tool_id', packageName.replace('@', '').replace('/', '-'))
      .maybeSingle();

    return {
      current: existing?.current_version || latest,
      latest,
      releaseDate,
      changelog: `https://www.npmjs.com/package/${packageName}?activeTab=versions`,
    };
  }

  /**
   * Fetch latest version from PyPI
   */
  private async fetchPyPIVersion(packageName: string): Promise<VersionInfo> {
    const response = await axios.get(`https://pypi.org/pypi/${packageName}/json`);
    const data = response.data;

    const latest = data.info.version;
    const releaseDate = new Date(data.releases[latest]?.[0]?.upload_time || Date.now());

    const { data: existing } = await this.supabase
      .from('tool_versions')
      .select('current_version')
      .eq('tool_id', packageName)
      .maybeSingle();

    return {
      current: existing?.current_version || latest,
      latest,
      releaseDate,
      changelog: `https://pypi.org/project/${packageName}/#history`,
    };
  }

  /**
   * Fetch latest version from Maven Central
   */
  private async fetchMavenVersion(groupId: string, artifactId: string): Promise<VersionInfo> {
    const searchUrl = `https://search.maven.org/solrsearch/select?q=g:${groupId}+AND+a:${artifactId}&rows=1&wt=json`;
    const response = await axios.get(searchUrl);

    const doc = response.data.response.docs[0];
    if (!doc) {
      throw new Error(`Maven artifact not found: ${groupId}:${artifactId}`);
    }

    const latest = doc.latestVersion;
    const releaseDate = new Date(doc.timestamp);

    const toolId = `${groupId.split('.').pop()}-${artifactId}`;
    const { data: existing } = await this.supabase
      .from('tool_versions')
      .select('current_version')
      .eq('tool_id', toolId)
      .maybeSingle();

    return {
      current: existing?.current_version || latest,
      latest,
      releaseDate,
      changelog: `https://mvnrepository.com/artifact/${groupId}/${artifactId}`,
    };
  }

  /**
   * Fetch latest version from GitHub releases
   */
  private async fetchGitHubVersion(repo: string): Promise<VersionInfo> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    // Use GitHub token if available
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await axios.get(
      `https://api.github.com/repos/${repo}/releases/latest`,
      { headers }
    );

    const data = response.data;
    const latest = data.tag_name.replace(/^v/, '');  // Strip leading 'v'
    const releaseDate = new Date(data.published_at);

    const toolId = repo.split('/')[1];
    const { data: existing } = await this.supabase
      .from('tool_versions')
      .select('current_version')
      .eq('tool_id', toolId)
      .maybeSingle();

    return {
      current: existing?.current_version || latest,
      latest,
      releaseDate,
      changelog: data.html_url,
    };
  }

  /**
   * Store tool research results in Supabase
   */
  private async storeToolResearch(results: ToolVersion[]): Promise<void> {
    try {
      // Upsert each tool version
      for (const result of results) {
        const { error } = await this.supabase
          .from('tool_versions')
          .upsert({
            tool_id: result.tool_id,
            name: result.name,
            registry: result.registry,
            package_name: result.package_name,
            current_version: result.latest_version,  // Update current to latest
            latest_version: result.latest_version,
            release_date: result.release_date.toISOString(),
            changelog_url: result.changelog_url,
            needs_update: false,  // Reset after update
            research_date: result.research_date.toISOString(),
            next_research_date: result.next_research_date.toISOString(),
          }, { onConflict: 'tool_id' });

        if (error) {
          console.warn(`⚠️ Could not store ${result.tool_id}: ${error.message}`);
        }
      }

      // Update metadata
      await this.updateToolResearchMetadata(results.length);

    } catch (error) {
      console.error('Error storing tool research:', error);
    }
  }

  /**
   * Update tool research metadata
   */
  private async updateToolResearchMetadata(toolCount: number): Promise<void> {
    try {
      await this.supabase
        .from('tool_research_metadata')
        .upsert({
          id: 'singleton',
          last_research_date: new Date().toISOString(),
          next_scheduled_research: new Date(Date.now() + (this.RESEARCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000)).toISOString(),
          total_tools_researched: toolCount,
          research_version: '1.0.0',
        });
    } catch (error) {
      console.warn('⚠️ Could not update tool research metadata');
    }
  }

  /**
   * Get current tool version from cache
   */
  async getToolVersion(toolId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('tool_versions')
      .select('current_version')
      .eq('tool_id', toolId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.current_version;
  }

  /**
   * Get all tools that need updates
   */
  async getToolsNeedingUpdate(): Promise<ToolVersion[]> {
    const { data, error } = await this.supabase
      .from('tool_versions')
      .select('*')
      .eq('needs_update', true);

    if (error) {
      console.error('Error fetching tools needing update:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if tool research is fresh
   */
  async isResearchFresh(): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('tool_research_metadata')
      .select('last_research_date')
      .maybeSingle();

    if (error || !data) return false;

    const lastResearch = new Date(data.last_research_date);
    const daysSince = (Date.now() - lastResearch.getTime()) / (1000 * 60 * 60 * 24);

    return daysSince < this.RESEARCH_INTERVAL_DAYS;
  }
}

/**
 * Standalone function to run tool research
 */
export async function runToolResearch(): Promise<void> {
  const service = new ToolResearcherService();
  await service.conductQuarterlyResearch();
}

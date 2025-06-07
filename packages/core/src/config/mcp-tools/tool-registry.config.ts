/**
 * MCP Tool Registry Configuration
 * Defines all available MCP tools and their configurations
 */

export interface MCPToolDefinition {
  id: string;
  name: string;
  description: string;
  type: 'mcp' | 'direct';
  
  // Execution configuration
  execution: {
    mode: 'persistent' | 'on-demand';
    command?: string;
    serverPort?: number;
    dockerImage?: string;
    requiresAuth?: boolean;
  };
  
  // Capabilities
  capabilities: ToolCapability[];
  
  // Requirements
  requirements: {
    languages?: string[];
    frameworks?: string[];
    fileTypes?: string[];
    minFiles?: number;
    maxFiles?: number;
    requiredFiles?: string[];
  };
  
  // Resource limits
  resources: {
    maxMemory?: number;         // MB
    maxCpu?: number;           // percentage (0-100)
    maxDiskSpace?: number;     // MB
    defaultTimeout: number;    // ms
    maxTimeout?: number;       // ms
  };
  
  // Priority and importance
  priority: 'critical' | 'high' | 'medium' | 'low';
  agentRoles: string[];       // Which agent roles use this tool
}

export interface ToolCapability {
  name: string;
  category: 'security' | 'quality' | 'performance' | 'architecture' | 'documentation';
  description?: string;
}

/**
 * Core MCP tools registry
 */
export const MCP_TOOLS_REGISTRY: Record<string, MCPToolDefinition> = {
  'mcp-scan': {
    id: 'mcp-scan',
    name: 'MCP Security Scanner',
    description: 'Security scanner for MCP tools and dependencies',
    type: 'mcp',
    execution: {
      mode: 'on-demand',
      command: 'npx mcp-scan@latest'
    },
    capabilities: [
      { name: 'security-scanning', category: 'security' },
      { name: 'tool-verification', category: 'security' },
      { name: 'vulnerability-detection', category: 'security' }
    ],
    requirements: {
      languages: ['*'] // All languages
    },
    resources: {
      maxMemory: 512,
      maxCpu: 50,
      defaultTimeout: 30000,
      maxTimeout: 60000
    },
    priority: 'critical',
    agentRoles: ['security']
  },
  
  'eslint-mcp': {
    id: 'eslint-mcp',
    name: 'ESLint MCP',
    description: 'JavaScript/TypeScript linting via MCP',
    type: 'mcp',
    execution: {
      mode: 'persistent',
      command: 'npx @eslint/mcp@latest',
      serverPort: 3001
    },
    capabilities: [
      { name: 'linting', category: 'quality' },
      { name: 'code-style', category: 'quality' },
      { name: 'error-detection', category: 'quality' }
    ],
    requirements: {
      languages: ['javascript', 'typescript'],
      frameworks: ['react', 'vue', 'angular', 'node', 'express', 'next'],
      fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
    },
    resources: {
      maxMemory: 1024,
      maxCpu: 70,
      defaultTimeout: 30000,
      maxTimeout: 120000
    },
    priority: 'high',
    agentRoles: ['codeQuality']
  },
  
  'sonarqube': {
    id: 'sonarqube',
    name: 'SonarQube Scanner',
    description: 'Multi-language code quality and security analysis',
    type: 'direct',
    execution: {
      mode: 'persistent',
      requiresAuth: true
    },
    capabilities: [
      { name: 'code-quality', category: 'quality' },
      { name: 'security-analysis', category: 'security' },
      { name: 'coverage-analysis', category: 'quality' },
      { name: 'technical-debt', category: 'quality' }
    ],
    requirements: {
      languages: ['*'] // 30+ languages supported
    },
    resources: {
      maxMemory: 2048,
      maxCpu: 80,
      defaultTimeout: 120000,
      maxTimeout: 300000
    },
    priority: 'high',
    agentRoles: ['codeQuality', 'security', 'reporting']
  },
  
  'semgrep-mcp': {
    id: 'semgrep-mcp',
    name: 'Semgrep MCP',
    description: 'Static application security testing',
    type: 'mcp',
    execution: {
      mode: 'persistent',
      command: 'semgrep --config=auto',
      serverPort: 3002
    },
    capabilities: [
      { name: 'sast', category: 'security' },
      { name: 'vulnerability-scanning', category: 'security' },
      { name: 'compliance-checking', category: 'security' }
    ],
    requirements: {
      languages: ['*']
    },
    resources: {
      maxMemory: 1536,
      maxCpu: 70,
      defaultTimeout: 90000,
      maxTimeout: 180000
    },
    priority: 'critical',
    agentRoles: ['security']
  },
  
  'git-mcp': {
    id: 'git-mcp',
    name: 'Git MCP Server',
    description: 'Git repository analysis and history',
    type: 'mcp',
    execution: {
      mode: 'on-demand',
      command: 'uvx mcp-server-git'
    },
    capabilities: [
      { name: 'version-control', category: 'architecture' },
      { name: 'history-analysis', category: 'architecture' },
      { name: 'blame-analysis', category: 'quality' }
    ],
    requirements: {
      languages: ['*'],
      requiredFiles: ['.git']
    },
    resources: {
      maxMemory: 512,
      maxCpu: 40,
      defaultTimeout: 30000,
      maxTimeout: 60000
    },
    priority: 'medium',
    agentRoles: ['architecture', 'educational']
  },
  
  'mcp-docs-service': {
    id: 'mcp-docs-service',
    name: 'Documentation Service',
    description: 'Documentation analysis and quality metrics',
    type: 'mcp',
    execution: {
      mode: 'on-demand',
      command: 'npm run mcp-docs-service'
    },
    capabilities: [
      { name: 'documentation-analysis', category: 'documentation' },
      { name: 'quality-metrics', category: 'documentation' },
      { name: 'coverage-analysis', category: 'documentation' }
    ],
    requirements: {
      fileTypes: ['.md', '.rst', '.txt', 'README*', 'CONTRIBUTING*', 'CHANGELOG*']
    },
    resources: {
      maxMemory: 768,
      maxCpu: 50,
      defaultTimeout: 45000,
      maxTimeout: 90000
    },
    priority: 'medium',
    agentRoles: ['educational', 'reporting']
  },
  
  'dependency-mcp': {
    id: 'dependency-mcp',
    name: 'Dependency Analyzer',
    description: 'Multi-language dependency analysis',
    type: 'mcp',
    execution: {
      mode: 'on-demand',
      command: 'npx dependency-mcp'
    },
    capabilities: [
      { name: 'dependency-analysis', category: 'architecture' },
      { name: 'vulnerability-check', category: 'security' },
      { name: 'version-mismatch', category: 'quality' }
    ],
    requirements: {
      languages: ['javascript', 'typescript', 'python', 'csharp', 'java'],
      fileTypes: ['package.json', 'requirements.txt', 'pom.xml', '*.csproj']
    },
    resources: {
      maxMemory: 1024,
      maxCpu: 60,
      defaultTimeout: 60000,
      maxTimeout: 120000
    },
    priority: 'high',
    agentRoles: ['dependency']
  },
  
  'perf-analyzer': {
    id: 'perf-analyzer',
    name: 'Performance Analyzer',
    description: 'Performance analysis and profiling',
    type: 'direct',
    execution: {
      mode: 'on-demand'
    },
    capabilities: [
      { name: 'performance-regression', category: 'performance' },
      { name: 'complexity-analysis', category: 'performance' },
      { name: 'memory-analysis', category: 'performance' }
    ],
    requirements: {
      languages: ['javascript', 'typescript', 'python', 'java', 'go']
    },
    resources: {
      maxMemory: 2048,
      maxCpu: 90,
      defaultTimeout: 120000,
      maxTimeout: 300000
    },
    priority: 'medium',
    agentRoles: ['performance']
  },
  
  'structure-analyzer': {
    id: 'structure-analyzer',
    name: 'Code Structure Analyzer',
    description: 'Architecture and code structure analysis',
    type: 'direct',
    execution: {
      mode: 'on-demand'
    },
    capabilities: [
      { name: 'coupling-analysis', category: 'architecture' },
      { name: 'layer-violations', category: 'architecture' },
      { name: 'pattern-detection', category: 'architecture' }
    ],
    requirements: {
      languages: ['*'],
      minFiles: 5
    },
    resources: {
      maxMemory: 1024,
      maxCpu: 60,
      defaultTimeout: 60000,
      maxTimeout: 120000
    },
    priority: 'medium',
    agentRoles: ['architecture']
  }
};

/**
 * Get tools for a specific agent role
 */
export function getToolsForRole(role: string): MCPToolDefinition[] {
  return Object.values(MCP_TOOLS_REGISTRY).filter(
    tool => tool.agentRoles.includes(role)
  );
}

/**
 * Get tools that support a specific language
 */
export function getToolsForLanguage(language: string): MCPToolDefinition[] {
  return Object.values(MCP_TOOLS_REGISTRY).filter(
    tool => 
      tool.requirements.languages?.includes('*') ||
      tool.requirements.languages?.includes(language)
  );
}

/**
 * Get critical tools that should always be available
 */
export function getCriticalTools(): MCPToolDefinition[] {
  return Object.values(MCP_TOOLS_REGISTRY).filter(
    tool => tool.priority === 'critical'
  );
}

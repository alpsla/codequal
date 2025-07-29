/**
 * Tavily Role-Specific Query Generator
 * Generates different searches for each agent role
 * Ensures diverse, role-appropriate content
 */

import { AgentRole, AnalysisContext, FileData } from '../core/interfaces';
import { logging } from '@codequal/core';

export interface RoleQuery {
  query: string;
  intent: string;
  expectedType: 'vulnerability' | 'best-practice' | 'documentation' | 'tutorial' | 'performance' | 'architecture';
  priority: 'high' | 'medium' | 'low';
}

export class TavilyRoleQueryGenerator {
  private logger = logging.createLogger('TavilyRoleQueryGenerator');
  
  /**
   * Generate role-specific queries based on PR context
   */
  generateQueriesForRole(
    role: AgentRole,
    context: AnalysisContext
  ): RoleQuery[] {
    const files = context.pr.files;
    const technologies = this.extractTechnologies(files);
    const patterns = this.extractPatterns(files);
    
    switch (role) {
      case 'security':
        return this.generateSecurityQueries(technologies, patterns, context);
      
      case 'codeQuality':
        return this.generateCodeQualityQueries(technologies, patterns, context);
      
      case 'dependency':
        return this.generateDependencyQueries(technologies, context);
      
      case 'performance':
        return this.generatePerformanceQueries(technologies, patterns, context);
      
      case 'architecture':
        return this.generateArchitectureQueries(technologies, patterns, context);
      
      case 'educational':
        return this.generateEducationalQueries(technologies, patterns, context);
      
      case 'reporting':
        return this.generateReportingQueries(technologies, context);
      
      default:
        return [];
    }
  }
  
  /**
   * Security-specific queries
   */
  private generateSecurityQueries(
    technologies: Set<string>,
    patterns: Set<string>,
    context: AnalysisContext
  ): RoleQuery[] {
    const queries: RoleQuery[] = [];
    
    // CVE searches for detected technologies
    technologies.forEach(tech => {
      queries.push({
        query: `${tech} CVE vulnerabilities 2024 2025`,
        intent: `Find recent security vulnerabilities for ${tech}`,
        expectedType: 'vulnerability',
        priority: 'high'
      });
    });
    
    // Authentication-specific searches
    if (patterns.has('authentication') || patterns.has('oauth')) {
      queries.push({
        query: 'OAuth2 security best practices 2024 common vulnerabilities',
        intent: 'Find OAuth2 security guidelines',
        expectedType: 'vulnerability',
        priority: 'high'
      });
      
      queries.push({
        query: 'JWT token security vulnerabilities exploitation',
        intent: 'Find JWT security issues',
        expectedType: 'vulnerability',
        priority: 'high'
      });
    }
    
    // SQL injection if database patterns detected
    if (patterns.has('database') || patterns.has('sql')) {
      queries.push({
        query: 'SQL injection prevention techniques prepared statements',
        intent: 'Find SQL injection prevention methods',
        expectedType: 'best-practice',
        priority: 'high'
      });
    }
    
    // OWASP top 10 for web apps
    if (technologies.has('express') || technologies.has('react')) {
      queries.push({
        query: 'OWASP top 10 2024 web application security',
        intent: 'Find latest OWASP guidelines',
        expectedType: 'vulnerability',
        priority: 'medium'
      });
    }
    
    return queries;
  }
  
  /**
   * Code Quality queries
   */
  private generateCodeQualityQueries(
    technologies: Set<string>,
    patterns: Set<string>,
    context: AnalysisContext
  ): RoleQuery[] {
    const queries: RoleQuery[] = [];
    
    // Language-specific style guides
    context.repository.languages.forEach(lang => {
      queries.push({
        query: `${lang} code style guide best practices 2024`,
        intent: `Find ${lang} coding standards`,
        expectedType: 'best-practice',
        priority: 'medium'
      });
    });
    
    // Framework-specific patterns
    if (technologies.has('react')) {
      queries.push({
        query: 'React hooks best practices useEffect patterns',
        intent: 'Find React best practices',
        expectedType: 'best-practice',
        priority: 'medium'
      });
    }
    
    if (technologies.has('express')) {
      queries.push({
        query: 'Express.js middleware patterns error handling',
        intent: 'Find Express best practices',
        expectedType: 'best-practice',
        priority: 'medium'
      });
    }
    
    // Clean code principles
    queries.push({
      query: 'clean code principles refactoring patterns',
      intent: 'Find clean code guidelines',
      expectedType: 'best-practice',
      priority: 'low'
    });
    
    return queries;
  }
  
  /**
   * Dependency queries
   */
  private generateDependencyQueries(
    technologies: Set<string>,
    context: AnalysisContext
  ): RoleQuery[] {
    const queries: RoleQuery[] = [];
    
    // Check for deprecated packages
    technologies.forEach(tech => {
      queries.push({
        query: `${tech} deprecated packages alternatives 2024`,
        intent: `Find deprecated ${tech} packages`,
        expectedType: 'documentation',
        priority: 'high'
      });
    });
    
    // License compatibility
    queries.push({
      query: 'npm package license compatibility MIT Apache GPL',
      intent: 'Check license compatibility',
      expectedType: 'documentation',
      priority: 'medium'
    });
    
    // Supply chain security
    queries.push({
      query: 'npm supply chain attacks prevention 2024',
      intent: 'Find supply chain security info',
      expectedType: 'vulnerability',
      priority: 'high'
    });
    
    // Package alternatives for common deps
    if (technologies.has('lodash')) {
      queries.push({
        query: 'lodash alternatives native JavaScript ES6',
        intent: 'Find lodash alternatives',
        expectedType: 'documentation',
        priority: 'low'
      });
    }
    
    return queries;
  }
  
  /**
   * Performance queries
   */
  private generatePerformanceQueries(
    technologies: Set<string>,
    patterns: Set<string>,
    context: AnalysisContext
  ): RoleQuery[] {
    const queries: RoleQuery[] = [];
    
    // Frontend performance
    if (technologies.has('react')) {
      queries.push({
        query: 'React performance optimization techniques memo useMemo',
        intent: 'Find React performance tips',
        expectedType: 'performance',
        priority: 'medium'
      });
      
      queries.push({
        query: 'webpack bundle size optimization code splitting',
        intent: 'Find bundle optimization methods',
        expectedType: 'performance',
        priority: 'medium'
      });
    }
    
    // Backend performance
    if (technologies.has('express')) {
      queries.push({
        query: 'Node.js performance optimization clustering worker threads',
        intent: 'Find Node.js performance tips',
        expectedType: 'performance',
        priority: 'medium'
      });
    }
    
    // Database performance
    if (patterns.has('database')) {
      queries.push({
        query: 'database query optimization indexing strategies',
        intent: 'Find DB optimization techniques',
        expectedType: 'performance',
        priority: 'high'
      });
    }
    
    return queries;
  }
  
  /**
   * Architecture queries
   */
  private generateArchitectureQueries(
    technologies: Set<string>,
    patterns: Set<string>,
    context: AnalysisContext
  ): RoleQuery[] {
    const queries: RoleQuery[] = [];
    
    // Design patterns
    queries.push({
      query: `${context.repository.primaryLanguage} design patterns repository factory`,
      intent: 'Find relevant design patterns',
      expectedType: 'architecture',
      priority: 'medium'
    });
    
    // Microservices if detected
    if (patterns.has('microservice') || patterns.has('api')) {
      queries.push({
        query: 'microservices best practices API gateway patterns',
        intent: 'Find microservices patterns',
        expectedType: 'architecture',
        priority: 'high'
      });
    }
    
    // Scalability
    queries.push({
      query: 'horizontal scaling strategies load balancing patterns',
      intent: 'Find scaling strategies',
      expectedType: 'architecture',
      priority: 'medium'
    });
    
    return queries;
  }
  
  /**
   * Educational queries
   */
  private generateEducationalQueries(
    technologies: Set<string>,
    patterns: Set<string>,
    context: AnalysisContext
  ): RoleQuery[] {
    const queries: RoleQuery[] = [];
    
    // Technology tutorials
    technologies.forEach(tech => {
      queries.push({
        query: `${tech} tutorial beginners guide 2024`,
        intent: `Find ${tech} learning resources`,
        expectedType: 'tutorial',
        priority: 'medium'
      });
    });
    
    // Concept explanations
    patterns.forEach(pattern => {
      queries.push({
        query: `${pattern} explained simple terms examples`,
        intent: `Explain ${pattern} concept`,
        expectedType: 'tutorial',
        priority: 'low'
      });
    });
    
    // Best practices guides
    queries.push({
      query: `${context.repository.primaryLanguage} best practices guide 2024`,
      intent: 'Find comprehensive best practices',
      expectedType: 'tutorial',
      priority: 'medium'
    });
    
    return queries;
  }
  
  /**
   * Reporting queries - for organizing data
   */
  private generateReportingQueries(
    technologies: Set<string>,
    context: AnalysisContext
  ): RoleQuery[] {
    const queries: RoleQuery[] = [];
    
    // Industry standards
    queries.push({
      query: 'software quality metrics industry standards 2024',
      intent: 'Find quality benchmarks',
      expectedType: 'documentation',
      priority: 'medium'
    });
    
    // Visualization best practices
    queries.push({
      query: 'code review report visualization best practices',
      intent: 'Find report formatting guidelines',
      expectedType: 'best-practice',
      priority: 'low'
    });
    
    // Technology trends
    technologies.forEach(tech => {
      queries.push({
        query: `${tech} adoption trends statistics 2024`,
        intent: `Find ${tech} usage statistics`,
        expectedType: 'documentation',
        priority: 'low'
      });
    });
    
    return queries;
  }
  
  /**
   * Extract technologies from files
   */
  private extractTechnologies(files: FileData[]): Set<string> {
    const technologies = new Set<string>();
    
    files.forEach(file => {
      const content = file.content || '';
      
      // Common imports/requires
      if (content.includes('react')) technologies.add('react');
      if (content.includes('express')) technologies.add('express');
      if (content.includes('vue')) technologies.add('vue');
      if (content.includes('angular')) technologies.add('angular');
      if (content.includes('lodash')) technologies.add('lodash');
      if (content.includes('axios')) technologies.add('axios');
      if (content.includes('mongodb')) technologies.add('mongodb');
      if (content.includes('postgresql')) technologies.add('postgresql');
      if (content.includes('redis')) technologies.add('redis');
      if (content.includes('jwt')) technologies.add('jwt');
      if (content.includes('bcrypt')) technologies.add('bcrypt');
      
      // File extensions
      if (file.path.endsWith('.vue')) technologies.add('vue');
      if (file.path.includes('docker')) technologies.add('docker');
      if (file.path.includes('k8s') || file.path.includes('kubernetes')) technologies.add('kubernetes');
    });
    
    return technologies;
  }
  
  /**
   * Extract patterns from code
   */
  private extractPatterns(files: FileData[]): Set<string> {
    const patterns = new Set<string>();
    
    files.forEach(file => {
      const content = file.content?.toLowerCase() || '';
      
      // Authentication patterns
      if (content.includes('auth') || content.includes('login')) patterns.add('authentication');
      if (content.includes('oauth')) patterns.add('oauth');
      
      // Database patterns
      if (content.includes('select') || content.includes('insert')) patterns.add('database');
      if (content.includes('sql')) patterns.add('sql');
      
      // API patterns
      if (content.includes('api') || content.includes('endpoint')) patterns.add('api');
      if (content.includes('microservice')) patterns.add('microservice');
      
      // Security patterns
      if (content.includes('encrypt') || content.includes('hash')) patterns.add('encryption');
      if (content.includes('permission') || content.includes('role')) patterns.add('authorization');
    });
    
    return patterns;
  }
}

// Export singleton
export const tavilyRoleQueryGenerator = new TavilyRoleQueryGenerator();
/**
 * Dynamic Educational Service
 * This is how the REAL system should generate educational modules
 * based on actual PR analysis results
 */

class DynamicEducationalService {
  constructor() {
    // This would connect to your educational content database
    // or AI service that generates recommendations
    this.contentSources = {
      internal: 'https://learn.codequal.com',
      external: {
        security: [
          'https://owasp.org/www-project-top-ten/',
          'https://portswigger.net/web-security',
          'https://cheatsheetseries.owasp.org/'
        ],
        testing: [
          'https://martinfowler.com/testing/',
          'https://testingjavascript.com/',
          'https://www.guru99.com/software-testing.html'
        ],
        performance: [
          'https://web.dev/learn-web-vitals/',
          'https://www.sitespeed.io/documentation/',
          'https://developer.chrome.com/docs/devtools/performance/'
        ],
        quality: [
          'https://refactoring.guru/refactoring',
          'https://sourcemaking.com/antipatterns',
          'https://www.sonarsource.com/learn/'
        ]
      }
    };
  }

  /**
   * Main method called by the report generator
   * @param {Object} analysisResult - Complete PR analysis result
   * @returns {Array} Educational modules tailored to the issues found
   */
  async generateEducationalModules(analysisResult) {
    // 1. Extract all issues from the analysis
    const allIssues = this.extractAllIssues(analysisResult);
    
    // 2. Analyze patterns and severity
    const learningProfile = this.analyzeLearningNeeds(allIssues, analysisResult);
    
    // 3. Query educational content (could be AI-powered)
    const modules = await this.queryEducationalContent(learningProfile);
    
    // 4. Personalize based on developer history (if available)
    const personalizedModules = this.personalizeModules(modules, analysisResult.developer_profile);
    
    // 5. Rank and limit modules
    return this.rankAndLimitModules(personalizedModules, 5);
  }

  extractAllIssues(analysisResult) {
    const issues = [];
    
    // Extract PR issues
    if (analysisResult.pr_issues) {
      issues.push(...analysisResult.pr_issues.map(issue => ({
        ...issue,
        source: 'pr',
        context: analysisResult.pr_metadata
      })));
    }
    
    // Extract repository issues
    if (analysisResult.high_priority_repo_issues) {
      issues.push(...analysisResult.high_priority_repo_issues.map(issue => ({
        ...issue,
        source: 'repo',
        scope: 'high_priority'
      })));
    }
    
    if (analysisResult.lower_priority_repo_issues) {
      issues.push(...analysisResult.lower_priority_repo_issues.map(issue => ({
        ...issue,
        source: 'repo',
        scope: 'low_priority'
      })));
    }
    
    return issues;
  }

  analyzeLearningNeeds(issues, analysisResult) {
    const profile = {
      primaryConcerns: [],
      skillGaps: [],
      urgency: 'normal',
      context: {
        language: analysisResult.primary_language,
        framework: this.detectFramework(analysisResult),
        projectType: this.detectProjectType(analysisResult),
        teamSize: analysisResult.team_size,
        experienceLevel: this.estimateExperienceLevel(analysisResult)
      }
    };
    
    // Group issues by category
    const categories = this.categorizeIssues(issues);
    
    // Identify primary concerns
    Object.entries(categories).forEach(([category, categoryIssues]) => {
      if (categoryIssues.some(i => i.severity === 'Critical')) {
        profile.primaryConcerns.push({
          category,
          severity: 'critical',
          count: categoryIssues.filter(i => i.severity === 'Critical').length
        });
        profile.urgency = 'high';
      }
    });
    
    // Identify skill gaps based on recurring patterns
    const patterns = this.identifyPatterns(issues);
    profile.skillGaps = patterns.map(pattern => ({
      area: pattern.category,
      frequency: pattern.count,
      examples: pattern.examples
    }));
    
    return profile;
  }

  async queryEducationalContent(learningProfile) {
    // In a real system, this might:
    // 1. Query a recommendation engine
    // 2. Use AI to generate custom content
    // 3. Search a curated content database
    
    const modules = [];
    
    // Address primary concerns first
    for (const concern of learningProfile.primaryConcerns) {
      const module = await this.findBestModule(
        concern.category,
        concern.severity,
        learningProfile.context
      );
      
      if (module) {
        modules.push({
          ...module,
          priority: 'critical',
          reason: `Addresses ${concern.count} critical ${concern.category} issues`
        });
      }
    }
    
    // Address skill gaps
    for (const gap of learningProfile.skillGaps) {
      const module = await this.findModuleForSkillGap(
        gap,
        learningProfile.context
      );
      
      if (module) {
        modules.push({
          ...module,
          priority: 'high',
          reason: `Recurring pattern: ${gap.frequency} similar issues found`
        });
      }
    }
    
    return modules;
  }

  async findBestModule(category, severity, context) {
    // This simulates querying a content recommendation system
    
    // Build search query based on context
    const searchTerms = [
      category,
      context.language,
      context.framework,
      severity
    ].filter(Boolean);
    
    // In reality, this would query your content database or API
    // For now, we'll generate a contextual module
    return {
      title: this.generateContextualTitle(category, context),
      description: this.generateContextualDescription(category, severity, context),
      duration: this.estimateDuration(category, severity),
      level: this.determineLevel(severity, context.experienceLevel),
      url: this.selectBestUrl(category, context),
      tags: searchTerms,
      relevanceScore: 0.95
    };
  }

  generateContextualTitle(category, context) {
    const baseTitle = {
      security: 'Security Best Practices',
      performance: 'Performance Optimization',
      testing: 'Testing Strategies',
      quality: 'Code Quality',
      architecture: 'Architecture Patterns'
    }[category] || 'Development Best Practices';
    
    // Add context
    if (context.framework) {
      return `${baseTitle} for ${context.framework}`;
    } else if (context.language) {
      return `${baseTitle} in ${context.language}`;
    }
    
    return baseTitle;
  }

  generateContextualDescription(category, severity, context) {
    const urgency = severity === 'critical' ? 'Critical: ' : '';
    
    const descriptions = {
      security: `${urgency}Learn to identify and prevent security vulnerabilities in your ${context.language || 'application'} code`,
      performance: `${urgency}Master techniques to optimize ${context.framework || 'application'} performance and reduce bottlenecks`,
      testing: `${urgency}Implement comprehensive testing strategies for reliable ${context.projectType || 'software'}`,
      quality: `${urgency}Improve code maintainability and reduce technical debt`
    };
    
    return descriptions[category] || 'Enhance your development skills';
  }

  selectBestUrl(category, context) {
    // Try to find framework-specific resources first
    if (context.framework) {
      const frameworkUrls = {
        'React': {
          security: 'https://react.dev/learn/security',
          testing: 'https://testing-library.com/docs/react-testing-library/intro/',
          performance: 'https://react.dev/learn/render-and-commit'
        },
        'Django': {
          security: 'https://docs.djangoproject.com/en/stable/topics/security/',
          testing: 'https://docs.djangoproject.com/en/stable/topics/testing/',
          performance: 'https://docs.djangoproject.com/en/stable/topics/performance/'
        },
        'Express': {
          security: 'https://expressjs.com/en/advanced/best-practice-security.html',
          performance: 'https://expressjs.com/en/advanced/best-practice-performance.html'
        }
      };
      
      if (frameworkUrls[context.framework]?.[category]) {
        return frameworkUrls[context.framework][category];
      }
    }
    
    // Fallback to general resources
    const sources = this.contentSources.external[category];
    return sources ? sources[0] : 'https://developer.mozilla.org/en-US/docs/Learn';
  }

  personalizeModules(modules, developerProfile) {
    if (!developerProfile) return modules;
    
    // Adjust based on developer's history
    return modules.map(module => {
      // Skip modules the developer already completed
      if (developerProfile.completed_modules?.includes(module.id)) {
        return null;
      }
      
      // Adjust difficulty based on skill level
      if (developerProfile.skill_level) {
        module.level = this.adjustLevel(module.level, developerProfile.skill_level);
      }
      
      // Add personalized notes
      if (developerProfile.learning_style === 'hands-on') {
        module.description += ' - Includes practical exercises';
      }
      
      return module;
    }).filter(Boolean);
  }

  rankAndLimitModules(modules, limit) {
    // Score modules based on multiple factors
    const scoredModules = modules.map(module => ({
      ...module,
      score: this.calculateModuleScore(module)
    }));
    
    // Sort by score and limit
    return scoredModules
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, reason, ...module }) => module); // Remove internal properties
  }

  calculateModuleScore(module) {
    let score = 0;
    
    // Priority based scoring
    if (module.priority === 'critical') score += 100;
    else if (module.priority === 'high') score += 50;
    else score += 10;
    
    // Relevance score
    score += (module.relevanceScore || 0.5) * 50;
    
    // Prefer shorter modules for urgent issues
    if (module.priority === 'critical' && module.duration <= 2) {
      score += 20;
    }
    
    return score;
  }

  // Helper methods
  detectFramework(analysisResult) {
    // Analyze file patterns, dependencies, etc.
    const files = analysisResult.files_analyzed || [];
    
    if (files.some(f => f.includes('.jsx') || f.includes('.tsx'))) return 'React';
    if (files.some(f => f.includes('django') || f.includes('models.py'))) return 'Django';
    if (files.some(f => f.includes('express'))) return 'Express';
    if (files.some(f => f.includes('.vue'))) return 'Vue';
    if (files.some(f => f.includes('angular'))) return 'Angular';
    
    return null;
  }

  detectProjectType(analysisResult) {
    const indicators = {
      api: ['routes', 'controllers', 'endpoints', 'rest', 'graphql'],
      frontend: ['components', 'views', 'styles', 'ui'],
      fullstack: ['client', 'server', 'frontend', 'backend'],
      library: ['lib', 'src', 'dist', 'package.json'],
      mobile: ['ios', 'android', 'react-native']
    };
    
    // Check file paths and content for indicators
    // This is simplified - real implementation would be more sophisticated
    return 'application';
  }

  estimateExperienceLevel(analysisResult) {
    const score = analysisResult.overall_score;
    const issueTypes = analysisResult.pr_issues?.map(i => i.severity) || [];
    
    if (score > 90 && !issueTypes.includes('Critical')) return 'senior';
    if (score > 70) return 'mid';
    return 'junior';
  }

  categorizeIssues(issues) {
    const categories = {};
    
    issues.forEach(issue => {
      const category = this.determineIssueCategory(issue);
      if (!categories[category]) categories[category] = [];
      categories[category].push(issue);
    });
    
    return categories;
  }

  determineIssueCategory(issue) {
    const text = `${issue.title} ${issue.description}`.toLowerCase();
    
    if (text.match(/security|auth|password|token|injection|xss|csrf/)) return 'security';
    if (text.match(/performance|slow|optimize|cache|memory|cpu/)) return 'performance';
    if (text.match(/test|coverage|unit|integration|mock/)) return 'testing';
    if (text.match(/quality|duplicate|refactor|clean|maintain/)) return 'quality';
    if (text.match(/architect|pattern|design|structure/)) return 'architecture';
    
    return 'general';
  }

  identifyPatterns(issues) {
    const patterns = {};
    
    issues.forEach(issue => {
      const pattern = this.extractPattern(issue);
      if (!patterns[pattern]) {
        patterns[pattern] = { category: pattern, count: 0, examples: [] };
      }
      patterns[pattern].count++;
      if (patterns[pattern].examples.length < 3) {
        patterns[pattern].examples.push(issue.title);
      }
    });
    
    return Object.values(patterns).filter(p => p.count > 1);
  }

  extractPattern(issue) {
    // Simplified pattern extraction
    // Real implementation would use more sophisticated analysis
    
    if (issue.title.includes('Missing')) return 'missing-implementation';
    if (issue.title.includes('No')) return 'missing-implementation';
    if (issue.title.includes('Vulnerability')) return 'security-vulnerability';
    if (issue.title.includes('Performance')) return 'performance-issue';
    
    return 'general-issue';
  }

  estimateDuration(category, severity) {
    const baseDuration = {
      security: 3,
      performance: 2,
      testing: 2,
      quality: 1,
      general: 2
    }[category] || 2;
    
    // Urgent issues might need quick lessons
    if (severity === 'critical') {
      return Math.max(1, baseDuration - 1);
    }
    
    return baseDuration;
  }

  determineLevel(severity, experienceLevel) {
    if (severity === 'critical') return 'Immediate Action Required';
    
    const levelMap = {
      junior: { high: 'Intermediate', medium: 'Beginner', low: 'Beginner' },
      mid: { high: 'Advanced', medium: 'Intermediate', low: 'Intermediate' },
      senior: { high: 'Expert', medium: 'Advanced', low: 'Advanced' }
    };
    
    return levelMap[experienceLevel]?.[severity.toLowerCase()] || 'Intermediate';
  }

  adjustLevel(currentLevel, developerSkillLevel) {
    // Adjust module level based on developer's skill
    const adjustments = {
      junior: { 'Expert': 'Advanced', 'Advanced': 'Intermediate' },
      senior: { 'Beginner': 'Intermediate', 'Intermediate': 'Advanced' }
    };
    
    return adjustments[developerSkillLevel]?.[currentLevel] || currentLevel;
  }
}

module.exports = DynamicEducationalService;
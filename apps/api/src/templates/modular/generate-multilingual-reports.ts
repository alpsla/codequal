import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('multilingual-reports');

interface ReportData {
  pr_number: string;
  repository_name: string;
  repository_full_name: string;
  primary_language: string;
  files_changed: number;
  lines_added: number;
  lines_removed: number;
  
  approval_status: 'approved' | 'conditionally_approved' | 'blocked';
  approval_icon: string;
  approval_message: string;
  
  blocking_issues: Array<{
    icon: string;
    severity: string;
    description: string;
  }>;
  
  positive_findings: Array<{
    description: string;
  }>;
  
  pr_issues: Array<{
    severity: string;
    severity_class: string;
    title: string;
    file_path: string;
    line_number: string;
    description: string;
    code_snippet?: string;
    recommendation: string;
  }>;
  
  high_priority_repo_issues: Array<{
    severity: string;
    severity_class: string;
    title: string;
    description: string;
    code_snippet?: string;
    impact_color: string;
    impact_description: string;
  }>;
  
  lower_priority_repo_issues: Array<{
    severity: string;
    severity_class: string;
    title: string;
    description: string;
    code_snippet?: string;
    impact_color: string;
    impact_description: string;
  }>;
  
  overall_score: number;
  score_message: string;
  
  skill_categories: Array<{
    icon: string;
    name: string;
    current_level: number;
    skill_color: string;
    skill_message: string;
  }>;
  
  educational_modules: Array<{
    title: string;
    duration: string;
    level: string;
    description: string;
    link: string;
  }>;
  
  pr_comment_text: string;
  analysis_id: string;
  timestamp: string;
}

interface LanguageStrings {
  title: string;
  header: {
    title: string;
    subtitle: string;
    repository: string;
    primaryLanguage: string;
    filesChanged: string;
    linesModified: string;
  };
  prDecision: {
    title: string;
    blockingIssues: string;
    positiveFindings: string;
    statuses: {
      approved: string;
      conditionallyApproved: string;
      blocked: string;
    };
  };
  prIssues: {
    title: string;
    file: string;
    recommendation: string;
    noIssues: string;
  };
  repoIssues: {
    title: string;
    subtitle: string;
    impact: string;
    showAll: string;
    hideAll: string;
  };
  score: {
    title: string;
    currentScore: string;
  };
  skills: {
    title: string;
    categories: {
      security: string;
      testing: string;
      documentation: string;
      performance: string;
      codeQuality: string;
    };
  };
  educational: {
    title: string;
    duration: string;
    hours: string;
    level: string;
    startLearning: string;
  };
  prComment: {
    title: string;
  };
  footer: {
    generatedBy: string;
    analysisId: string;
  };
  severity: {
    critical: string;
    high: string;
    medium: string;
    low: string;
  };
}

export class MultilingualReportGenerator {
  private templatesPath: string;
  private languages: Map<string, LanguageStrings> = new Map();
  
  constructor(templatesPath: string) {
    this.templatesPath = templatesPath;
    this.registerHelpers();
  }
  
  private registerHelpers() {
    Handlebars.registerHelper('ifEquals', function(this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
      return a === b ? options.fn(this) : options.inverse(this);
    });
    
    Handlebars.registerHelper('severityClass', function(this: unknown, score: number) {
      if (score < 40) return 'low';
      if (score < 70) return 'medium';
      return 'high';
    });
  }
  
  async loadLanguages() {
    const languages = ['en', 'ru', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'it', 'ko'];
    
    for (const lang of languages) {
      try {
        const langPath = path.join(this.templatesPath, 'languages', `${lang}.json`);
        const content = await fs.readFile(langPath, 'utf-8');
        this.languages.set(lang, JSON.parse(content));
      } catch (error) {
        console.warn(`Language file not found: ${lang}.json`);
      }
    }
  }
  
  async generateReportForLanguage(data: ReportData, language: string, outputPath: string) {
    const translations = this.languages.get(language);
    if (!translations) {
      throw new Error(`Language ${language} not supported`);
    }
    
    // Load base template
    const templatePath = path.join(this.templatesPath, 'base-template.html');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    
    // Merge data with translations
    const fullData = {
      ...data,
      lang: language,
      i18n: translations,
      
      // Add computed properties
      has_pr_issues: data.pr_issues.length > 0,
      has_lower_priority_issues: data.lower_priority_repo_issues.length > 0,
      total_lower_priority_issues: data.lower_priority_repo_issues.length,
      approval_class: data.approval_status.replace('_', '-'),
      
      // Fix educational links to use real URLs
      educational_modules_fixed: data.educational_modules.map(module => ({
        ...module,
        real_link: this.getRealEducationalLink(module)
      }))
    };
    
    // Generate HTML
    const html = template(fullData);
    
    // Write to file
    await fs.writeFile(outputPath, html);
    logger.info(`Generated ${language} report: ${outputPath}`);
  }
  
  private getRealEducationalLink(module: { title: string }): string {
    // Map template links to real educational resources
    const linkMappings: { [key: string]: string } = {
      'secure-coding': 'https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/',
      'api-security': 'https://github.com/OWASP/API-Security',
      'dependency-security': 'https://docs.github.com/en/code-security/supply-chain-security',
      'testing-best-practices': 'https://github.com/goldbergyoni/javascript-testing-best-practices',
      'performance-optimization': 'https://web.dev/fast/',
      'code-review': 'https://google.github.io/eng-practices/review/',
      'documentation': 'https://www.writethedocs.org/guide/writing/beginners-guide-to-docs/'
    };
    
    // Extract course type from title or use default
    const courseKey = module.title.toLowerCase().includes('secure') ? 'secure-coding' :
                     module.title.toLowerCase().includes('api') ? 'api-security' :
                     module.title.toLowerCase().includes('dependency') ? 'dependency-security' :
                     module.title.toLowerCase().includes('test') ? 'testing-best-practices' :
                     module.title.toLowerCase().includes('performance') ? 'performance-optimization' :
                     module.title.toLowerCase().includes('review') ? 'code-review' :
                     'documentation';
    
    return linkMappings[courseKey] || 'https://www.codequal.com/learn';
  }
  
  async generateAllLanguages(data: ReportData, outputDir: string) {
    await this.loadLanguages();
    
    for (const [lang, _] of this.languages) {
      const outputPath = path.join(outputDir, `report-${lang}.html`);
      await this.generateReportForLanguage(data, lang, outputPath);
    }
    
    // Copy CSS and JS files
    const cssSource = path.join(this.templatesPath, 'assets', 'styles.css');
    const jsSource = path.join(this.templatesPath, 'assets', 'scripts.js');
    const cssTarget = path.join(outputDir, 'styles.css');
    const jsTarget = path.join(outputDir, 'scripts.js');
    
    try {
      await fs.copyFile(cssSource, cssTarget);
      await fs.copyFile(jsSource, jsTarget);
    } catch (error) {
      logger.warn('Could not copy asset files:', error as Error);
    }
  }
}
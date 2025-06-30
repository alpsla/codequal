import { EducationalLinkValidator, EducationalResource } from './educational-link-validator';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ReportData {
  title: string;
  prNumber: number;
  repository: string;
  language: string;
  findings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    title: string;
    description: string;
    file: string;
    line: number;
    recommendation: string;
  }>;
  metrics: {
    codeQuality: number;
    security: number;
    performance: number;
    testCoverage: number;
  };
}

export class ValidatedReportGenerator {
  private linkValidator: EducationalLinkValidator;

  constructor() {
    this.linkValidator = new EducationalLinkValidator();
  }

  async generateHTMLReport(
    data: ReportData,
    language: 'en' | 'ru' = 'en',
    outputPath: string
  ): Promise<void> {
    // Get validated educational resources based on findings
    const findingTexts = data.findings.map(f => `${f.title} ${f.description}`);
    const { resources, fallbackMessage } = await this.linkValidator.generateEducationalSection(
      findingTexts,
      language
    );

    const html = this.generateHTML(data, resources, language, fallbackMessage);
    await fs.writeFile(outputPath, html, 'utf-8');
  }

  private generateHTML(
    data: ReportData,
    educationalResources: EducationalResource[],
    language: 'en' | 'ru',
    fallbackMessage?: string
  ): string {
    const isRussian = language === 'ru';
    
    return `<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="google" content="notranslate">
    <title>CodeQual - ${isRussian ? 'Отчет анализа' : 'Analysis Report'} PR #${data.prNumber}</title>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    <div class="language-switch">
        <a href="analysis-report-${isRussian ? 'english' : 'russian'}.html">
            ${isRussian ? '🇬🇧 English Version' : '🇷🇺 Русская версия'}
        </a>
    </div>

    <div class="container">
        ${this.generateHeader(data, isRussian)}
        ${this.generateMetricsSection(data, isRussian)}
        ${this.generateFindingsSection(data, isRussian)}
        ${this.generateEducationalSection(educationalResources, isRussian, fallbackMessage)}
        ${this.generateFooter(isRussian)}
    </div>

    <script>
        ${this.getScripts()}
    </script>
</body>
</html>`;
  }

  private generateEducationalSection(
    resources: EducationalResource[],
    isRussian: boolean,
    fallbackMessage?: string
  ): string {
    const title = isRussian ? '📚 Образовательные ресурсы' : '📚 Educational Resources';
    const subtitle = isRussian 
      ? 'На основе анализа мы рекомендуем следующие проверенные обучающие материалы:'
      : 'Based on the analysis, we recommend the following verified learning resources:';

    let html = `
        <div class="section">
            <h2>${title}</h2>
            <p>${subtitle}</p>
            ${fallbackMessage ? `<p class="fallback-message">${fallbackMessage}</p>` : ''}
            
            <div class="edu-modules">`;

    resources.forEach(resource => {
      const duration = isRussian ? resource.duration : resource.duration;
      const level = isRussian ? this.translateLevel(resource.level) : resource.level;
      const startText = isRussian ? 'Начать обучение →' : 'Start Learning →';
      const topics = resource.topics.join(', ');

      html += `
                <div class="edu-module">
                    <h4>${resource.title}</h4>
                    <p><strong>${isRussian ? 'Продолжительность' : 'Duration'}:</strong> ${duration} | 
                       <strong>${isRussian ? 'Уровень' : 'Level'}:</strong> ${level}</p>
                    <p>${isRussian ? 'Темы' : 'Topics'}: ${topics}</p>
                    <a href="${resource.url}" class="edu-link" target="_blank" rel="noopener noreferrer">
                        ${startText}
                    </a>
                    <div class="link-status">
                        <span class="verified">✓ ${isRussian ? 'Проверенная ссылка' : 'Verified link'}</span>
                    </div>
                </div>`;
    });

    // Add additional resources section
    html += `
            </div>
            
            <div class="additional-resources">
                <h3>${isRussian ? '🌐 Дополнительные ресурсы' : '🌐 Additional Resources'}</h3>`;

    if (isRussian) {
      html += `
                <ul>
                    <li><a href="https://learn.javascript.ru/" target="_blank">Современный учебник JavaScript</a></li>
                    <li><a href="https://habr.com/ru/hub/javascript/" target="_blank">JavaScript на Habr</a></li>
                    <li><a href="https://developer.mozilla.org/ru/" target="_blank">MDN Web Docs (Русский)</a></li>
                    <li><a href="https://metanit.com/web/" target="_blank">Metanit - Веб-технологии</a></li>
                </ul>`;
    } else {
      html += `
                <ul>
                    <li><a href="https://javascript.info/" target="_blank">The Modern JavaScript Tutorial</a></li>
                    <li><a href="https://developer.mozilla.org/en-US/" target="_blank">MDN Web Docs</a></li>
                    <li><a href="https://www.freecodecamp.org/" target="_blank">freeCodeCamp</a></li>
                    <li><a href="https://github.com/goldbergyoni/nodebestpractices" target="_blank">Node.js Best Practices</a></li>
                </ul>`;
    }

    html += `
                <p class="chrome-tip">
                    💡 ${isRussian 
                      ? 'Совет: Используйте автоперевод Chrome для чтения англоязычных ресурсов на русском языке'
                      : 'Tip: Use Chrome\'s auto-translate feature to read resources in your preferred language'}
                </p>
            </div>
        </div>`;

    return html;
  }

  private translateLevel(level: string): string {
    const translations: Record<string, string> = {
      'Beginner': 'Начальный',
      'Intermediate': 'Средний',
      'Advanced': 'Продвинутый',
      'All levels': 'Все уровни'
    };
    return translations[level] || level;
  }

  private generateHeader(data: ReportData, isRussian: boolean): string {
    return `
        <div class="header">
            <h1>${isRussian ? 'Отчет анализа кода' : 'Code Analysis Report'}</h1>
            <div class="subtitle">Pull Request #${data.prNumber} - ${data.repository}</div>
            <div class="metadata">
                <div class="metadata-item">
                    <strong>${isRussian ? 'Репозиторий' : 'Repository'}</strong>
                    ${data.repository}
                </div>
                <div class="metadata-item">
                    <strong>${isRussian ? 'Основной язык' : 'Primary Language'}</strong>
                    ${data.language}
                </div>
                <div class="metadata-item">
                    <strong>${isRussian ? 'Всего проблем' : 'Total Issues'}</strong>
                    ${data.findings.length}
                </div>
                <div class="metadata-item">
                    <strong>${isRussian ? 'Критических' : 'Critical'}</strong>
                    ${data.findings.filter(f => f.severity === 'critical').length}
                </div>
            </div>
        </div>`;
  }

  private generateMetricsSection(data: ReportData, isRussian: boolean): string {
    const metrics = [
      { 
        name: isRussian ? 'Качество кода' : 'Code Quality', 
        value: data.metrics.codeQuality 
      },
      { 
        name: isRussian ? 'Безопасность' : 'Security', 
        value: data.metrics.security 
      },
      { 
        name: isRussian ? 'Производительность' : 'Performance', 
        value: data.metrics.performance 
      },
      { 
        name: isRussian ? 'Покрытие тестами' : 'Test Coverage', 
        value: data.metrics.testCoverage,
        suffix: '%'
      }
    ];

    let html = `
        <div class="section">
            <h2>📊 ${isRussian ? 'Метрики' : 'Metrics'}</h2>
            <div class="metrics-grid">`;

    metrics.forEach(metric => {
      const score = metric.suffix ? `${metric.value}${metric.suffix}` : `${metric.value}/10`;
      const percentage = metric.suffix ? metric.value : metric.value * 10;
      
      html += `
                <div class="metric-card">
                    <h3>${metric.name}</h3>
                    <div class="metric-score">${score}</div>
                    <div class="metric-bar">
                        <div class="metric-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>`;
    });

    html += `
            </div>
        </div>`;

    return html;
  }

  private generateFindingsSection(data: ReportData, isRussian: boolean): string {
    const severityLabels = {
      critical: isRussian ? 'КРИТИЧЕСКИЙ' : 'CRITICAL',
      high: isRussian ? 'ВЫСОКИЙ' : 'HIGH',
      medium: isRussian ? 'СРЕДНИЙ' : 'MEDIUM',
      low: isRussian ? 'НИЗКИЙ' : 'LOW'
    };

    let html = `
        <div class="section">
            <h2>🔍 ${isRussian ? 'Обнаруженные проблемы' : 'Findings'} (${data.findings.length})</h2>`;

    data.findings.forEach(finding => {
      html += `
            <div class="finding ${finding.severity}">
                <h4>
                    <span class="badge ${finding.severity}">${severityLabels[finding.severity]}</span>
                    ${finding.title}
                </h4>
                <p>${finding.description}</p>
                <div class="finding-meta">
                    <span>📁 ${finding.file}:${finding.line}</span>
                    <span>🏷️ ${finding.type}</span>
                </div>
                <p style="margin-top: 10px;">
                    <strong>${isRussian ? 'Рекомендация' : 'Recommendation'}:</strong> 
                    ${finding.recommendation}
                </p>
            </div>`;
    });

    html += `
        </div>`;

    return html;
  }

  private generateFooter(isRussian: boolean): string {
    return `
        <div class="section" style="text-align: center; color: #718096;">
            <p>${isRussian ? 'Сгенерировано' : 'Generated by'} CodeQual • 
               <a href="https://codequal.com" style="color: #667eea;">codequal.com</a></p>
            <p style="margin-top: 10px; font-size: 0.9em;">
                🌐 ${isRussian 
                  ? 'Поддержка 10 языков: English, Español, 中文, हिंदी, Português, 日本語, Deutsch, Русский, Français, 한국어'
                  : 'Supporting 10 languages: English, Spanish, Mandarin, Hindi, Portuguese, Japanese, German, Russian, French, Korean'}
            </p>
        </div>`;
  }

  private getStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f7fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .section {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .edu-module {
            background: #f0f7ff;
            border: 1px solid #b8daff;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            position: relative;
        }
        
        .link-status {
            position: absolute;
            top: 10px;
            right: 10px;
        }
        
        .verified {
            color: #27ae60;
            font-size: 0.85em;
            font-weight: 500;
        }
        
        .fallback-message {
            background: #fff3cd;
            color: #856404;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        
        .chrome-tip {
            margin-top: 20px;
            padding: 15px;
            background: #e7f3ff;
            border-radius: 8px;
            font-size: 0.9em;
        }
        
        .additional-resources {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
        }
        
        .additional-resources ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .additional-resources li {
            margin: 8px 0;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .metric-card {
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
        }
        
        .metric-score {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }
        
        .finding {
            background: #fef5e7;
            border-left: 4px solid #f39c12;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        
        .finding.critical {
            background: #fdf2f2;
            border-color: #e74c3c;
        }
        
        .language-switch {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }
        
        .language-switch a {
            background: white;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            color: #667eea;
            font-weight: 500;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }`;
  }

  private getScripts(): string {
    return `
        // Animate metrics on page load
        window.addEventListener('load', () => {
            const fills = document.querySelectorAll('.metric-fill');
            fills.forEach(fill => {
                const width = fill.style.width;
                fill.style.width = '0';
                setTimeout(() => {
                    fill.style.width = width;
                }, 100);
            });
        });`;
  }
}
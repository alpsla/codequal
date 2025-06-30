import { EducationalLinkValidator } from './educational-link-validator';

/**
 * Example of how localized educational resources are integrated into reports
 */
export class LocalizedReportExample {
  private linkValidator: EducationalLinkValidator;

  constructor() {
    this.linkValidator = new EducationalLinkValidator();
  }

  /**
   * Generate educational section HTML for any language
   */
  async generateEducationalSectionHTML(
    findings: string[],
    language: string
  ): Promise<string> {
    // Get validated resources for the specific language
    const { resources, fallbackMessage } = await this.linkValidator.generateEducationalSection(
      findings,
      language as any
    );

    // Language-specific headers and text
    const translations = {
      en: {
        title: '📚 Educational Resources',
        subtitle: 'Based on the analysis, we recommend these learning resources:',
        chromeNote: 'Tip: Use Chrome\'s auto-translate for resources in other languages',
        verifiedLink: '✓ Verified link',
        duration: 'Duration',
        level: 'Level',
        topics: 'Topics',
        startLearning: 'Start Learning →'
      },
      es: {
        title: '📚 Recursos Educativos',
        subtitle: 'Basado en el análisis, recomendamos estos recursos de aprendizaje:',
        chromeNote: 'Consejo: Use la traducción automática de Chrome para recursos en otros idiomas',
        verifiedLink: '✓ Enlace verificado',
        duration: 'Duración',
        level: 'Nivel',
        topics: 'Temas',
        startLearning: 'Comenzar a Aprender →'
      },
      zh: {
        title: '📚 教育资源',
        subtitle: '根据分析，我们推荐以下学习资源：',
        chromeNote: '提示：使用Chrome的自动翻译功能查看其他语言的资源',
        verifiedLink: '✓ 已验证链接',
        duration: '时长',
        level: '级别',
        topics: '主题',
        startLearning: '开始学习 →'
      },
      ja: {
        title: '📚 教育リソース',
        subtitle: '分析に基づいて、以下の学習リソースをお勧めします：',
        chromeNote: 'ヒント：他言語のリソースにはChromeの自動翻訳を使用してください',
        verifiedLink: '✓ 検証済みリンク',
        duration: '所要時間',
        level: 'レベル',
        topics: 'トピック',
        startLearning: '学習を開始 →'
      },
      de: {
        title: '📚 Bildungsressourcen',
        subtitle: 'Basierend auf der Analyse empfehlen wir diese Lernressourcen:',
        chromeNote: 'Tipp: Verwenden Sie Chrome-Übersetzung für Ressourcen in anderen Sprachen',
        verifiedLink: '✓ Verifizierter Link',
        duration: 'Dauer',
        level: 'Stufe',
        topics: 'Themen',
        startLearning: 'Lernen beginnen →'
      },
      fr: {
        title: '📚 Ressources Éducatives',
        subtitle: 'Sur la base de l\'analyse, nous recommandons ces ressources d\'apprentissage:',
        chromeNote: 'Astuce: Utilisez la traduction automatique de Chrome pour les ressources dans d\'autres langues',
        verifiedLink: '✓ Lien vérifié',
        duration: 'Durée',
        level: 'Niveau',
        topics: 'Sujets',
        startLearning: 'Commencer à Apprendre →'
      },
      ko: {
        title: '📚 교육 리소스',
        subtitle: '분석을 바탕으로 다음 학습 리소스를 권장합니다:',
        chromeNote: '팁: 다른 언어의 리소스는 Chrome 자동 번역을 사용하세요',
        verifiedLink: '✓ 확인된 링크',
        duration: '소요 시간',
        level: '수준',
        topics: '주제',
        startLearning: '학습 시작 →'
      },
      pt: {
        title: '📚 Recursos Educacionais',
        subtitle: 'Com base na análise, recomendamos estes recursos de aprendizagem:',
        chromeNote: 'Dica: Use a tradução automática do Chrome para recursos em outros idiomas',
        verifiedLink: '✓ Link verificado',
        duration: 'Duração',
        level: 'Nível',
        topics: 'Tópicos',
        startLearning: 'Começar a Aprender →'
      },
      ru: {
        title: '📚 Образовательные ресурсы',
        subtitle: 'На основе анализа мы рекомендуем следующие обучающие материалы:',
        chromeNote: 'Совет: Используйте автоперевод Chrome для ресурсов на других языках',
        verifiedLink: '✓ Проверенная ссылка',
        duration: 'Продолжительность',
        level: 'Уровень',
        topics: 'Темы',
        startLearning: 'Начать обучение →'
      },
      hi: {
        title: '📚 शैक्षिक संसाधन',
        subtitle: 'विश्लेषण के आधार पर, हम इन सीखने के संसाधनों की सिफारिश करते हैं:',
        chromeNote: 'सुझाव: अन्य भाषाओं में संसाधनों के लिए Chrome के ऑटो-ट्रांसलेट का उपयोग करें',
        verifiedLink: '✓ सत्यापित लिंक',
        duration: 'अवधि',
        level: 'स्तर',
        topics: 'विषय',
        startLearning: 'सीखना शुरू करें →'
      }
    };

    const t = translations[language as keyof typeof translations] || translations.en;

    let html = `
    <div class="section">
        <h2>${t.title}</h2>
        <p>${t.subtitle}</p>
        ${fallbackMessage ? `<p class="fallback-message">${fallbackMessage}</p>` : ''}
        
        <div class="edu-modules">`;

    // Add each resource with proper localization
    resources.forEach(resource => {
      html += `
            <div class="edu-module">
                <h4>${resource.title}</h4>
                <p>
                    <strong>${t.duration}:</strong> ${resource.duration} | 
                    <strong>${t.level}:</strong> ${resource.level}
                </p>
                <p>${t.topics}: ${resource.topics.join(', ')}</p>
                <a href="${resource.url}" class="edu-link" target="_blank" rel="noopener noreferrer">
                    ${t.startLearning}
                </a>
                <div class="link-status">
                    <span class="verified">${t.verifiedLink}</span>
                </div>
            </div>`;
    });

    html += `
        </div>
        
        <div class="chrome-translation-note">
            <p>💡 ${t.chromeNote}</p>
        </div>
    </div>`;

    return html;
  }

  /**
   * Example showing how resources adapt to different languages
   */
  async demonstrateMultilingualResources() {
    const findings = [
      'Security vulnerability in input validation',
      'Missing error handling in critical functions',
      'TypeScript type definitions incomplete'
    ];

    console.log('🌍 Generating educational sections for all languages:\n');

    const languages = ['en', 'es', 'zh', 'ja', 'de', 'fr', 'ko', 'pt', 'ru', 'hi'];

    for (const lang of languages) {
      console.log(`\n${lang.toUpperCase()}:`);
      const { resources } = await this.linkValidator.generateEducationalSection(
        findings,
        lang as any
      );
      
      console.log(`Found ${resources.length} localized resources:`);
      resources.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.title} (${r.url})`);
      });
    }
  }
}

// Example usage in report generation
export async function generateLocalizedReport(
  reportData: any,
  language: string
): Promise<string> {
  const example = new LocalizedReportExample();
  
  // Extract findings text for educational resource matching
  const findingTexts = reportData.findings.map((f: any) => 
    `${f.title} ${f.description}`
  );
  
  // Generate educational section with localized resources
  const educationalHTML = await example.generateEducationalSectionHTML(
    findingTexts,
    language
  );
  
  // The rest of your report HTML...
  return `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
        <meta charset="UTF-8">
        <title>CodeQual Analysis Report</title>
    </head>
    <body>
        <!-- Other report sections -->
        
        ${educationalHTML}
        
        <!-- Footer, scripts, etc. -->
    </body>
    </html>
  `;
}
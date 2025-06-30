import axios from 'axios';
import { createLogger } from '@codequal/core/utils';

type SupportedLanguage = 'en' | 'es' | 'zh' | 'hi' | 'pt' | 'ja' | 'de' | 'ru' | 'fr' | 'ko';

export interface EducationalResource {
  title: string;
  url: string;
  duration: string;
  level: string;
  topics: string[];
  language: SupportedLanguage;
  fallbackUrl?: string;
  isAccessible?: boolean;
}

export class EducationalLinkValidator {
  private logger = createLogger('EducationalLinkValidator');
  private validatedLinks = new Map<string, boolean>();

  // Curated list of reliable educational resources by language
  private readonly resources: EducationalResource[] = [
    // English Resources
    {
      title: 'TypeScript Handbook - Type Narrowing',
      url: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
      duration: '15 minutes',
      level: 'Intermediate',
      topics: ['Type safety', 'Validation', 'Type guards'],
      language: 'en'
    },
    {
      title: 'Node.js Best Practices - Error Handling',
      url: 'https://github.com/goldbergyoni/nodebestpractices#2-error-handling-practices',
      fallbackUrl: 'https://nodejs.dev/en/learn/error-handling-in-nodejs/',
      duration: '20 minutes',
      level: 'Intermediate',
      topics: ['Error handling', 'Async/await', 'Best practices'],
      language: 'en'
    },
    {
      title: 'MDN - JavaScript Error Handling',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15 minutes',
      level: 'Beginner',
      topics: ['Try/catch', 'Error objects', 'Debugging'],
      language: 'en'
    },
    {
      title: 'TypeScript Deep Dive - Advanced Types',
      url: 'https://basarat.gitbook.io/typescript/type-system/advanced-types',
      fallbackUrl: 'https://www.typescriptlang.org/docs/handbook/2/types-from-types.html',
      duration: '25 minutes',
      level: 'Advanced',
      topics: ['Generics', 'Conditional types', 'Utility types'],
      language: 'en'
    },
    {
      title: 'OWASP - Input Validation Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
      duration: '30 minutes',
      level: 'Intermediate',
      topics: ['Security', 'Validation', 'Best practices'],
      language: 'en'
    },
    // Russian Resources
    {
      title: 'Современный учебник JavaScript - Обработка ошибок',
      url: 'https://learn.javascript.ru/error-handling',
      duration: '20 минут',
      level: 'Средний',
      topics: ['Обработка ошибок', 'Try/catch', 'Async/await'],
      language: 'ru'
    },
    {
      title: 'Habr - TypeScript: Продвинутые типы',
      url: 'https://habr.com/ru/company/ruvds/blog/426473/',
      fallbackUrl: 'https://habr.com/ru/hub/typescript/',
      duration: '25 минут',
      level: 'Продвинутый',
      topics: ['TypeScript', 'Типизация', 'Generics'],
      language: 'ru'
    },
    {
      title: 'Metanit - Руководство по TypeScript',
      url: 'https://metanit.com/web/typescript/',
      duration: '40 минут',
      level: 'Начальный',
      topics: ['TypeScript основы', 'Типы', 'Классы', 'Интерфейсы'],
      language: 'ru'
    },
    {
      title: 'MDN Web Docs (Русский) - Обработка ошибок',
      url: 'https://developer.mozilla.org/ru/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15 минут',
      level: 'Начальный',
      topics: ['JavaScript', 'Обработка ошибок', 'Отладка'],
      language: 'ru'
    },
    {
      title: 'Hexlet - Обработка ошибок в Node.js',
      url: 'https://ru.hexlet.io/courses/nodejs-error-handling',
      fallbackUrl: 'https://ru.hexlet.io/courses',
      duration: '2 часа',
      level: 'Средний',
      topics: ['Node.js', 'Async', 'Error handling'],
      language: 'ru'
    },
    // Spanish Resources
    {
      title: 'MDN Web Docs - Control de flujo y manejo de errores',
      url: 'https://developer.mozilla.org/es/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15 minutos',
      level: 'Principiante',
      topics: ['Manejo de errores', 'Try/catch', 'Depuración'],
      language: 'es' as const
    },
    {
      title: 'Desarrollo Web - Validación de datos',
      url: 'https://desarrolloweb.com/articulos/validacion-datos-javascript.html',
      fallbackUrl: 'https://www.freecodecamp.org/espanol/news/',
      duration: '20 minutos',
      level: 'Intermedio',
      topics: ['Validación', 'Seguridad', 'JavaScript'],
      language: 'es' as const
    },
    // Chinese Resources
    {
      title: 'MDN Web 文档 - 错误处理',
      url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15分钟',
      level: '初级',
      topics: ['错误处理', 'Try/catch', '调试'],
      language: 'zh' as const
    },
    {
      title: '阮一峰的网络日志 - JavaScript错误处理机制',
      url: 'https://www.ruanyifeng.com/blog/2015/05/async.html',
      duration: '25分钟',
      level: '中级',
      topics: ['异步编程', '错误处理', 'Promise'],
      language: 'zh' as const
    },
    {
      title: '掘金 - TypeScript 最佳实践',
      url: 'https://juejin.cn/post/6844903981959979022',
      fallbackUrl: 'https://www.typescriptlang.org/zh/',
      duration: '30分钟',
      level: '高级',
      topics: ['TypeScript', '类型安全', '最佳实践'],
      language: 'zh' as const
    },
    // Japanese Resources
    {
      title: 'MDN Web Docs - エラー処理',
      url: 'https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15分',
      level: '初級',
      topics: ['エラー処理', 'Try/catch', 'デバッグ'],
      language: 'ja' as const
    },
    {
      title: 'Qiita - TypeScript入門',
      url: 'https://qiita.com/tags/typescript',
      duration: '様々',
      level: '中級',
      topics: ['TypeScript', '型安全', 'JavaScript'],
      language: 'ja' as const
    },
    {
      title: 'Zenn - セキュアコーディング',
      url: 'https://zenn.dev/topics/security',
      duration: '20分',
      level: '中級',
      topics: ['セキュリティ', '脆弱性対策', 'ベストプラクティス'],
      language: 'ja' as const
    },
    // German Resources
    {
      title: 'MDN Web Docs - Fehlerbehandlung',
      url: 'https://developer.mozilla.org/de/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15 Minuten',
      level: 'Anfänger',
      topics: ['Fehlerbehandlung', 'Try/catch', 'Debugging'],
      language: 'de' as const
    },
    {
      title: 'JavaScript-Tutorial.dev',
      url: 'https://javascript-tutorial.dev/',
      duration: 'Selbststudium',
      level: 'Alle Stufen',
      topics: ['JavaScript', 'TypeScript', 'Best Practices'],
      language: 'de' as const
    },
    // French Resources
    {
      title: 'MDN Web Docs - Gestion des erreurs',
      url: 'https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15 minutes',
      level: 'Débutant',
      topics: ['Gestion des erreurs', 'Try/catch', 'Débogage'],
      language: 'fr' as const
    },
    {
      title: 'Grafikart - Formation JavaScript',
      url: 'https://grafikart.fr/formations/javascript',
      duration: 'Variable',
      level: 'Intermédiaire',
      topics: ['JavaScript', 'ES6+', 'Bonnes pratiques'],
      language: 'fr' as const
    },
    {
      title: 'OpenClassrooms - Sécurisez vos applications',
      url: 'https://openclassrooms.com/fr/courses/6179306-securisez-vos-applications',
      fallbackUrl: 'https://openclassrooms.com/fr/courses',
      duration: '10 heures',
      level: 'Intermédiaire',
      topics: ['Sécurité', 'Validation', 'OWASP'],
      language: 'fr' as const
    },
    // Korean Resources
    {
      title: 'MDN Web Docs - 에러 처리',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15분',
      level: '초급',
      topics: ['에러 처리', 'Try/catch', '디버깅'],
      language: 'ko' as const
    },
    {
      title: '인프런 - JavaScript 핵심 개념',
      url: 'https://www.inflearn.com/course/핵심개념-javascript-flow',
      fallbackUrl: 'https://www.inflearn.com/courses?s=javascript',
      duration: '5시간',
      level: '중급',
      topics: ['JavaScript', '비동기', '에러 처리'],
      language: 'ko' as const
    },
    // Portuguese Resources
    {
      title: 'MDN Web Docs - Controle de fluxo e manipulação de erro',
      url: 'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide/Control_flow_and_error_handling',
      duration: '15 minutos',
      level: 'Iniciante',
      topics: ['Tratamento de erros', 'Try/catch', 'Depuração'],
      language: 'pt' as const
    },
    {
      title: 'DevMedia - Validação de Dados em JavaScript',
      url: 'https://www.devmedia.com.br/validacao-de-dados-em-javascript/41243',
      fallbackUrl: 'https://www.devmedia.com.br/javascript/',
      duration: '20 minutos',
      level: 'Intermediário',
      topics: ['Validação', 'JavaScript', 'Segurança'],
      language: 'pt' as const
    },
    {
      title: 'Alura - TypeScript: Evoluindo seu JavaScript',
      url: 'https://www.alura.com.br/curso-online-typescript-evoluindo-javascript',
      duration: '8 horas',
      level: 'Intermediário',
      topics: ['TypeScript', 'Tipagem', 'JavaScript'],
      language: 'pt' as const
    },
    // Hindi Resources
    {
      title: 'MDN Web Docs - त्रुटि हैंडलिंग',
      url: 'https://developer.mozilla.org/hi-IN/',
      fallbackUrl: 'https://www.w3schools.com/js/js_errors.asp',
      duration: '15 मिनट',
      level: 'शुरुआती',
      topics: ['त्रुटि हैंडलिंग', 'JavaScript', 'डिबगिंग'],
      language: 'hi' as const
    },
    {
      title: 'CodeWithHarry - JavaScript Tutorial in Hindi',
      url: 'https://www.codewithharry.com/videos/javascript-tutorials-in-hindi-1',
      duration: 'स्व-गति',
      level: 'सभी स्तर',
      topics: ['JavaScript', 'वेब विकास', 'प्रोग्रामिंग'],
      language: 'hi' as const
    }
  ];

  /**
   * Validate if a URL is accessible
   */
  async validateUrl(url: string): Promise<boolean> {
    // Check cache first
    if (this.validatedLinks.has(url)) {
      return this.validatedLinks.get(url)!;
    }

    try {
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status < 400,
        headers: {
          'User-Agent': 'CodeQual-Educational-Validator/1.0'
        }
      });
      
      const isValid = response.status < 400;
      this.validatedLinks.set(url, isValid);
      return isValid;
    } catch (error) {
      this.logger.warn(`Failed to validate URL ${url}:`, error as Error);
      this.validatedLinks.set(url, false);
      return false;
    }
  }

  /**
   * Get validated educational resources for a specific topic and language
   */
  async getValidatedResources(
    topics: string[],
    language: SupportedLanguage = 'en',
    limit = 5
  ): Promise<EducationalResource[]> {
    // Filter resources by language and topic relevance
    const relevantResources = this.resources
      .filter(r => r.language === language)
      .filter(r => 
        topics.some(topic => 
          r.topics.some(resourceTopic => 
            resourceTopic.toLowerCase().includes(topic.toLowerCase()) ||
            topic.toLowerCase().includes(resourceTopic.toLowerCase())
          )
        )
      )
      .slice(0, limit * 2); // Get extra in case some are invalid

    // Validate URLs in parallel
    const validationPromises = relevantResources.map(async (resource) => {
      const isMainValid = await this.validateUrl(resource.url);
      
      if (isMainValid) {
        return { ...resource, isAccessible: true };
      }
      
      // Try fallback URL if main fails
      if (resource.fallbackUrl) {
        const isFallbackValid = await this.validateUrl(resource.fallbackUrl);
        if (isFallbackValid) {
          return {
            ...resource,
            url: resource.fallbackUrl,
            isAccessible: true
          };
        }
      }
      
      return { ...resource, isAccessible: false };
    });

    const validatedResources = await Promise.all(validationPromises);
    
    // Return only accessible resources, limited to requested count
    return validatedResources
      .filter(r => r.isAccessible)
      .slice(0, limit);
  }

  /**
   * Get fallback resources when specific topics don't have enough valid links
   */
  getFallbackResources(language: SupportedLanguage = 'en'): EducationalResource[] {
    const fallbacks: Record<string, EducationalResource[]> = {
      en: [
        {
          title: 'FreeCodeCamp - JavaScript Algorithms and Data Structures',
          url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
          duration: 'Self-paced',
          level: 'Beginner to Advanced',
          topics: ['JavaScript', 'Algorithms', 'Best practices'],
          language: 'en' as const,
          isAccessible: true
        },
        {
          title: 'JavaScript.info - The Modern JavaScript Tutorial',
          url: 'https://javascript.info/',
          duration: 'Self-paced',
          level: 'All levels',
          topics: ['JavaScript', 'ES6+', 'Best practices'],
          language: 'en' as const,
          isAccessible: true
        }
      ],
      ru: [
        {
          title: 'Современный учебник JavaScript',
          url: 'https://learn.javascript.ru/',
          duration: 'Свободный темп',
          level: 'Все уровни',
          topics: ['JavaScript', 'ES6+', 'Лучшие практики'],
          language: 'ru' as const,
          isAccessible: true
        },
        {
          title: 'Proglib - Подборка материалов по TypeScript',
          url: 'https://proglib.io/p/typescript-learning',
          duration: 'Различная',
          level: 'Средний',
          topics: ['TypeScript', 'Типизация', 'Практика'],
          language: 'ru' as const,
          isAccessible: true
        }
      ],
      es: [
        {
          title: 'FreeCodeCamp Español',
          url: 'https://www.freecodecamp.org/espanol/',
          duration: 'Ritmo propio',
          level: 'Todos los niveles',
          topics: ['JavaScript', 'Desarrollo web', 'Programación'],
          language: 'es' as const,
          isAccessible: true
        },
        {
          title: 'Platzi - Cursos de Desarrollo',
          url: 'https://platzi.com/categorias/desarrollo/',
          duration: 'Variable',
          level: 'Todos los niveles',
          topics: ['JavaScript', 'TypeScript', 'Seguridad'],
          language: 'es' as const,
          isAccessible: true
        }
      ],
      zh: [
        {
          title: '慕课网 - 前端开发',
          url: 'https://www.imooc.com/course/list?c=javascript',
          duration: '自定义',
          level: '所有级别',
          topics: ['JavaScript', 'TypeScript', '前端'],
          language: 'zh' as const,
          isAccessible: true
        },
        {
          title: '腾讯课堂 - Web开发',
          url: 'https://ke.qq.com/',
          duration: '变化',
          level: '所有级别',
          topics: ['编程', 'JavaScript', '安全'],
          language: 'zh' as const,
          isAccessible: true
        }
      ],
      ja: [
        {
          title: 'Progate - JavaScript学習',
          url: 'https://prog-8.com/languages/javascript',
          duration: '自分のペース',
          level: '全レベル',
          topics: ['JavaScript', 'プログラミング', 'Web開発'],
          language: 'ja' as const,
          isAccessible: true
        },
        {
          title: 'Udemy Japan - プログラミングコース',
          url: 'https://www.udemy.com/jp/topic/javascript/',
          duration: '可変',
          level: '全レベル',
          topics: ['JavaScript', 'TypeScript', 'セキュリティ'],
          language: 'ja' as const,
          isAccessible: true
        }
      ],
      de: [
        {
          title: 'Codecademy Deutschland',
          url: 'https://www.codecademy.com/catalog/language/javascript',
          duration: 'Selbststudium',
          level: 'Alle Stufen',
          topics: ['JavaScript', 'Web-Entwicklung', 'Programmierung'],
          language: 'de' as const,
          isAccessible: true
        }
      ],
      fr: [
        {
          title: 'Le Wagon - Formation développement web',
          url: 'https://www.lewagon.com/fr',
          duration: 'Variable',
          level: 'Tous niveaux',
          topics: ['JavaScript', 'Développement web', 'Sécurité'],
          language: 'fr' as const,
          isAccessible: true
        }
      ],
      ko: [
        {
          title: '생활코딩 - JavaScript',
          url: 'https://opentutorials.org/course/743',
          duration: '자유',
          level: '모든 수준',
          topics: ['JavaScript', '웹 개발', '프로그래밍'],
          language: 'ko' as const,
          isAccessible: true
        }
      ],
      pt: [
        {
          title: 'Rocketseat - Discover',
          url: 'https://www.rocketseat.com.br/discover',
          duration: 'Gratuito',
          level: 'Iniciante',
          topics: ['JavaScript', 'Desenvolvimento web', 'Programação'],
          language: 'pt' as const,
          isAccessible: true
        }
      ],
      hi: [
        {
          title: 'GeeksforGeeks - JavaScript Tutorial',
          url: 'https://www.geeksforgeeks.org/javascript-tutorial/',
          duration: 'स्व-गति',
          level: 'सभी स्तर',
          topics: ['JavaScript', 'वेब विकास', 'प्रोग्रामिंग'],
          language: 'hi' as const,
          isAccessible: true
        }
      ]
    };

    return fallbacks[language] || fallbacks.en;
  }

  /**
   * Generate educational content section for reports
   */
  async generateEducationalSection(
    findings: string[],
    language: SupportedLanguage = 'en'
  ): Promise<{
    resources: EducationalResource[];
    fallbackMessage?: string;
  }> {
    // Extract topics from findings
    const topics = this.extractTopicsFromFindings(findings);
    
    // Get validated resources
    const validResources = await this.getValidatedResources(topics, language);
    
    // If not enough valid resources, add fallbacks
    if (validResources.length < 3) {
      const fallbacks = this.getFallbackResources(language);
      const combined = [...validResources, ...fallbacks.slice(0, 3 - validResources.length)];
      
      return {
        resources: combined,
        fallbackMessage: language === 'en' 
          ? 'Some specific resources were unavailable. Showing general programming resources.'
          : 'Некоторые специализированные ресурсы недоступны. Показаны общие ресурсы по программированию.'
      };
    }
    
    return { resources: validResources };
  }

  /**
   * Extract learning topics from analysis findings
   */
  private extractTopicsFromFindings(findings: string[]): string[] {
    const topicKeywords = {
      security: ['security', 'vulnerability', 'validation', 'безопасность', 'уязвимость'],
      errorHandling: ['error', 'exception', 'try-catch', 'ошибок', 'исключени'],
      typescript: ['typescript', 'types', 'typing', 'типизация', 'типы'],
      testing: ['test', 'coverage', 'тест', 'покрытие'],
      performance: ['performance', 'optimization', 'производительность', 'оптимизация'],
      architecture: ['pattern', 'architecture', 'design', 'паттерн', 'архитектур']
    };

    const detectedTopics = new Set<string>();

    findings.forEach(finding => {
      const lowerFinding = finding.toLowerCase();
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => lowerFinding.includes(keyword))) {
          detectedTopics.add(topic);
        }
      });
    });

    return Array.from(detectedTopics);
  }
}
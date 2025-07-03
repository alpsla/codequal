export const testBilingualReportData = {
  // PR Metadata
  pr_number: '1234',
  repository_name: 'CodeQual API',
  repository_full_name: 'codequal/api',
  primary_language: 'TypeScript',
  files_changed: '12',
  lines_added: '245',
  lines_removed: '89',
  
  // Approval Decision
  approval_status_class: 'conditional',
  approval_icon: '⚠️',
  approval_status: 'Conditionally Approved',
  approval_status_ru: 'Условно одобрено',
  approval_message: 'This PR can be merged after addressing 2 blocking issues',
  approval_message_ru: 'Этот PR может быть смержен после исправления 2 блокирующих проблем',
  
  blocking_issues_title: 'Blocking Issues (Must Fix)',
  blocking_issues_title_ru: 'Блокирующие проблемы (Обязательны к исправлению)',
  blocking_issues: [
    {
      icon: '🔴',
      severity: 'CRITICAL',
      severity_ru: 'КРИТИЧНО',
      description: 'SQL injection vulnerability in user query endpoint (src/routes/users.ts:45)',
      description_ru: 'Уязвимость SQL-инъекции в эндпоинте запроса пользователей (src/routes/users.ts:45)'
    },
    {
      icon: '🟠',
      severity: 'HIGH',
      severity_ru: 'ВЫСОКИЙ',
      description: 'Missing rate limiting on authentication endpoints (src/routes/auth.ts:23)',
      description_ru: 'Отсутствует ограничение скорости на эндпоинтах аутентификации (src/routes/auth.ts:23)'
    }
  ],
  
  positive_findings_title: 'Positive Aspects',
  positive_findings_title_ru: 'Положительные аспекты',
  positive_findings: [
    {
      description: 'Good error handling implementation',
      description_ru: 'Хорошая реализация обработки ошибок'
    },
    {
      description: 'Proper input validation in most endpoints',
      description_ru: 'Правильная валидация входных данных в большинстве эндпоинтов'
    },
    {
      description: 'Well-structured middleware architecture',
      description_ru: 'Хорошо структурированная архитектура middleware'
    }
  ],
  
  // Current PR Issues
  pr_issues_count: '3',
  has_pr_issues: true,
  severity_class: 'critical',
  severity: 'CRITICAL',
  severity_ru: 'КРИТИЧНО',
  title: 'SQL Injection Vulnerability',
  title_ru: 'Уязвимость SQL-инъекции',
  file_path: 'src/routes/users.ts',
  line_number: '45',
  description: 'User input is directly concatenated into SQL query without sanitization',
  description_ru: 'Пользовательский ввод напрямую конкатенируется в SQL-запрос без санитизации',
  code_snippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
  recommendation: 'Use parameterized queries or an ORM like Prisma/TypeORM to prevent SQL injection',
  recommendation_ru: 'Используйте параметризованные запросы или ORM как Prisma/TypeORM для предотвращения SQL-инъекций',
  
  // Repository Issues
  total_repo_issues: '3',
  high_priority_repo_issues: [
    {
      severity_class: 'high',
      severity: 'HIGH',
      severity_ru: 'ВЫСОКИЙ',
      title: 'Outdated Dependencies with Security Vulnerabilities',
      title_ru: 'Устаревшие зависимости с уязвимостями безопасности',
      description: '3 dependencies have known security vulnerabilities: express@4.17.1, jsonwebtoken@8.5.1, bcrypt@3.0.6',
      description_ru: '3 зависимости имеют известные уязвимости безопасности: express@4.17.1, jsonwebtoken@8.5.1, bcrypt@3.0.6',
      code_snippet: `{
  "dependencies": {
    "express": "4.17.1",      // 2 known vulnerabilities
    "jsonwebtoken": "8.5.1",  // 1 critical vulnerability
    "bcrypt": "3.0.6"         // Timing attack vulnerability
  }
}`,
      impact_color: '#e74c3c',
      degradation_points: '-10',
      fix_points: '+10'
    }
  ],
  
  has_lower_priority_issues: true,
  lower_priority_repo_issues: [
    {
      severity_class: 'medium',
      severity: 'MEDIUM',
      severity_ru: 'СРЕДНИЙ',
      title: 'Low Test Coverage',
      title_ru: 'Низкое покрытие тестами',
      description: 'Current test coverage is only 42%, missing critical paths',
      description_ru: 'Текущее покрытие тестами составляет всего 42%, критические пути не покрыты',
      code_snippet: `Coverage Report:
-----------------
File            | % Stmts | % Branch | % Funcs | % Lines |
routes/users.ts |   35.71 |    25.00 |   40.00 |   35.71 |
routes/auth.ts  |   28.57 |    20.00 |   33.33 |   28.57 |`,
      impact_color: '#f39c12',
      degradation_points: '-5',
      fix_points: '+5'
    },
    {
      severity_class: 'low',
      severity: 'LOW',
      severity_ru: 'НИЗКИЙ',
      title: 'Missing API Documentation',
      title_ru: 'Отсутствует документация API',
      description: 'Several endpoints lack proper documentation',
      description_ru: 'Несколько эндпоинтов не имеют надлежащей документации',
      code_snippet: `// Missing documentation for:
POST /api/users/bulk-update
DELETE /api/users/:id/sessions
PUT /api/auth/refresh`,
      impact_color: '#3498db',
      degradation_points: '-3',
      fix_points: '+3'
    }
  ],
  
  // Score
  overall_score: '30',
  score_message: 'Score reduced due to critical security issues. Fix them to improve your rating.',
  score_message_ru: 'Рейтинг снижен из-за критических проблем безопасности. Исправьте их для улучшения рейтинга.',
  
  // Skills
  skill_categories: [
    {
      icon: '🔒',
      name: 'Security Practices',
      name_ru: 'Практики безопасности',
      current_level: '25',
      skill_color: '#e74c3c',
      skill_message: 'Critical security vulnerabilities found. Immediate improvement needed. -20 points for SQL injection, -15 points for missing rate limiting.',
      skill_message_ru: 'Найдены критические уязвимости безопасности. Требуется немедленное улучшение. -20 баллов за SQL-инъекцию, -15 баллов за отсутствие ограничения скорости.'
    },
    {
      icon: '🏗️',
      name: 'Code Architecture',
      name_ru: 'Архитектура кода',
      current_level: '60',
      skill_color: '#f39c12',
      skill_message: 'Good structure but missing security layers. -5 points for hardcoded credentials.',
      skill_message_ru: 'Хорошая структура, но отсутствуют слои безопасности. -5 баллов за захардкоженные учетные данные.'
    },
    {
      icon: '🧪',
      name: 'Testing',
      name_ru: 'Тестирование',
      current_level: '35',
      skill_color: '#e74c3c',
      skill_message: 'Low test coverage. Critical paths lack tests. -15 points for missing security tests.',
      skill_message_ru: 'Низкое покрытие тестами. Критические пути не покрыты тестами. -15 баллов за отсутствие тестов безопасности.'
    }
  ],
  
  // Educational Resources
  educational_modules: [
    {
      title: 'Web Application Security Fundamentals',
      title_ru: 'Основы безопасности веб-приложений',
      duration: '3',
      level: 'Intermediate',
      level_ru: 'Средний',
      description: 'Learn essential security practices including SQL injection prevention, authentication security, and rate limiting.',
      description_ru: 'Изучите основные практики безопасности включая предотвращение SQL-инъекций, безопасность аутентификации и ограничение скорости.',
      url: 'https://learn.codequal.com/security-fundamentals'
    },
    {
      title: 'Secure Coding Practices',
      title_ru: 'Практики безопасного кодирования',
      duration: '2',
      level: 'Intermediate',
      level_ru: 'Средний',
      description: 'Best practices for writing secure code including input validation, parameterized queries, and environment variables.',
      description_ru: 'Лучшие практики написания безопасного кода включая валидацию входных данных, параметризованные запросы и переменные окружения.',
      url: 'https://learn.codequal.com/secure-coding'
    }
  ],
  
  // PR Comment
  pr_comment_text: `## Code Review Summary

⚠️ **Conditionally Approved** - Please address blocking issues before merging.

### 🚨 Blocking Issues:
1. **CRITICAL**: SQL injection vulnerability in user query endpoint
2. **HIGH**: Missing rate limiting on authentication endpoints

### ✅ Positive Aspects:
- Good error handling implementation
- Proper input validation in most endpoints
- Well-structured middleware architecture

### 📊 Code Quality Score: 30/100

Please fix the blocking issues and the PR will be ready to merge.`,
  
  pr_comment_text_ru: `## Результаты проверки кода

⚠️ **Условно одобрено** - Пожалуйста, исправьте блокирующие проблемы перед слиянием.

### 🚨 Блокирующие проблемы:
1. **КРИТИЧНО**: Уязвимость SQL-инъекции в эндпоинте запроса пользователей
2. **ВЫСОКИЙ**: Отсутствует ограничение скорости на эндпоинтах аутентификации

### ✅ Положительные аспекты:
- Хорошая реализация обработки ошибок
- Правильная валидация входных данных в большинстве эндпоинтов
- Хорошо структурированная архитектура middleware

### 📊 Оценка качества кода: 30/100

Пожалуйста, исправьте блокирующие проблемы, и PR будет готов к слиянию.`,
  
  // Footer
  report_timestamp: new Date().toLocaleString(),
  analysis_id: `analysis-${Date.now()}`
};
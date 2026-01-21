/**
 * Educational Resources Service
 *
 * Generates educational content and learning paths for developers.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 *
 * BUG-090 FIX (2025-12-12): Made language-aware - no more hardcoded Java content
 * ENHANCEMENT (2025-12-14): Added proper documentation links instead of Google searches
 */

import { EnrichedIssue } from './types';
import { getUserFriendlyTitle } from './formatter-utils';
import { getCuratedResourcesForRule } from './ai-enrichment';
import {
  getDocumentationLinks,
  getFallbackDocumentation,
  formatDocumentationLinksAsMarkdown,
  TOOL_DOCUMENTATION  // SESSION 77: For fallback to tool reference pages
} from './documentation-links';

/**
 * Language-specific educational resources
 * Maps language to curated resources for each category
 */
interface LanguageResources {
  generalBooks: { title: string; url: string }[];
  security: { phase1: string[]; phase2: string[] };
  performance: { phase1: string[]; phase2: string[] };
  architecture: { phase1: string[]; phase2: string[] };
  dependencies: { phase1: string[]; phase2: string[] };
  codeQuality: { phase1: string[]; phase2: string[] };
  additionalResources: { title: string; url: string }[];
  phase2Training: string[];
}

const LANGUAGE_RESOURCES: Record<string, LanguageResources> = {
  python: {
    generalBooks: [
      { title: 'Clean Code Principles', url: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/' },
      { title: 'Fluent Python', url: 'https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/' },
      { title: 'Software Architecture Fundamentals', url: 'https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/' }
    ],
    security: {
      phase1: [
        '- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top security risks and mitigations',
        '- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference',
        '- [🎯 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses',
        '- [📖 Python Security Best Practices](https://snyk.io/blog/python-security-best-practices-cheat-sheet/) - Snyk guidelines'
      ],
      phase2: [
        '- [🛡️ SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)',
        '- [🔐 Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)',
        '- [🔑 Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)',
        '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive labs'
      ]
    },
    performance: {
      phase1: [
        '- [⚡ High Performance Python](https://www.oreilly.com/library/view/high-performance-python/9781492055013/) - Official O\'Reilly guide',
        '- [📖 Python Concurrency](https://realpython.com/python-concurrency/) - Real Python guide',
        '- [🔧 cProfile Guide](https://docs.python.org/3/library/profile.html) - Built-in profiling',
        '- [📊 Scalene Profiler](https://github.com/plasma-umass/scalene) - CPU/Memory profiling'
      ],
      phase2: [
        '- [🎯 Asyncio Deep Dive](https://realpython.com/async-io-python/) - Asynchronous programming',
        '- [📚 Effective Python](https://effectivepython.com/) - Brett Slatkin',
        '- [🔬 Memory Optimization](https://realpython.com/python-memory-management/) - Memory management guide'
      ]
    },
    architecture: {
      phase1: [
        '- [🏗️ Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Robert C. Martin',
        '- [🎯 SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) - OOD fundamentals',
        '- [📚 Design Patterns](https://refactoring.guru/design-patterns) - Gang of Four patterns',
        '- [🔧 Python Design Patterns](https://python-patterns.guide/) - Python-specific patterns'
      ],
      phase2: [
        '- [🎨 Microservices Patterns](https://microservices.io/patterns/) - Chris Richardson',
        '- [📖 Domain-Driven Design](https://www.domainlanguage.com/ddd/) - Eric Evans',
        '- [🏛️ Architecture Patterns with Python](https://www.oreilly.com/library/view/architecture-patterns-with/9781492052197/)'
      ]
    },
    dependencies: {
      phase1: [
        '- [📦 pip Documentation](https://pip.pypa.io/en/stable/) - Official pip guide',
        '- [🛡️ Safety](https://pypi.org/project/safety/) - Vulnerability scanning for Python',
        '- [🔄 Semantic Versioning](https://semver.org/) - Version numbering best practices',
        '- [🔍 Snyk Learn](https://learn.snyk.io/) - Security vulnerability education'
      ],
      phase2: [
        '- [🚨 CVE Database](https://cve.mitre.org/) - Known vulnerabilities',
        '- [📊 National Vulnerability Database](https://nvd.nist.gov/) - NIST CVE details',
        '- [🔒 Supply Chain Security](https://slsa.dev/) - Software supply chain levels'
      ]
    },
    codeQuality: {
      phase1: [
        '- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin',
        '- [📏 Refactoring Guide](https://refactoring.guru/refactoring) - Martin Fowler techniques',
        '- [🔧 Code Smells](https://refactoring.guru/refactoring/smells) - Common anti-patterns',
        '- [📖 The Pragmatic Programmer](https://pragprog.com/titles/tpp20/) - Best practices'
      ],
      phase2: [
        '- [✅ Test-Driven Development](https://www.oreilly.com/library/view/test-driven-development/0321146530/) - Kent Beck',
        '- [🎯 Python Testing with pytest](https://pragprog.com/titles/bopytest2/) - Brian Okken',
        '- [📊 Pylint Documentation](https://pylint.pycqa.org/) - Static analysis'
      ]
    },
    additionalResources: [
      { title: 'Real Python', url: 'https://realpython.com/' },
      { title: 'Python Documentation', url: 'https://docs.python.org/3/' },
      { title: 'PyPI - Python Package Index', url: 'https://pypi.org/' },
      { title: 'Python Weekly', url: 'https://www.pythonweekly.com/' }
    ],
    phase2Training: [
      '**Security (Week 1-2):**',
      '- [📚 Bandit Security Linter](https://bandit.readthedocs.io/en/latest/)',
      '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security)',
      '',
      '**Performance (Week 3-4):**',
      '- [📚 Python Performance Tips](https://wiki.python.org/moin/PythonSpeed/PerformanceTips)',
      '- [📖 High Performance Python](https://www.oreilly.com/library/view/high-performance-python/9781492055013/)',
      '',
      '**Code Quality (Month 2):**',
      '- [📖 PEP 8 Style Guide](https://peps.python.org/pep-0008/)',
      '- [📚 Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)'
    ]
  },
  java: {
    generalBooks: [
      { title: 'Clean Code Principles', url: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/' },
      { title: 'Effective Java', url: 'https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/' },
      { title: 'Software Architecture Fundamentals', url: 'https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/' }
    ],
    security: {
      phase1: [
        '- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top security risks and mitigations',
        '- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference',
        '- [🎯 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses',
        '- [📖 Secure Coding in Java](https://www.oracle.com/java/technologies/javase/seccodeguide.html) - Oracle guidelines'
      ],
      phase2: [
        '- [🛡️ SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)',
        '- [🔐 Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)',
        '- [🔑 Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)',
        '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive labs'
      ]
    },
    performance: {
      phase1: [
        '- [⚡ Java Performance Tuning Guide](https://www.oracle.com/technical-resources/articles/javase/perftuning.html) - Official Oracle guide',
        '- [📖 Java Concurrency in Practice](https://jcip.net/) - Brian Goetz (essential reading)',
        '- [🔧 JVM Performance Optimization](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/) - GC tuning',
        '- [📊 Profiling with JMH](https://openjdk.java.net/projects/code-tools/jmh/) - Microbenchmarking'
      ],
      phase2: [
        '- [🎯 Lock-Free Programming](https://mechanical-sympathy.blogspot.com/) - Martin Thompson\'s blog',
        '- [📚 High Performance Java Persistence](https://vladmihalcea.com/books/high-performance-java-persistence/) - Vlad Mihalcea',
        '- [🔬 Memory Management Deep Dive](https://www.baeldung.com/java-memory-management-interview-questions)'
      ]
    },
    architecture: {
      phase1: [
        '- [🏗️ Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Robert C. Martin',
        '- [🎯 SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) - OOD fundamentals',
        '- [📚 Design Patterns](https://refactoring.guru/design-patterns) - Gang of Four patterns',
        '- [🔧 Effective Java](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/) - Joshua Bloch'
      ],
      phase2: [
        '- [🎨 Microservices Patterns](https://microservices.io/patterns/) - Chris Richardson',
        '- [📖 Domain-Driven Design](https://www.domainlanguage.com/ddd/) - Eric Evans',
        '- [🏛️ Software Architecture Fundamentals](https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/)'
      ]
    },
    dependencies: {
      phase1: [
        '- [📦 Maven Dependency Management](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) - Official guide',
        '- [🛡️ OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) - Vulnerability scanning',
        '- [🔄 Semantic Versioning](https://semver.org/) - Version numbering best practices',
        '- [🔍 Snyk Learn](https://learn.snyk.io/) - Security vulnerability education'
      ],
      phase2: [
        '- [🚨 CVE Database](https://cve.mitre.org/) - Known vulnerabilities',
        '- [📊 National Vulnerability Database](https://nvd.nist.gov/) - NIST CVE details',
        '- [🔒 Supply Chain Security](https://slsa.dev/) - Software supply chain levels'
      ]
    },
    codeQuality: {
      phase1: [
        '- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin',
        '- [📏 Refactoring Guide](https://refactoring.guru/refactoring) - Martin Fowler techniques',
        '- [🔧 Code Smells](https://refactoring.guru/refactoring/smells) - Common anti-patterns',
        '- [📖 The Pragmatic Programmer](https://pragprog.com/titles/tpp20/) - Best practices'
      ],
      phase2: [
        '- [✅ Test-Driven Development](https://www.oreilly.com/library/view/test-driven-development/0321146530/) - Kent Beck',
        '- [🎯 Working Effectively with Legacy Code](https://www.oreilly.com/library/view/working-effectively-with/0131177052/) - Michael Feathers',
        '- [📊 Code Quality Metrics](https://www.baeldung.com/java-static-code-analysis-tutorial) - Static analysis'
      ]
    },
    additionalResources: [
      { title: 'Pluralsight', url: 'https://www.pluralsight.com/' },
      { title: 'Baeldung', url: 'https://www.baeldung.com/' },
      { title: 'Java Code Geeks', url: 'https://www.javacodegeeks.com/' },
      { title: 'DZone Java Zone', url: 'https://dzone.com/java-jdk-development-tutorials-tools-news' }
    ],
    phase2Training: [
      '**Security (Week 1-2):**',
      '- [📚 SEI CERT Java Coding Standard](https://wiki.sei.cmu.edu/confluence/display/java/SEI+CERT+Oracle+Coding+Standard+for+Java)',
      '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security)',
      '',
      '**Performance (Week 3-4):**',
      '- [📚 Java Concurrency - Oracle](https://docs.oracle.com/javase/tutorial/essential/concurrency/)',
      '- [📖 Java Concurrency in Practice](https://jcip.net/)',
      '',
      '**Code Quality (Month 2):**',
      '- [📖 Clean Code Principles](https://martinfowler.com/bliki/CleanCode.html)',
      '- [📚 Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)'
    ]
  },
  typescript: {
    generalBooks: [
      { title: 'Clean Code Principles', url: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/' },
      { title: 'Effective TypeScript', url: 'https://effectivetypescript.com/' },
      { title: 'Software Architecture Fundamentals', url: 'https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/' }
    ],
    security: {
      phase1: [
        '- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top security risks and mitigations',
        '- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference',
        '- [🎯 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses',
        '- [📖 Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/) - Official guidelines'
      ],
      phase2: [
        '- [🛡️ SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)',
        '- [🔐 XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)',
        '- [🔑 Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)',
        '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive labs'
      ]
    },
    performance: {
      phase1: [
        '- [⚡ Node.js Performance Guide](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/) - Official guide',
        '- [📖 JavaScript Performance](https://developer.chrome.com/docs/devtools/performance/) - Chrome DevTools',
        '- [🔧 V8 Performance Tips](https://v8.dev/blog) - V8 engine blog',
        '- [📊 Clinic.js](https://clinicjs.org/) - Node.js performance diagnostics'
      ],
      phase2: [
        '- [🎯 Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) - Parallel processing',
        '- [📚 High Performance JavaScript](https://www.oreilly.com/library/view/high-performance-javascript/9781449382308/) - Nicholas Zakas',
        '- [🔬 Memory Leaks](https://developer.chrome.com/docs/devtools/memory-problems/) - Debugging guide'
      ]
    },
    architecture: {
      phase1: [
        '- [🏗️ Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Robert C. Martin',
        '- [🎯 SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) - OOD fundamentals',
        '- [📚 Design Patterns](https://refactoring.guru/design-patterns) - Gang of Four patterns',
        '- [🔧 TypeScript Design Patterns](https://www.patterns.dev/vanilla/introduction) - Modern patterns'
      ],
      phase2: [
        '- [🎨 Microservices Patterns](https://microservices.io/patterns/) - Chris Richardson',
        '- [📖 Domain-Driven Design](https://www.domainlanguage.com/ddd/) - Eric Evans',
        '- [🏛️ Node.js Architecture Best Practices](https://github.com/goldbergyoni/nodebestpractices)'
      ]
    },
    dependencies: {
      phase1: [
        '- [📦 npm Documentation](https://docs.npmjs.com/) - Official guide',
        '- [🛡️ npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Vulnerability scanning',
        '- [🔄 Semantic Versioning](https://semver.org/) - Version numbering best practices',
        '- [🔍 Snyk Learn](https://learn.snyk.io/) - Security vulnerability education'
      ],
      phase2: [
        '- [🚨 CVE Database](https://cve.mitre.org/) - Known vulnerabilities',
        '- [📊 National Vulnerability Database](https://nvd.nist.gov/) - NIST CVE details',
        '- [🔒 Supply Chain Security](https://slsa.dev/) - Software supply chain levels'
      ]
    },
    codeQuality: {
      phase1: [
        '- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin',
        '- [📏 Refactoring Guide](https://refactoring.guru/refactoring) - Martin Fowler techniques',
        '- [🔧 Code Smells](https://refactoring.guru/refactoring/smells) - Common anti-patterns',
        '- [📖 The Pragmatic Programmer](https://pragprog.com/titles/tpp20/) - Best practices'
      ],
      phase2: [
        '- [✅ Test-Driven Development](https://www.oreilly.com/library/view/test-driven-development/0321146530/) - Kent Beck',
        '- [🎯 Testing JavaScript](https://testingjavascript.com/) - Kent C. Dodds',
        '- [📊 ESLint Documentation](https://eslint.org/docs/latest/) - Static analysis'
      ]
    },
    additionalResources: [
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/' },
      { title: 'Node.js Best Practices', url: 'https://github.com/goldbergyoni/nodebestpractices' },
      { title: 'JavaScript Weekly', url: 'https://javascriptweekly.com/' },
      { title: 'TypeScript Weekly', url: 'https://typescript-weekly.com/' }
    ],
    phase2Training: [
      '**Security (Week 1-2):**',
      '- [📚 OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)',
      '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security)',
      '',
      '**Performance (Week 3-4):**',
      '- [📚 Node.js Performance Monitoring](https://nodejs.org/en/docs/guides/diagnostics/)',
      '- [📖 JavaScript Performance](https://developer.chrome.com/docs/devtools/performance/)',
      '',
      '**Code Quality (Month 2):**',
      '- [📖 TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)',
      '- [📚 Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)'
    ]
  },
  go: {
    generalBooks: [
      { title: 'Clean Code Principles', url: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/' },
      { title: 'The Go Programming Language', url: 'https://www.gopl.io/' },
      { title: 'Software Architecture Fundamentals', url: 'https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/' }
    ],
    security: {
      phase1: [
        '- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top security risks and mitigations',
        '- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference',
        '- [🎯 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses',
        '- [📖 Go Security Best Practices](https://go.dev/doc/security/best-practices) - Official guidelines'
      ],
      phase2: [
        '- [🛡️ SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)',
        '- [🔐 Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)',
        '- [🔑 Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)',
        '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive labs'
      ]
    },
    performance: {
      phase1: [
        '- [⚡ Go Performance Guide](https://go.dev/doc/diagnostics) - Official diagnostics',
        '- [📖 Go Concurrency Patterns](https://go.dev/blog/pipelines) - Official blog',
        '- [🔧 pprof Profiling](https://go.dev/blog/pprof) - Built-in profiling',
        '- [📊 Go Benchmarking](https://pkg.go.dev/testing#hdr-Benchmarks) - Testing package'
      ],
      phase2: [
        '- [🎯 Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941294/) - Katherine Cox-Buday',
        '- [📚 Go Performance Book](https://github.com/dgryski/go-perfbook) - Community guide',
        '- [🔬 Memory Optimization](https://go.dev/doc/gc-guide) - GC tuning guide'
      ]
    },
    architecture: {
      phase1: [
        '- [🏗️ Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Robert C. Martin',
        '- [🎯 SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) - OOD fundamentals',
        '- [📚 Design Patterns](https://refactoring.guru/design-patterns) - Gang of Four patterns',
        '- [🔧 Go Project Layout](https://github.com/golang-standards/project-layout) - Standard layout'
      ],
      phase2: [
        '- [🎨 Microservices Patterns](https://microservices.io/patterns/) - Chris Richardson',
        '- [📖 Domain-Driven Design](https://www.domainlanguage.com/ddd/) - Eric Evans',
        '- [🏛️ Go Kit](https://gokit.io/) - Microservices toolkit'
      ]
    },
    dependencies: {
      phase1: [
        '- [📦 Go Modules](https://go.dev/doc/modules/) - Official guide',
        '- [🛡️ govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck) - Vulnerability scanning',
        '- [🔄 Semantic Versioning](https://semver.org/) - Version numbering best practices',
        '- [🔍 Snyk Learn](https://learn.snyk.io/) - Security vulnerability education'
      ],
      phase2: [
        '- [🚨 CVE Database](https://cve.mitre.org/) - Known vulnerabilities',
        '- [📊 National Vulnerability Database](https://nvd.nist.gov/) - NIST CVE details',
        '- [🔒 Supply Chain Security](https://slsa.dev/) - Software supply chain levels'
      ]
    },
    codeQuality: {
      phase1: [
        '- [🧹 Effective Go](https://go.dev/doc/effective_go) - Official style guide',
        '- [📏 Refactoring Guide](https://refactoring.guru/refactoring) - Martin Fowler techniques',
        '- [🔧 Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments) - Go team guidelines',
        '- [📖 The Pragmatic Programmer](https://pragprog.com/titles/tpp20/) - Best practices'
      ],
      phase2: [
        '- [✅ Test-Driven Development](https://www.oreilly.com/library/view/test-driven-development/0321146530/) - Kent Beck',
        '- [🎯 Go Testing](https://go.dev/doc/tutorial/add-a-test) - Official tutorial',
        '- [📊 staticcheck](https://staticcheck.io/) - Static analysis'
      ]
    },
    additionalResources: [
      { title: 'Go Documentation', url: 'https://go.dev/doc/' },
      { title: 'Go by Example', url: 'https://gobyexample.com/' },
      { title: 'Golang Weekly', url: 'https://golangweekly.com/' },
      { title: 'Awesome Go', url: 'https://awesome-go.com/' }
    ],
    phase2Training: [
      '**Security (Week 1-2):**',
      '- [📚 Go Security](https://go.dev/doc/security/best-practices)',
      '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security)',
      '',
      '**Performance (Week 3-4):**',
      '- [📚 Go Profiling](https://go.dev/blog/pprof)',
      '- [📖 Concurrency in Go](https://www.oreilly.com/library/view/concurrency-in-go/9781491941294/)',
      '',
      '**Code Quality (Month 2):**',
      '- [📖 Effective Go](https://go.dev/doc/effective_go)',
      '- [📚 Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)'
    ]
  }
};

/**
 * Get language resources with fallback to Java (most common)
 */
function getLanguageResources(language: string): LanguageResources {
  const normalized = language.toLowerCase();
  return LANGUAGE_RESOURCES[normalized] || LANGUAGE_RESOURCES['java'];
}

/**
 * Extract CVE ID from rule, title, or description
 * CVE format: CVE-YYYY-NNNNN (e.g., CVE-2021-44228)
 *
 * CVE EDUCATION LINK BUG FIX (2025-10-30):
 * Detects CVE IDs to generate proper NVD/MITRE links instead of generic search
 *
 * TYPESCRIPT FIX (2025-11-14):
 * Changed to Google Search for non-CVE issues (aggregates YouTube, Stack Overflow, docs, blogs)
 */
function extractCVEId(ruleId: string, title: string, description?: string): string | null {
  const cvePattern = /CVE-\d{4}-\d{4,}/i;

  // Check rule ID first
  const ruleMatch = ruleId.match(cvePattern);
  if (ruleMatch) return ruleMatch[0].toUpperCase();

  // Check title
  const titleMatch = title.match(cvePattern);
  if (titleMatch) return titleMatch[0].toUpperCase();

  // Check description if available
  if (description) {
    const descMatch = description.match(cvePattern);
    if (descMatch) return descMatch[0].toUpperCase();
  }

  return null;
}

/**
 * Generate educational resources for detected issues
 *
 * Provides priority-based learning paths with curated resources
 * for critical and high-severity issues.
 *
 * BUG-090 FIX: Now accepts language parameter for language-specific resources
 * SESSION 77 FIX: Show tool-specific documentation for ALL issues, not just critical/high
 *
 * @param issues - Array of enriched issues
 * @param language - Programming language (python, java, typescript, go)
 */
export function generateEducationalResources(issues: EnrichedIssue[], language = 'java'): string {
  const resources = getLanguageResources(language);
  const critical = issues.filter(i => i.severity === 'critical');
  const high = issues.filter(i => i.severity === 'high');
  const priorityIssues = [...critical, ...high];

  // SESSION 77 FIX: If no priority issues but other issues exist, show tool-specific docs
  if (priorityIssues.length === 0 && issues.length > 0) {
    let content = `## 📚 Educational Resources

✅ **No critical or high-priority issues found.**

The following resources are based on the ${issues.length} medium/low severity issues detected:

### Tool-Specific Documentation
`;
    // Get unique rules and their tools
    const ruleMap = new Map<string, { tool: string; count: number; category?: string }>();
    for (const issue of issues) {
      const key = issue.rule || (issue as any).type || 'unknown';
      const existing = ruleMap.get(key);
      if (!existing) {
        ruleMap.set(key, { tool: issue.tool || '', count: 1, category: issue.detectedCategory });
      } else {
        existing.count++;
      }
    }

    // Get doc links for top rules (limit to 5 most frequent)
    const sortedRules = Array.from(ruleMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    let hasToolDocs = false;
    for (const [ruleId, { tool, count }] of sortedRules) {
      const docLinks = getDocumentationLinks(ruleId, tool);
      if (docLinks.length > 0) {
        hasToolDocs = true;
        content += `\n**${ruleId}** (${count} occurrence${count > 1 ? 's' : ''}):\n`;
        content += formatDocumentationLinksAsMarkdown(docLinks, 2) + '\n';
      }
    }

    // If no tool-specific docs found, show tool reference pages
    if (!hasToolDocs) {
      const tools = new Set(issues.map(i => i.tool?.toLowerCase()).filter(Boolean));
      for (const toolName of tools) {
        const toolInfo = TOOL_DOCUMENTATION[toolName as string];
        if (toolInfo?.rulesUrl) {
          content += `- [📚 ${toolInfo.name} Rules Reference](${toolInfo.rulesUrl})\n`;
        }
      }
    }

    content += `\n### General Resources\n`;
    resources.generalBooks.forEach(book => {
      content += `- [📚 ${book.title}](${book.url})\n`;
    });
    return content;
  }

  // No issues at all
  if (issues.length === 0) {
    let generalContent = `## 📚 Educational Resources

✅ **No issues found - excellent code quality!**

Continue following best practices and consider integrating static analysis into your CI/CD pipeline to maintain this standard.

### General Resources
`;
    resources.generalBooks.forEach(book => {
      generalContent += `- [📚 ${book.title}](${book.url})\n`;
    });
    return generalContent;
  }

  let content = `## 📚 Educational Resources

**Priority training for ${priorityIssues.length} critical/high-severity issues:**

`;

  // Group by detected category
  const categories = Array.from(new Set(priorityIssues.map(i => i.detectedCategory).filter(Boolean)));

  if (categories.length === 0) {
    // Fallback if categories not detected - use tool-based categorization
    content += `### Immediate Focus Areas\n\n`;
    content += `**General Code Quality & Security:**\n`;
    content += `- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security vulnerabilities\n`;
    content += `- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Code quality principles\n`;
    content += `- [🔒 Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)\n\n`;
  } else {
    // Generate category-specific resources using language-aware data
    categories.forEach(category => {
      const categoryIssues = priorityIssues.filter(i => i.detectedCategory === category);
      const criticalCount = categoryIssues.filter(i => i.severity === 'critical').length;
      const highCount = categoryIssues.filter(i => i.severity === 'high').length;

      content += `### ${category} (${criticalCount} critical, ${highCount} high)\n\n`;
      content += `**Priority:** ${criticalCount > 0 ? '🔴 Immediate' : '🟠 High'}\n\n`;

      // Get category-specific resources from language config
      let categoryResources: { phase1: string[]; phase2: string[] } | undefined;
      switch (category) {
        case 'Security':
          categoryResources = resources.security;
          break;
        case 'Performance':
          categoryResources = resources.performance;
          break;
        case 'Architecture':
          categoryResources = resources.architecture;
          break;
        case 'Dependencies':
          categoryResources = resources.dependencies;
          break;
        case 'Code Quality':
        default:
          categoryResources = resources.codeQuality;
          break;
      }

      if (categoryResources) {
        content += `**Phase 1: ${category} Fundamentals (Week 1-2)**\n`;
        categoryResources.phase1.forEach(line => {
          content += `${line}\n`;
        });
        content += `\n`;

        content += `**Phase 2: Advanced Topics (Week 3-4)**\n`;
        categoryResources.phase2.forEach(line => {
          content += `${line}\n`;
        });
        content += `\n`;
      }
    });
  }

  // Add recommended learning path
  content += `### 📈 Recommended Learning Path\n\n`;
  content += `**Week 1-2:** Focus on immediate priority areas identified above\n`;
  content += `**Week 3-4:** Deep dive into specific patterns and advanced techniques\n`;
  content += `**Ongoing:** Integrate static analysis into CI/CD, establish code review standards\n\n`;

  // Add language-specific additional resources
  content += `### 🎓 Additional Resources\n\n`;
  resources.additionalResources.forEach(resource => {
    content += `- [📚 ${resource.title}](${resource.url})\n`;
  });
  content += `\n`;

  content += `**💡 Tip:** Detailed issue-specific resources are linked in each section above.`;

  return content;
}

/**
 * Generate educational resources with Brave Search integration
 *
 * ENHANCEMENT #2: Training for ALL blockers + ALL critical/high issues
 * Falls back to standard educational resources if Brave Search is not available.
 *
 * BUG-090 FIX: Now accepts language parameter for language-specific resources
 *
 * @param issues - Array of enriched issues
 * @param language - Programming language (python, java, typescript, go)
 */
export async function generateEducationalResourcesBrave(issues: EnrichedIssue[], language = 'java'): Promise<string> {
  const resources = getLanguageResources(language);

  // ENHANCEMENT #2: Training for ALL blockers + ALL critical/high issues (user feedback)
  // Blockers: NEW/EXISTING_MODIFIED + critical/high (must fix before merge)
  const blockerIssues = issues.filter(i =>
    (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
    (i.severity === 'critical' || i.severity === 'high')
  );
  // Rest critical/high: EXISTING_REST + critical/high (not blockers but still important)
  const restCriticalHighIssues = issues.filter(i =>
    i.category === 'EXISTING_REST' &&
    (i.severity === 'critical' || i.severity === 'high')
  );

  // BUG FIX: Remove EducationalSearchService check - YouTube links don't need Brave API
  // The Brave version generates YouTube search URLs which work without any API key
  // This aligns with the default behavior set in v9-grouped-report-formatter.ts

  let content = `## 📚 Phased Educational Plan\n\n`;

  // Phase 1: Blocker Issues (MUST FIX BEFORE MERGE) - ALL blocker types
  if (blockerIssues.length > 0) {
    content += `### 📚 Phase 1: Blocker Issues Training (MUST FIX BEFORE MERGE)\n`;
    content += `**Quick Learning:** 30-60 min per issue type | **Deep Dive:** 1-2 weeks\n\n`;

    // Get all unique rules from blockers (not just top 3)
    const blockerFreq = new Map<string, number>();
    for (const i of blockerIssues) blockerFreq.set(i.rule, (blockerFreq.get(i.rule) || 0) + 1);
    const blockerRules = Array.from(blockerFreq.entries())
      .sort((a,b)=>b[1]-a[1]) // Sort by frequency
      .map(([r]) => r);

    for (const ruleId of blockerRules) {
      const sample = blockerIssues.find(i => i.rule === ruleId);
      const title = getUserFriendlyTitle(ruleId, sample ? sample.tool : '');
      // BUG-090 FIX: Use passed language parameter instead of hardcoded 'Java'
      const issueLanguage = (sample && (sample as any).language) ? (sample as any).language as string : language;
      const count = blockerFreq.get(ruleId) || 0;
      const description = (sample && (sample as any).description) ? (sample as any).description : undefined;

      content += `**${title}** (${count} occurrence${count > 1 ? 's' : ''}):\n`;

      // CVE EDUCATION LINK BUG FIX (2025-10-30): Check if this is a CVE issue
      const cveId = extractCVEId(ruleId, title, description);

      if (cveId) {
        // For CVE issues: Link to authoritative sources (NVD, MITRE)
        content += `- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/${cveId}) - NIST National Vulnerability Database\n`;
        content += `- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cveId}) - Official CVE details\n`;
        content += `- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited\n`;
      } else {
        // ENHANCEMENT (2025-12-14): Use proper documentation links instead of Google searches
        const tool = sample ? sample.tool : '';
        const docLinks = getDocumentationLinks(ruleId, tool);

        if (docLinks.length > 0) {
          // Use official documentation links
          content += formatDocumentationLinksAsMarkdown(docLinks, 3) + '\n';
        } else {
          // Try curated resources first
          const curated = getCuratedResourcesForRule(ruleId);
          if (curated.length > 0) {
            for (const r of curated.slice(0, 2)) {
              content += `- [📚 ${r.title}](${r.url})\n`;
            }
          } else {
            // Fall back to category-based documentation
            const category = sample?.detectedCategory || 'Code Quality';
            const fallbackLinks = getFallbackDocumentation(category, issueLanguage);
            content += formatDocumentationLinksAsMarkdown(fallbackLinks, 2) + '\n';
          }
        }
      }
      content += `\n`;
    }
  }

  // Phase 1.5: Rest Critical/High Issues (Not blockers, but still important)
  if (restCriticalHighIssues.length > 0) {
    content += `### 📚 Phase 1.5: Additional Critical/High Issues Training (Not Blockers)\n`;
    content += `**These issues exist in unchanged files but should be addressed soon.**\n\n`;

    // Get all unique rules from rest critical/high (limit to top 5 to avoid overwhelming)
    const restFreq = new Map<string, number>();
    for (const i of restCriticalHighIssues) restFreq.set(i.rule, (restFreq.get(i.rule) || 0) + 1);
    const restRules = Array.from(restFreq.entries())
      .sort((a,b)=>b[1]-a[1])
      .slice(0, 5) // Limit to top 5 most frequent
      .map(([r]) => r);

    for (const ruleId of restRules) {
      const sample = restCriticalHighIssues.find(i => i.rule === ruleId);
      const title = getUserFriendlyTitle(ruleId, sample ? sample.tool : '');
      // BUG-090 FIX: Use passed language parameter instead of hardcoded 'Java'
      const issueLanguage = (sample && (sample as any).language) ? (sample as any).language as string : language;
      const count = restFreq.get(ruleId) || 0;
      const description = (sample && (sample as any).description) ? (sample as any).description : undefined;

      content += `**${title}** (${count} occurrence${count > 1 ? 's' : ''}):\n`;

      // CVE EDUCATION LINK BUG FIX (2025-10-30): Check if this is a CVE issue
      const cveId = extractCVEId(ruleId, title, description);

      if (cveId) {
        // For CVE issues: Link to authoritative sources (NVD, MITRE)
        content += `- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/${cveId}) - NIST National Vulnerability Database\n`;
        content += `- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cveId}) - Official CVE details\n`;
        content += `- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited\n`;
      } else {
        // ENHANCEMENT (2025-12-14): Use proper documentation links instead of Google searches
        const tool = sample ? sample.tool : '';
        const docLinks = getDocumentationLinks(ruleId, tool);

        if (docLinks.length > 0) {
          // Use official documentation links
          content += formatDocumentationLinksAsMarkdown(docLinks, 3) + '\n';
        } else {
          // Try curated resources first
          const curated = getCuratedResourcesForRule(ruleId);
          if (curated.length > 0) {
            for (const r of curated.slice(0, 2)) {
              content += `- [📚 ${r.title}](${r.url})\n`;
            }
          } else {
            // Fall back to category-based documentation
            const category = sample?.detectedCategory || 'Code Quality';
            const fallbackLinks = getFallbackDocumentation(category, issueLanguage);
            content += formatDocumentationLinksAsMarkdown(fallbackLinks, 2) + '\n';
          }
        }
      }
      content += `\n`;
    }
  }

  // USER FEEDBACK (2025-12-14): Phase 2 teaches KNOWLEDGE GAPS based on issue categories
  // NOT tools - developers need to learn security/performance/architecture concepts
  content += `### 📚 Phase 2: Dedicated Training (Extended Learning)\n\n`;
  content += `**Required Time:** 2-4 weeks | **Format:** Self-paced courses and documentation\n\n`;
  content += `**Goal:** Address knowledge gaps identified by this analysis to prevent future issues.\n\n`;

  // Extract unique categories from ALL issues to determine what training is needed
  const allPriorityIssues = [...blockerIssues, ...restCriticalHighIssues];
  const categoriesFound = new Set<string>();
  for (const issue of allPriorityIssues) {
    if (issue.detectedCategory) {
      categoriesFound.add(issue.detectedCategory);
    }
  }

  // Category-based training - teach the KNOWLEDGE needed, not tools
  const categoryTraining: Record<string, { title: string; resources: string[] }> = {
    'Security': {
      title: 'Security Fundamentals',
      resources: [
        '- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive hands-on labs',
        '- [🛡️ OWASP Top 10](https://owasp.org/www-project-top-ten/) - Critical security risks',
        '- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference',
        '- [📖 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses'
      ]
    },
    'Performance': {
      title: 'Performance Optimization',
      resources: [
        '- [⚡ Web Performance Fundamentals](https://web.dev/performance/) - Google performance guide',
        '- [📊 High Performance Browser Networking](https://hpbn.co/) - Free online book',
        '- [🔧 Profiling and Optimization](https://developer.chrome.com/docs/devtools/performance/) - Chrome DevTools'
      ]
    },
    'Code Quality': {
      title: 'Clean Code Practices',
      resources: [
        '- [📚 Clean Code Principles](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin',
        '- [🔄 Refactoring Techniques](https://refactoring.guru/refactoring) - Martin Fowler patterns',
        '- [📖 The Pragmatic Programmer](https://pragprog.com/titles/tpp20/) - Best practices'
      ]
    },
    'Architecture': {
      title: 'Software Architecture',
      resources: [
        '- [🏗️ Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Uncle Bob',
        '- [🎯 SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) - OOD fundamentals',
        '- [📚 Design Patterns](https://refactoring.guru/design-patterns) - Gang of Four patterns'
      ]
    },
    'Dependencies': {
      title: 'Dependency Management & Supply Chain Security',
      resources: [
        '- [🔒 Supply Chain Security](https://slsa.dev/) - Software supply chain levels',
        '- [🚨 CVE Database](https://cve.mitre.org/) - Known vulnerabilities reference',
        '- [📊 National Vulnerability Database](https://nvd.nist.gov/) - NIST CVE details'
      ]
    }
  };

  // Show training for each category where issues were found
  if (categoriesFound.size > 0) {
    for (const category of categoriesFound) {
      const training = categoryTraining[category];
      if (training) {
        content += `**${training.title}** (based on ${category} issues found):\n`;
        for (const resource of training.resources) {
          content += `${resource}\n`;
        }
        content += `\n`;
      }
    }
  } else {
    // Fallback to general resources
    content += `**General Best Practices:**\n`;
    content += `- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Security training\n`;
    content += `- [📚 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Code quality\n`;
    content += `\n`;
  }

  content += `> 💡 **Note**: Focus on the knowledge areas above to write better code and avoid similar issues in future PRs.\n`;

  // SESSION 26: Add Phase 3 for LOW severity style issues (grouped by tool)
  // Instead of listing 543 individual links, provide ONE aggregated reference per tool
  // SESSION 113 FIX: Exclude RESOLVED issues (they're already fixed)
  const lowIssues = issues.filter(i => (i.severity === 'low' || i.severity === 'medium') && i.category !== 'RESOLVED');
  if (lowIssues.length > 0) {
    // Group by tool
    const toolCounts = new Map<string, number>();
    for (const issue of lowIssues) {
      const tool = issue.tool?.toLowerCase() || 'other';
      toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
    }

    // Only add section if we have significant style issues
    if (toolCounts.size > 0) {
      content += `\n### 📚 Phase 3: Code Style & Formatting (Optional)\n\n`;
      content += `**${lowIssues.length} style/formatting issues** can be addressed to improve code consistency.\n\n`;
      content += `| Tool | Issues | Reference |\n`;
      content += `|------|--------|----------|\n`;

      // Add one row per tool with aggregated link
      const toolDocs: Record<string, { name: string; url: string }> = {
        'checkstyle': { name: 'Checkstyle', url: 'https://checkstyle.org/checks.html' },
        'pmd': { name: 'PMD', url: 'https://pmd.github.io/latest/pmd_rules_java.html' },
        'eslint': { name: 'ESLint', url: 'https://eslint.org/docs/rules/' },
        'ruff': { name: 'Ruff', url: 'https://docs.astral.sh/ruff/rules/' },
        'mypy': { name: 'MyPy', url: 'https://mypy.readthedocs.io/en/stable/error_codes.html' },
        'pylint': { name: 'Pylint', url: 'https://pylint.readthedocs.io/en/latest/user_guide/messages/index.html' },
        'spotbugs': { name: 'SpotBugs', url: 'https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html' }
      };

      // Sort by count (highest first)
      const sortedTools = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1]);
      
      for (const [tool, count] of sortedTools) {
        const doc = toolDocs[tool] || { name: tool, url: '' };
        if (doc.url) {
          content += `| ${doc.name} | ${count} | [📚 ${doc.name} Rules Reference](${doc.url}) |\n`;
        } else {
          content += `| ${tool} | ${count} | See tool documentation |\n`;
        }
      }

      content += `\n> 💡 **Tip**: These are style issues with no runtime impact. Fix via IDE auto-format or linter \`--fix\` commands.\n`;
    }
  }

  // ENHANCEMENT #2: Return fallback if no blockers or critical/high issues
  if (blockerIssues.length === 0 && restCriticalHighIssues.length === 0) {
    return generateEducationalResources(issues, language);
  }

  return content.trim();
}


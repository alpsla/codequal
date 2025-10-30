/**
 * Educational Resources Service
 * 
 * Generates educational content and learning paths for developers.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 */

import { EnrichedIssue } from './types';
import { getUserFriendlyTitle } from './formatter-utils';
import { getCuratedResourcesForRule } from './ai-enrichment';

/**
 * Generate educational resources for detected issues
 * 
 * Provides priority-based learning paths with curated resources
 * for critical and high-severity issues.
 */
export function generateEducationalResources(issues: EnrichedIssue[]): string {
  const critical = issues.filter(i => i.severity === 'critical');
  const high = issues.filter(i => i.severity === 'high');
  const priorityIssues = [...critical, ...high];
  
  // If no priority issues, show general message
  if (priorityIssues.length === 0) {
    return `## 📚 Educational Resources

✅ **No critical or high-priority issues found.**

Continue following best practices and consider integrating static analysis into your CI/CD pipeline to maintain this standard.

### General Resources
- [🧹 Clean Code Principles](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin
- [📏 Effective Java](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/) - Joshua Bloch
- [🏗️  Software Architecture Fundamentals](https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/)`;
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
    // Generate category-specific resources
    categories.forEach(category => {
      const categoryIssues = priorityIssues.filter(i => i.detectedCategory === category);
      const criticalCount = categoryIssues.filter(i => i.severity === 'critical').length;
      const highCount = categoryIssues.filter(i => i.severity === 'high').length;
      
      content += `### ${category} (${criticalCount} critical, ${highCount} high)\n\n`;
      content += `**Priority:** ${criticalCount > 0 ? '🔴 Immediate' : '🟠 High'}\n\n`;
    
      switch (category) {
        case 'Security':
          content += `**Phase 1: Security Fundamentals (Week 1-2)**\n`;
          content += `- [📚 OWASP Top 10](https://owasp.org/www-project-top-ten/) - Top security risks and mitigations\n`;
          content += `- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference\n`;
          content += `- [🎯 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses\n`;
          content += `- [📖 Secure Coding in Java](https://www.oracle.com/java/technologies/javase/seccodeguide.html) - Oracle guidelines\n\n`;
          
          content += `**Phase 2: Specific Vulnerabilities (Week 3-4)**\n`;
          content += `- [🛡️ SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)\n`;
          content += `- [🔐 Command Injection Defense](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)\n`;
          content += `- [🔑 Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)\n`;
          content += `- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive labs\n\n`;
          break;
          
        case 'Performance':
          content += `**Phase 1: Performance Fundamentals (Week 1-2)**\n`;
          content += `- [⚡ Java Performance Tuning Guide](https://www.oracle.com/technical-resources/articles/javase/perftuning.html) - Official Oracle guide\n`;
          content += `- [📖 Java Concurrency in Practice](https://jcip.net/) - Brian Goetz (essential reading)\n`;
          content += `- [🔧 JVM Performance Optimization](https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/) - GC tuning\n`;
          content += `- [📊 Profiling with JMH](https://openjdk.java.net/projects/code-tools/jmh/) - Microbenchmarking\n\n`;
          
          content += `**Phase 2: Advanced Topics (Week 3-4)**\n`;
          content += `- [🎯 Lock-Free Programming](https://mechanical-sympathy.blogspot.com/) - Martin Thompson's blog\n`;
          content += `- [📚 High Performance Java Persistence](https://vladmihalcea.com/books/high-performance-java-persistence/) - Vlad Mihalcea\n`;
          content += `- [🔬 Memory Management Deep Dive](https://www.baeldung.com/java-memory-management-interview-questions)\n\n`;
          break;
          
        case 'Architecture':
          content += `**Phase 1: Design Principles (Week 1-2)**\n`;
          content += `- [🏗️  Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Robert C. Martin\n`;
          content += `- [🎯 SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design) - OOD fundamentals\n`;
          content += `- [📚 Design Patterns](https://refactoring.guru/design-patterns) - Gang of Four patterns\n`;
          content += `- [🔧 Effective Java](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/) - Joshua Bloch\n\n`;
          
          content += `**Phase 2: Architecture Patterns (Week 3-4)**\n`;
          content += `- [🎨 Microservices Patterns](https://microservices.io/patterns/) - Chris Richardson\n`;
          content += `- [📖 Domain-Driven Design](https://www.domainlanguage.com/ddd/) - Eric Evans\n`;
          content += `- [🏛️ Software Architecture Fundamentals](https://www.oreilly.com/library/view/software-architecture-fundamentals/9781491998991/)\n\n`;
          break;
          
        case 'Dependencies':
          content += `**Phase 1: Dependency Management (Week 1-2)**\n`;
          content += `- [📦 Maven Dependency Management](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) - Official guide\n`;
          content += `- [🛡️ OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) - Vulnerability scanning\n`;
          content += `- [🔄 Semantic Versioning](https://semver.org/) - Version numbering best practices\n`;
          content += `- [🔍 Snyk Learn](https://learn.snyk.io/) - Security vulnerability education\n\n`;
          
          content += `**Phase 2: Security & Updates (Week 3-4)**\n`;
          content += `- [🚨 CVE Database](https://cve.mitre.org/) - Known vulnerabilities\n`;
          content += `- [📊 National Vulnerability Database](https://nvd.nist.gov/) - NIST CVE details\n`;
          content += `- [🔒 Supply Chain Security](https://slsa.dev/) - Software supply chain levels\n\n`;
          break;
          
        case 'Code Quality':
        default:
          content += `**Phase 1: Clean Code Basics (Week 1-2)**\n`;
          content += `- [🧹 Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin\n`;
          content += `- [📏 Refactoring Guide](https://refactoring.guru/refactoring) - Martin Fowler techniques\n`;
          content += `- [🔧 Code Smells](https://refactoring.guru/refactoring/smells) - Common anti-patterns\n`;
          content += `- [📖 The Pragmatic Programmer](https://pragprog.com/titles/tpp20/) - Best practices\n\n`;
          
          content += `**Phase 2: Advanced Topics (Week 3-4)**\n`;
          content += `- [✅ Test-Driven Development](https://www.oreilly.com/library/view/test-driven-development/0321146530/) - Kent Beck\n`;
          content += `- [🎯 Working Effectively with Legacy Code](https://www.oreilly.com/library/view/working-effectively-with/0131177052/) - Michael Feathers\n`;
          content += `- [📊 Code Quality Metrics](https://www.baeldung.com/java-static-code-analysis-tutorial) - Static analysis\n\n`;
          break;
      }
    });
  }
  
  // Add recommended learning path
  content += `### 📈 Recommended Learning Path\n\n`;
  content += `**Week 1-2:** Focus on immediate priority areas identified above\n`;
  content += `**Week 3-4:** Deep dive into specific patterns and advanced techniques\n`;
  content += `**Ongoing:** Integrate static analysis into CI/CD, establish code review standards\n\n`;
  
  content += `### 🎓 Additional Resources\n\n`;
  content += `- [📺 Pluralsight](https://www.pluralsight.com/) - Video courses on all topics\n`;
  content += `- [📚 Baeldung](https://www.baeldung.com/) - Comprehensive Java tutorials\n`;
  content += `- [🎯 Java Code Geeks](https://www.javacodegeeks.com/) - Java best practices\n`;
  content += `- [🔬 DZone Java Zone](https://dzone.com/java-jdk-development-tutorials-tools-news) - Articles and guides\n\n`;
  
  content += `**💡 Tip:** Detailed issue-specific resources are linked in each section above.`;
  
  return content;
}

/**
 * Generate educational resources with Brave Search integration
 * 
 * ENHANCEMENT #2: Training for ALL blockers + ALL critical/high issues
 * Falls back to standard educational resources if Brave Search is not available.
 */
export async function generateEducationalResourcesBrave(issues: EnrichedIssue[]): Promise<string> {
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
      const language = (sample && (sample as any).language) ? (sample as any).language as string : 'Java';
      const count = blockerFreq.get(ruleId) || 0;
      
      content += `**${title}** (${count} occurrence${count > 1 ? 's' : ''}):\n`;
      
      // Add curated YouTube channel/playlist
      const youtubeQuery = `${language} ${title.toLowerCase()}`.replace(/[^\w\s]/g, ' ').trim();
      content += `- [🎥 YouTube Tutorial](https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery + ' tutorial')})\n`;
      
      // Add curated documentation
      const curated = getCuratedResourcesForRule(ruleId);
      if (curated.length > 0) {
        for (const r of curated.slice(0, 2)) {
          content += `- [📚 ${r.title}](${r.url})\n`;
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
      const language = (sample && (sample as any).language) ? (sample as any).language as string : 'Java';
      const count = restFreq.get(ruleId) || 0;
      
      content += `**${title}** (${count} occurrence${count > 1 ? 's' : ''}):\n`;
      
      // Add curated YouTube channel/playlist
      const youtubeQuery = `${language} ${title.toLowerCase()}`.replace(/[^\w\s]/g, ' ').trim();
      content += `- [🎥 YouTube Tutorial](https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery + ' tutorial')})\n`;
      
      // Add curated documentation
      const curated = getCuratedResourcesForRule(ruleId);
      if (curated.length > 0) {
        for (const r of curated.slice(0, 2)) {
          content += `- [📚 ${r.title}](${r.url})\n`;
        }
      }
      content += `\n`;
    }
  }

  // BUG FIX #31: Phase 2 - Remove duplicate OWASP links (already in Phase 1)
  content += `### 📚 Phase 2: Comprehensive Training (Long-term)\n\n`;
  content += `**Security (Week 1-2):**\n`;
  content += `- [📚 SEI CERT Java Coding Standard](https://wiki.sei.cmu.edu/confluence/display/java/SEI+CERT+Oracle+Coding+Standard+for+Java)\n`;
  content += `- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security)\n\n`;
  content += `**Performance (Week 3-4):**\n`;
  content += `- [📚 Java Concurrency - Oracle](https://docs.oracle.com/javase/tutorial/essential/concurrency/)\n`;
  content += `- [📖 Java Concurrency in Practice](https://jcip.net/)\n\n`;
  content += `**Code Quality (Month 2):**\n`;
  content += `- [📖 Clean Code Principles](https://martinfowler.com/bliki/CleanCode.html)\n`;
  content += `- [📚 Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)\n`;
  content += `\n> 💡 **Note**: OWASP Top 10 and security-specific resources are covered in Phase 1 Security section above.\n`;

  // ENHANCEMENT #2: Return fallback if no blockers or critical/high issues
  if (blockerIssues.length === 0 && restCriticalHighIssues.length === 0) {
    return generateEducationalResources(issues);
  }

  return content.trim();
}


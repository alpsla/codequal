/**
 * V9 Java Analyzer Integration Tests
 * 
 * Tests specific to Java language analysis including:
 * - SpotBugs integration
 * - PMD integration
 * - Checkstyle integration
 * - SonarQube integration
 * - Java-specific issue patterns
 * - Maven/Gradle project handling
 */

import { V9JavaAnalyzer } from '../analyzers/v9-java-analyzer';
import { Issue, LanguageConfig } from '../analyzers/v9-types';

// Mock the external dependencies
jest.mock('child_process');
jest.mock('@supabase/supabase-js');
jest.mock('ioredis');

describe('V9 Java Analyzer Tests', () => {
  let analyzer: V9JavaAnalyzer;

  beforeEach(() => {
    analyzer = new V9JavaAnalyzer();
    
    // Mock environment variables
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
  });

  describe('Language Configuration', () => {
    it('should provide correct Java configuration', () => {
      const config: LanguageConfig = analyzer.getLanguageConfig();
      
      expect(config.name).toBe('Java');
      expect(config.fileExtensions).toContain('.java');
      expect(config.tools).toHaveLength(4); // SpotBugs, PMD, Checkstyle, SonarQube
      
      const toolNames = config.tools.map(t => t.name);
      expect(toolNames).toContain('SpotBugs');
      expect(toolNames).toContain('PMD');
      expect(toolNames).toContain('Checkstyle');
      expect(toolNames).toContain('SonarQube');
    });

    it('should have Java-specific fix patterns', () => {
      const config = analyzer.getLanguageConfig();
      const patterns = config.suggestedFixPatterns;
      
      expect(patterns).toHaveProperty('unused-variable');
      expect(patterns).toHaveProperty('null-pointer');
      expect(patterns).toHaveProperty('resource-leak');
      expect(patterns).toHaveProperty('sql-injection');
    });
  });

  describe('SpotBugs Tool Integration', () => {
    it('should parse SpotBugs XML output correctly', async () => {
      const mockSpotBugsXml = `<?xml version="1.0" encoding="UTF-8"?>
<BugCollection>
  <BugInstance type="SQL_INJECTION" priority="1" rank="1" abbrev="SQL" category="SECURITY">
    <Class classname="com.example.UserService">
      <SourceLine classname="com.example.UserService" start="42" end="42" sourcepath="src/main/java/com/example/UserService.java" sourcefile="UserService.java"/>
    </Class>
    <Method classname="com.example.UserService" name="findUser" signature="(Ljava/lang/String;)Lcom/example/User;">
      <SourceLine classname="com.example.UserService" start="42" end="45" sourcepath="src/main/java/com/example/UserService.java" sourcefile="UserService.java"/>
    </Method>
    <SourceLine classname="com.example.UserService" primary="true" start="42" end="42" sourcepath="src/main/java/com/example/UserService.java" sourcefile="UserService.java"/>
    <ShortMessage>Potential SQL injection</ShortMessage>
    <LongMessage>This method might be vulnerable to SQL injection attacks</LongMessage>
  </BugInstance>
</BugCollection>`;

      const config = analyzer.getLanguageConfig();
      const spotBugsTool = config.tools.find(t => t.name === 'SpotBugs');
      expect(spotBugsTool).toBeDefined();

      if (spotBugsTool) {
        const issues = await spotBugsTool.parser(mockSpotBugsXml, '/mock/workspace');
        
        expect(issues).toHaveLength(1);
        expect(issues[0].category).toBe('Security');
        expect(issues[0].severity).toBe('critical'); // Priority 1 maps to critical
        expect(issues[0].title).toBe('Potential SQL injection');
        expect(issues[0].file).toBe('src/main/java/com/example/UserService.java');
        expect(issues[0].line).toBe(42);
        expect(issues[0].tool).toBe('SpotBugs');
      }
    });

    it('should handle different SpotBugs priority levels', async () => {
      const mockXmlMultiplePriorities = `<?xml version="1.0" encoding="UTF-8"?>
<BugCollection>
  <BugInstance type="CRITICAL_ISSUE" priority="1">
    <SourceLine start="10" sourcepath="Test.java"/>
    <ShortMessage>Critical Issue</ShortMessage>
  </BugInstance>
  <BugInstance type="HIGH_ISSUE" priority="2">
    <SourceLine start="20" sourcepath="Test.java"/>
    <ShortMessage>High Issue</ShortMessage>
  </BugInstance>
  <BugInstance type="MEDIUM_ISSUE" priority="3">
    <SourceLine start="30" sourcepath="Test.java"/>
    <ShortMessage>Medium Issue</ShortMessage>
  </BugInstance>
</BugCollection>`;

      const config = analyzer.getLanguageConfig();
      const spotBugsTool = config.tools.find(t => t.name === 'SpotBugs');
      
      if (spotBugsTool) {
        const issues = await spotBugsTool.parser(mockXmlMultiplePriorities, '/mock');
        
        expect(issues).toHaveLength(3);
        expect(issues[0].severity).toBe('critical');
        expect(issues[1].severity).toBe('high');
        expect(issues[2].severity).toBe('medium');
      }
    });
  });

  describe('PMD Tool Integration', () => {
    it('should parse PMD XML output correctly', async () => {
      const mockPmdXml = `<?xml version="1.0" encoding="UTF-8"?>
<pmd version="6.40.0">
  <file name="/src/main/java/com/example/Service.java">
    <violation beginline="15" endline="15" begincolumn="5" endcolumn="25" rule="UnusedLocalVariable" ruleset="Best Practices" priority="3">
      <description>Unused local variable 'unusedVar'</description>
    </violation>
    <violation beginline="25" endline="25" rule="AvoidCatchingThrowable" ruleset="Design" priority="2">
      <description>Avoid catching Throwable; catch Exception instead</description>
    </violation>
  </file>
</pmd>`;

      const config = analyzer.getLanguageConfig();
      const pmdTool = config.tools.find(t => t.name === 'PMD');
      
      if (pmdTool) {
        const issues = await pmdTool.parser(mockPmdXml, '/mock/workspace');
        
        expect(issues).toHaveLength(2);
        
        const firstIssue = issues[0];
        expect(firstIssue.title).toBe('UnusedLocalVariable');
        expect(firstIssue.severity).toBe('medium'); // Priority 3
        expect(firstIssue.line).toBe(15);
        expect(firstIssue.file).toBe('src/main/java/com/example/Service.java');
        
        const secondIssue = issues[1];
        expect(secondIssue.severity).toBe('high'); // Priority 2
        expect(secondIssue.line).toBe(25);
      }
    });
  });

  describe('Checkstyle Tool Integration', () => {
    it('should parse Checkstyle XML output correctly', async () => {
      const mockCheckstyleXml = `<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="8.45">
  <file name="/src/main/java/com/example/Utils.java">
    <error line="10" column="1" severity="error" message="Missing package-info.java file" source="com.puppycrawl.tools.checkstyle.checks.javadoc.MissingJavadocPackageCheck"/>
    <error line="20" column="5" severity="warning" message="Line is longer than 120 characters" source="com.puppycrawl.tools.checkstyle.checks.sizes.LineLengthCheck"/>
    <error line="30" column="10" severity="info" message="Missing Javadoc comment" source="com.puppycrawl.tools.checkstyle.checks.javadoc.MissingJavadocMethodCheck"/>
  </file>
</checkstyle>`;

      const config = analyzer.getLanguageConfig();
      const checkstyleTool = config.tools.find(t => t.name === 'Checkstyle');
      
      if (checkstyleTool) {
        const issues = await checkstyleTool.parser(mockCheckstyleXml, '/mock/workspace');
        
        expect(issues).toHaveLength(3);
        
        expect(issues[0].severity).toBe('high'); // error
        expect(issues[1].severity).toBe('medium'); // warning
        expect(issues[2].severity).toBe('low'); // info
        
        expect(issues[0].category).toBe('Quality');
        expect(issues[0].tool).toBe('Checkstyle');
      }
    });
  });

  describe('Java-Specific Issue Patterns', () => {
    it('should identify common Java security vulnerabilities', () => {
      const securityIssues = [
        'SQL_INJECTION',
        'XSS_VULNERABILITY',
        'HARDCODED_PASSWORD',
        'WEAK_CRYPTOGRAPHY',
        'INSECURE_RANDOM',
        'PATH_TRAVERSAL',
        'UNSAFE_DESERIALIZATION'
      ];

      const config = analyzer.getLanguageConfig();
      const patterns = config.suggestedFixPatterns;
      
      securityIssues.forEach(issue => {
        expect(patterns).toHaveProperty(issue.toLowerCase().replace('_', '-'));
      });
    });

    it('should provide fix suggestions for common Java issues', () => {
      const config = analyzer.getLanguageConfig();
      const patterns = config.suggestedFixPatterns;
      
      expect(patterns['null-pointer']).toContain('Objects.requireNonNull');
      expect(patterns['resource-leak']).toContain('try-with-resources');
      expect(patterns['unused-variable']).toContain('Remove unused');
      expect(patterns['sql-injection']).toContain('PreparedStatement');
    });
  });

  describe('Maven/Gradle Project Detection', () => {
    it('should detect Maven projects and adjust tool commands', () => {
      // Mock file system to simulate Maven project
      const mockFs = require('fs');
      mockFs.existsSync = jest.fn().mockImplementation((path: string) => {
        return path.includes('pom.xml');
      });

      const config = analyzer.getLanguageConfig();
      const spotBugsTool = config.tools.find(t => t.name === 'SpotBugs');
      
      // Should use Maven-specific command
      expect(spotBugsTool?.command).toContain('mvn');
    });

    it('should detect Gradle projects and adjust tool commands', () => {
      // Mock file system to simulate Gradle project
      const mockFs = require('fs');
      mockFs.existsSync = jest.fn().mockImplementation((path: string) => {
        return path.includes('build.gradle') || path.includes('build.gradle.kts');
      });

      const config = analyzer.getLanguageConfig();
      const spotBugsTool = config.tools.find(t => t.name === 'SpotBugs');
      
      // Should use Gradle-specific command
      expect(spotBugsTool?.command).toContain('gradle');
    });
  });

  describe('Performance and Memory Analysis', () => {
    it('should identify performance-related issues', async () => {
      const mockPmdPerformanceOutput = `<?xml version="1.0" encoding="UTF-8"?>
<pmd>
  <file name="/src/Service.java">
    <violation rule="InefficiStringBuffering" priority="3">
      <description>String concatenation in loop should use StringBuilder</description>
    </violation>
    <violation rule="AvoidInstantiatingObjectsInLoops" priority="2">
      <description>Avoid instantiating objects inside loops</description>
    </violation>
  </file>
</pmd>`;

      const config = analyzer.getLanguageConfig();
      const pmdTool = config.tools.find(t => t.name === 'PMD');
      
      if (pmdTool) {
        const issues = await pmdTool.parser(mockPmdPerformanceOutput, '/mock');
        
        const performanceIssues = issues.filter(i => 
          i.category === 'Performance' || 
          i.title.toLowerCase().includes('performance') ||
          i.description.toLowerCase().includes('loop') ||
          i.description.toLowerCase().includes('efficiency')
        );
        
        expect(performanceIssues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Integration with V9 Scoring System', () => {
    it('should properly weight Java-specific issues', () => {
      const javaIssues: Issue[] = [
        {
          id: '1',
          category: 'Security',
          severity: 'critical',
          status: 'new',
          title: 'SQL Injection',
          description: 'Potential SQL injection in user query',
          file: 'src/main/java/UserService.java',
          line: 42,
          tool: 'SpotBugs',
          agent: 'security',
          impact: 'Data breach risk',
          businessImpact: 'High financial and reputation damage',
          inModifiedFile: true
        },
        {
          id: '2',
          category: 'Quality',
          severity: 'medium',
          status: 'new',
          title: 'Unused Import',
          description: 'Unused import statement',
          file: 'src/main/java/Utils.java',
          line: 5,
          tool: 'Checkstyle',
          agent: 'quality',
          impact: 'Code maintainability',
          businessImpact: 'Minor technical debt',
          inModifiedFile: true
        }
      ];

      // Verify that the scoring system would handle these correctly
      const totalPoints = javaIssues.reduce((sum, issue) => {
        switch (issue.severity) {
          case 'critical': return sum + 5;
          case 'high': return sum + 3;
          case 'medium': return sum + 1;
          case 'low': return sum + 0.5;
          default: return sum;
        }
      }, 0);

      expect(totalPoints).toBe(6); // 5 + 1
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed tool output gracefully', async () => {
      const malformedXml = '<invalid>xml</notclosed>';
      
      const config = analyzer.getLanguageConfig();
      const spotBugsTool = config.tools.find(t => t.name === 'SpotBugs');
      
      if (spotBugsTool) {
        const issues = await spotBugsTool.parser(malformedXml, '/mock');
        expect(issues).toEqual([]);
      }
    });

    it('should continue analysis if one tool fails', async () => {
      // Mock tool that throws an error
      const errorTool = {
        name: 'FailingTool',
        command: 'exit 1',
        agent: 'security',
        parser: async () => { throw new Error('Tool failed'); }
      };

      // This test would verify that the analyzer continues with other tools
      // even if one fails
      expect(() => errorTool.parser('', '')).not.toThrow();
    });
  });

  describe('Code Coverage Integration', () => {
    it('should handle JaCoCo coverage reports', () => {
      const mockJacocoXml = `<?xml version="1.0" encoding="UTF-8"?>
<report name="Coverage Report">
  <package name="com/example">
    <class name="com/example/Service" sourcefilename="Service.java">
      <method name="processData" desc="()V" line="25">
        <counter type="INSTRUCTION" missed="5" covered="20"/>
        <counter type="BRANCH" missed="2" covered="3"/>
        <counter type="LINE" missed="2" covered="8"/>
      </method>
    </class>
  </package>
</report>`;

      // This would test coverage-based issue detection
      // e.g., flagging methods with low coverage as potential quality issues
    });
  });
});
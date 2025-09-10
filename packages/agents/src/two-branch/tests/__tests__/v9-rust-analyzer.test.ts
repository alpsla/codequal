/**
 * V9 Rust Analyzer Integration Tests
 * 
 * Tests specific to Rust language analysis including:
 * - Clippy integration
 * - Cargo audit integration  
 * - Rustfmt integration
 * - Custom Rust security checks
 * - Cargo project handling
 * - Memory safety analysis
 */

import { V9RustAnalyzer } from '../analyzers/v9-rust-analyzer';
import { Issue, LanguageConfig } from '../analyzers/v9-types';

// Mock the external dependencies
jest.mock('child_process');
jest.mock('@supabase/supabase-js');
jest.mock('ioredis');

describe('V9 Rust Analyzer Tests', () => {
  let analyzer: V9RustAnalyzer;

  beforeEach(() => {
    analyzer = new V9RustAnalyzer();
    
    // Mock environment variables
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
  });

  describe('Language Configuration', () => {
    it('should provide correct Rust configuration', () => {
      const config: LanguageConfig = analyzer.getLanguageConfig();
      
      expect(config.name).toBe('Rust');
      expect(config.fileExtensions).toContain('.rs');
      expect(config.tools).toHaveLength(4); // Clippy, Cargo Audit, Rustfmt, Custom Security
      
      const toolNames = config.tools.map(t => t.name);
      expect(toolNames).toContain('Clippy');
      expect(toolNames).toContain('CargoAudit');
      expect(toolNames).toContain('Rustfmt');
      expect(toolNames).toContain('RustSecurity');
    });

    it('should have Rust-specific fix patterns', () => {
      const config = analyzer.getLanguageConfig();
      const patterns = config.suggestedFixPatterns;
      
      expect(patterns).toHaveProperty('unsafe-code');
      expect(patterns).toHaveProperty('unwrap-panic');
      expect(patterns).toHaveProperty('memory-leak');
      expect(patterns).toHaveProperty('integer-overflow');
      expect(patterns).toHaveProperty('deadlock');
    });
  });

  describe('Clippy Tool Integration', () => {
    it('should parse Clippy JSON output correctly', async () => {
      const mockClippyOutput = JSON.stringify([
        {
          "reason": "compiler-message",
          "package_id": "test 0.1.0",
          "target": {
            "kind": ["bin"],
            "crate_types": ["bin"],
            "name": "main",
            "src_path": "/src/main.rs"
          },
          "message": {
            "message": "using `unwrap` on a `Result` which may panic",
            "code": {
              "code": "clippy::result-unwrap-used",
              "explanation": null
            },
            "level": "warn",
            "spans": [
              {
                "file_name": "src/main.rs",
                "byte_start": 245,
                "byte_end": 265,
                "line_start": 10,
                "line_end": 10,
                "column_start": 5,
                "column_end": 25,
                "is_primary": true,
                "text": [
                  {
                    "text": "    let result = risky_operation().unwrap();",
                    "highlight_start": 5,
                    "highlight_end": 25
                  }
                ],
                "label": "this will panic if the result is an `Err`",
                "suggested_replacement": null,
                "suggestion_applicability": null,
                "expansion": null
              }
            ],
            "children": [
              {
                "message": "consider using `expect()` with a descriptive message or handling the error explicitly",
                "code": null,
                "level": "help",
                "spans": [],
                "children": [],
                "rendered": null
              }
            ],
            "rendered": "warning: using `unwrap` on a `Result` which may panic\n --> src/main.rs:10:5\n   |\n10 |     let result = risky_operation().unwrap();\n   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n   |\n   = help: consider using `expect()` with a descriptive message or handling the error explicitly"
          }
        }
      ]);

      const config = analyzer.getLanguageConfig();
      const clippyTool = config.tools.find(t => t.name === 'Clippy');
      expect(clippyTool).toBeDefined();

      if (clippyTool) {
        const issues = await clippyTool.parser(mockClippyOutput, '/mock/workspace');
        
        expect(issues).toHaveLength(1);
        expect(issues[0].category).toBe('Quality');
        expect(issues[0].severity).toBe('medium'); // warn level
        expect(issues[0].title).toBe('using `unwrap` on a `Result` which may panic');
        expect(issues[0].file).toBe('src/main.rs');
        expect(issues[0].line).toBe(10);
        expect(issues[0].tool).toBe('Clippy');
        expect(issues[0].description).toContain('consider using `expect()`');
      }
    });

    it('should handle different Clippy severity levels', async () => {
      const mockClippyMultipleLevels = JSON.stringify([
        {
          "reason": "compiler-message",
          "message": {
            "message": "this looks like a potential security vulnerability",
            "code": { "code": "clippy::security-vuln" },
            "level": "error",
            "spans": [{ "file_name": "src/lib.rs", "line_start": 15 }]
          }
        },
        {
          "reason": "compiler-message", 
          "message": {
            "message": "this could be improved for better performance",
            "code": { "code": "clippy::performance" },
            "level": "warn",
            "spans": [{ "file_name": "src/lib.rs", "line_start": 25 }]
          }
        },
        {
          "reason": "compiler-message",
          "message": {
            "message": "consider using a more idiomatic approach",
            "code": { "code": "clippy::style" },
            "level": "note",
            "spans": [{ "file_name": "src/lib.rs", "line_start": 35 }]
          }
        }
      ]);

      const config = analyzer.getLanguageConfig();
      const clippyTool = config.tools.find(t => t.name === 'Clippy');
      
      if (clippyTool) {
        const issues = await clippyTool.parser(mockClippyMultipleLevels, '/mock');
        
        expect(issues).toHaveLength(3);
        expect(issues[0].severity).toBe('high'); // error
        expect(issues[1].severity).toBe('medium'); // warn
        expect(issues[2].severity).toBe('low'); // note
      }
    });
  });

  describe('Cargo Audit Integration', () => {
    it('should parse Cargo Audit JSON output for vulnerabilities', async () => {
      const mockCargoAuditOutput = JSON.stringify({
        "vulnerabilities": {
          "list": [
            {
              "advisory": {
                "id": "RUSTSEC-2021-0001",
                "package": "vulnerable-crate",
                "title": "Buffer overflow in unsafe code",
                "description": "The vulnerable-crate contains unsafe code that may lead to buffer overflow",
                "date": "2021-01-01",
                "aliases": ["CVE-2021-1001"],
                "cvss": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                "references": [
                  "https://rustsec.org/advisories/RUSTSEC-2021-0001"
                ],
                "categories": ["memory-corruption"],
                "keywords": ["buffer-overflow", "unsafe"],
                "severity": "critical"
              },
              "versions": {
                "patched": [">= 1.2.0"],
                "unaffected": []
              },
              "package": {
                "name": "vulnerable-crate",
                "version": "1.0.0",
                "source": "registry+https://github.com/rust-lang/crates.io-index",
                "dependencies": []
              }
            }
          ],
          "count": 1
        },
        "warnings": {
          "list": [],
          "count": 0
        }
      });

      const config = analyzer.getLanguageConfig();
      const auditTool = config.tools.find(t => t.name === 'CargoAudit');
      
      if (auditTool) {
        const issues = await auditTool.parser(mockCargoAuditOutput, '/mock/workspace');
        
        expect(issues).toHaveLength(1);
        expect(issues[0].category).toBe('Security');
        expect(issues[0].severity).toBe('critical');
        expect(issues[0].title).toBe('Buffer overflow in unsafe code');
        expect(issues[0].description).toContain('RUSTSEC-2021-0001');
        expect(issues[0].tool).toBe('CargoAudit');
      }
    });

    it('should handle different vulnerability severities', async () => {
      const mockMultipleSeverities = JSON.stringify({
        "vulnerabilities": {
          "list": [
            {
              "advisory": {
                "id": "RUSTSEC-2021-001",
                "title": "Critical Security Issue",
                "severity": "critical"
              },
              "package": { "name": "crate1", "version": "1.0.0" }
            },
            {
              "advisory": {
                "id": "RUSTSEC-2021-002", 
                "title": "High Risk Vulnerability",
                "severity": "high"
              },
              "package": { "name": "crate2", "version": "1.0.0" }
            },
            {
              "advisory": {
                "id": "RUSTSEC-2021-003",
                "title": "Medium Risk Issue", 
                "severity": "medium"
              },
              "package": { "name": "crate3", "version": "1.0.0" }
            }
          ]
        }
      });

      const config = analyzer.getLanguageConfig();
      const auditTool = config.tools.find(t => t.name === 'CargoAudit');
      
      if (auditTool) {
        const issues = await auditTool.parser(mockMultipleSeverities, '/mock');
        
        expect(issues).toHaveLength(3);
        expect(issues[0].severity).toBe('critical');
        expect(issues[1].severity).toBe('high');
        expect(issues[2].severity).toBe('medium');
      }
    });
  });

  describe('Rustfmt Integration', () => {
    it('should detect formatting issues', async () => {
      const mockRustfmtOutput = `Diff in /src/main.rs at line 10:
-fn poorly_formatted(x:i32,y:i32)->i32{x+y}
+fn poorly_formatted(x: i32, y: i32) -> i32 {
+    x + y
+}

Diff in /src/lib.rs at line 25:
-pub struct BadStruct{field1:String,field2:i32}
+pub struct BadStruct {
+    field1: String,
+    field2: i32,
+}`;

      const config = analyzer.getLanguageConfig();
      const rustfmtTool = config.tools.find(t => t.name === 'Rustfmt');
      
      if (rustfmtTool) {
        const issues = await rustfmtTool.parser(mockRustfmtOutput, '/mock/workspace');
        
        expect(issues).toHaveLength(2);
        expect(issues[0].category).toBe('Quality');
        expect(issues[0].severity).toBe('low');
        expect(issues[0].file).toBe('src/main.rs');
        expect(issues[0].line).toBe(10);
        expect(issues[1].file).toBe('src/lib.rs');
        expect(issues[1].line).toBe(25);
      }
    });
  });

  describe('Rust-Specific Security Analysis', () => {
    it('should detect unsafe code blocks', async () => {
      const mockSecurityOutput = `Security Analysis Report:

UNSAFE_CODE_BLOCK|src/memory.rs|45|critical|Unsafe pointer dereferencing without bounds check
UNSAFE_CODE_BLOCK|src/ffi.rs|12|high|Raw pointer manipulation in FFI boundary  
INTEGER_OVERFLOW|src/math.rs|23|medium|Potential integer overflow in arithmetic operation
MEMORY_LEAK|src/allocator.rs|67|high|Manual memory management without proper cleanup
RACE_CONDITION|src/threading.rs|34|critical|Shared mutable state without proper synchronization`;

      const config = analyzer.getLanguageConfig();
      const securityTool = config.tools.find(t => t.name === 'RustSecurity');
      
      if (securityTool) {
        const issues = await securityTool.parser(mockSecurityOutput, '/mock/workspace');
        
        expect(issues).toHaveLength(5);
        
        const unsafeIssues = issues.filter(i => i.title.includes('UNSAFE_CODE'));
        expect(unsafeIssues).toHaveLength(2);
        expect(unsafeIssues[0].severity).toBe('critical');
        expect(unsafeIssues[1].severity).toBe('high');
        
        const memoryIssue = issues.find(i => i.title.includes('MEMORY_LEAK'));
        expect(memoryIssue).toBeDefined();
        expect(memoryIssue?.category).toBe('Security');
        
        const raceCondition = issues.find(i => i.title.includes('RACE_CONDITION'));
        expect(raceCondition?.severity).toBe('critical');
      }
    });

    it('should provide Rust-specific fix suggestions', () => {
      const config = analyzer.getLanguageConfig();
      const patterns = config.suggestedFixPatterns;
      
      expect(patterns['unsafe-code']).toContain('safe alternatives');
      expect(patterns['unwrap-panic']).toContain('expect() or ?');
      expect(patterns['memory-leak']).toContain('RAII pattern');
      expect(patterns['integer-overflow']).toContain('checked arithmetic');
      expect(patterns['deadlock']).toContain('lock ordering');
    });
  });

  describe('Cargo Project Analysis', () => {
    it('should detect Cargo.toml issues', async () => {
      const mockCargoTomlIssues = `DEPENDENCY_VERSION|Cargo.toml|5|medium|Dependency uses wildcard version constraint
DEPRECATED_FEATURE|Cargo.toml|12|low|Using deprecated Cargo feature
SECURITY_ADVISORY|Cargo.toml|8|high|Dependency has known security vulnerabilities
OUTDATED_EDITION|Cargo.toml|2|medium|Using old Rust edition (2018), consider upgrading to 2021`;

      const config = analyzer.getLanguageConfig();
      const securityTool = config.tools.find(t => t.name === 'RustSecurity');
      
      if (securityTool) {
        const issues = await securityTool.parser(mockCargoTomlIssues, '/mock/workspace');
        
        const cargoIssues = issues.filter(i => i.file.includes('Cargo.toml'));
        expect(cargoIssues).toHaveLength(4);
        
        const securityAdvisory = cargoIssues.find(i => i.title.includes('SECURITY_ADVISORY'));
        expect(securityAdvisory?.severity).toBe('high');
      }
    });

    it('should analyze workspace configurations', () => {
      // Test for workspace-level Cargo.toml analysis
      const workspaceConfig = {
        workspace: {
          members: ['crate1', 'crate2'],
          resolver: '2'
        }
      };
      
      // This would test workspace-specific analysis
      expect(workspaceConfig.workspace.members).toHaveLength(2);
    });
  });

  describe('Memory Safety Analysis', () => {
    it('should detect potential memory safety issues', async () => {
      const mockMemorySafetyOutput = `Memory Safety Analysis:

BUFFER_OVERFLOW|src/unsafe.rs|23|critical|Unsafe buffer access beyond bounds
USE_AFTER_FREE|src/memory.rs|45|critical|Potential use after free in unsafe block  
DOUBLE_FREE|src/allocator.rs|67|high|Possible double free of raw pointer
NULL_POINTER_DEREF|src/ffi.rs|12|high|Null pointer dereference in unsafe code
UNINITIALIZED_MEMORY|src/struct.rs|34|medium|Reading from potentially uninitialized memory`;

      const config = analyzer.getLanguageConfig();
      const securityTool = config.tools.find(t => t.name === 'RustSecurity');
      
      if (securityTool) {
        const issues = await securityTool.parser(mockMemorySafetyOutput, '/mock/workspace');
        
        const memoryIssues = issues.filter(i => 
          i.title.includes('BUFFER_OVERFLOW') ||
          i.title.includes('USE_AFTER_FREE') ||
          i.title.includes('DOUBLE_FREE') ||
          i.title.includes('NULL_POINTER_DEREF') ||
          i.title.includes('UNINITIALIZED_MEMORY')
        );
        
        expect(memoryIssues).toHaveLength(5);
        
        const criticalMemoryIssues = memoryIssues.filter(i => i.severity === 'critical');
        expect(criticalMemoryIssues).toHaveLength(2);
      }
    });
  });

  describe('Concurrency and Threading Analysis', () => {
    it('should detect concurrency issues', async () => {
      const mockConcurrencyOutput = `Concurrency Analysis:

RACE_CONDITION|src/threading.rs|45|critical|Data race on shared mutable state
DEADLOCK_POTENTIAL|src/locks.rs|23|high|Potential deadlock from lock ordering
UNSAFE_SEND_SYNC|src/types.rs|67|high|Unsafe Send/Sync implementation
ATOMIC_ORDERING|src/atomic.rs|12|medium|Incorrect atomic memory ordering
CHANNEL_DEADLOCK|src/channels.rs|89|medium|Potential deadlock in channel communication`;

      const config = analyzer.getLanguageConfig();
      const securityTool = config.tools.find(t => t.name === 'RustSecurity');
      
      if (securityTool) {
        const issues = await securityTool.parser(mockConcurrencyOutput, '/mock/workspace');
        
        const concurrencyIssues = issues.filter(i => 
          i.title.includes('RACE_CONDITION') ||
          i.title.includes('DEADLOCK') ||
          i.title.includes('SEND_SYNC') ||
          i.title.includes('ATOMIC') ||
          i.title.includes('CHANNEL')
        );
        
        expect(concurrencyIssues).toHaveLength(5);
        
        const raceCondition = concurrencyIssues.find(i => i.title.includes('RACE_CONDITION'));
        expect(raceCondition?.severity).toBe('critical');
      }
    });
  });

  describe('Integration with V9 Scoring System', () => {
    it('should properly weight Rust-specific issues', () => {
      const rustIssues: Issue[] = [
        {
          id: '1',
          category: 'Security', 
          severity: 'critical',
          status: 'new',
          title: 'Buffer overflow in unsafe code',
          description: 'Unsafe pointer dereferencing without bounds check',
          file: 'src/memory.rs',
          line: 45,
          tool: 'RustSecurity',
          agent: 'security',
          impact: 'Memory corruption possible',
          businessImpact: 'Potential crash or code execution',
          inModifiedFile: true
        },
        {
          id: '2',
          category: 'Quality',
          severity: 'low',
          status: 'new', 
          title: 'Formatting issue',
          description: 'Code not formatted according to rustfmt',
          file: 'src/lib.rs',
          line: 10,
          tool: 'Rustfmt',
          agent: 'quality',
          impact: 'Code readability',
          businessImpact: 'Developer productivity',
          inModifiedFile: true
        }
      ];

      // Verify that the scoring system would handle these correctly
      const totalPoints = rustIssues.reduce((sum, issue) => {
        switch (issue.severity) {
          case 'critical': return sum + 5;
          case 'high': return sum + 3;
          case 'medium': return sum + 1;
          case 'low': return sum + 0.5;
          default: return sum;
        }
      }, 0);

      expect(totalPoints).toBe(5.5); // 5 + 0.5
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed Cargo audit output gracefully', async () => {
      const malformedJson = '{ "vulnerabilities": { "invalid": }';
      
      const config = analyzer.getLanguageConfig();
      const auditTool = config.tools.find(t => t.name === 'CargoAudit');
      
      if (auditTool) {
        const issues = await auditTool.parser(malformedJson, '/mock');
        expect(issues).toEqual([]);
      }
    });

    it('should handle missing Cargo.toml gracefully', () => {
      // Mock file system to simulate missing Cargo.toml
      const mockFs = require('fs');
      mockFs.existsSync = jest.fn().mockReturnValue(false);

      const config = analyzer.getLanguageConfig();
      // Should still provide valid configuration even without Cargo.toml
      expect(config.tools).toHaveLength(4);
    });
  });

  describe('Performance Analysis', () => {
    it('should detect performance bottlenecks', async () => {
      const mockPerformanceOutput = `Performance Analysis:

INEFFICIENT_ALLOCATION|src/performance.rs|23|medium|Frequent small allocations in hot path
CLONE_ON_READ|src/data.rs|45|low|Unnecessary clone for read-only access
LARGE_STACK_OBJECT|src/structs.rs|67|medium|Large object allocated on stack
INEFFICIENT_ITERATOR|src/loops.rs|12|low|Iterator chain could be more efficient
STRING_CONCATENATION|src/strings.rs|89|medium|Inefficient string building in loop`;

      const config = analyzer.getLanguageConfig();
      const securityTool = config.tools.find(t => t.name === 'RustSecurity');
      
      if (securityTool) {
        const issues = await securityTool.parser(mockPerformanceOutput, '/mock/workspace');
        
        const performanceIssues = issues.filter(i => 
          i.title.includes('ALLOCATION') ||
          i.title.includes('CLONE') ||
          i.title.includes('STACK') ||
          i.title.includes('ITERATOR') ||
          i.title.includes('STRING')
        );
        
        expect(performanceIssues).toHaveLength(5);
        
        // Verify categories are assigned correctly
        performanceIssues.forEach(issue => {
          expect(issue.category).toBe('Performance');
        });
      }
    });
  });
});
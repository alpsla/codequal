/**
 * Unit tests for Rust Security Agent
 */

import { RustSecurityAgent } from '../RustSecurityAgent';
import { FileInfo, SecurityIssue } from '../../interfaces/agent-interfaces';

describe('RustSecurityAgent', () => {
  let agent: RustSecurityAgent;
  let mockMonitoring: any;

  beforeEach(() => {
    mockMonitoring = {
      trackCost: jest.fn(),
      startPerformance: jest.fn().mockReturnValue('perf-123'),
      endPerformance: jest.fn()
    };
    agent = new RustSecurityAgent(mockMonitoring);
  });

  describe('analyzeBranch', () => {
    it('should return empty array for non-Rust files', async () => {
      const files: FileInfo[] = [
        { path: 'test.js', content: 'console.log("test");', branch: 'main' },
        { path: 'test.py', content: 'print("test")', branch: 'main' }
      ];

      const issues = await agent.analyzeBranch('main', files);
      expect(issues).toEqual([]);
    });

    it('should analyze Rust files', async () => {
      const files: FileInfo[] = [
        { 
          path: 'main.rs', 
          content: 'fn main() { println!("Hello"); }', 
          branch: 'main' 
        }
      ];

      // Mock executeTool
      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');

      const issues = await agent.analyzeBranch('main', files);
      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('Memory Safety Detection', () => {
    it('should detect unsafe blocks', async () => {
      const files: FileInfo[] = [{
        path: 'unsafe_code.rs',
        content: `fn dangerous() {
    unsafe {
        let raw_ptr = 0x12345usize as *mut i32;
        *raw_ptr = 42;
    }
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const unsafeIssue = issues.find(i => i.cwe === 'CWE-242');
      expect(unsafeIssue).toBeDefined();
      expect(unsafeIssue?.severity).toBe('high');
      expect(unsafeIssue?.title).toContain('Unsafe Block Usage');
    });

    it('should detect use-after-free patterns', async () => {
      const files: FileInfo[] = [{
        path: 'memory_bug.rs',
        content: `fn use_after_free() {
    let mut vec = vec![1, 2, 3];
    let ptr = vec.as_mut_ptr();
    drop(vec);
    unsafe { *ptr = 4; }  // Use after free!
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const uafIssue = issues.find(i => i.cwe === 'CWE-416');
      expect(uafIssue).toBeDefined();
      expect(uafIssue?.severity).toBe('critical');
    });

    it('should detect double-free patterns', async () => {
      const files: FileInfo[] = [{
        path: 'double_free.rs',
        content: `use std::alloc::{dealloc, Layout};

fn double_free() {
    unsafe {
        let layout = Layout::new::<i32>();
        let ptr = std::alloc::alloc(layout);
        dealloc(ptr, layout);
        dealloc(ptr, layout); // Double free!
    }
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const doubleFreeIssue = issues.find(i => i.cwe === 'CWE-415');
      expect(doubleFreeIssue).toBeDefined();
      expect(doubleFreeIssue?.severity).toBe('critical');
    });
  });

  describe('Integer Overflow Detection', () => {
    it('should detect potential integer overflow', async () => {
      const files: FileInfo[] = [{
        path: 'overflow.rs',
        content: `fn overflow_example() {
    let a: u8 = 255;
    let b = a + 1;  // Overflow in release mode
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const overflowIssue = issues.find(i => i.cwe === 'CWE-190');
      expect(overflowIssue).toBeDefined();
      expect(overflowIssue?.severity).toBe('high');
    });

    it('should detect unchecked arithmetic operations', async () => {
      const files: FileInfo[] = [{
        path: 'unchecked_math.rs',
        content: `fn unchecked_operations() {
    let x: i32 = i32::MAX;
    let y = x * 2;  // Potential overflow
    let z = x + x;  // Potential overflow
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const overflowIssues = issues.filter(i => i.cwe === 'CWE-190');
      expect(overflowIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Panic and Unwrap Detection', () => {
    it('should detect unwrap() usage', async () => {
      const files: FileInfo[] = [{
        path: 'panic_risk.rs',
        content: `fn risky_function() {
    let option: Option<i32> = None;
    let value = option.unwrap();  // Will panic!
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const panicIssue = issues.find(i => i.title?.includes('Panic Risk'));
      expect(panicIssue).toBeDefined();
      expect(panicIssue?.severity).toBe('medium');
    });

    it('should detect expect() usage', async () => {
      const files: FileInfo[] = [{
        path: 'expect_panic.rs',
        content: `fn expect_example() {
    let result: Result<i32, String> = Err("error".to_string());
    let value = result.expect("This will panic");
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const panicIssue = issues.find(i => i.title?.includes('Panic Risk'));
      expect(panicIssue).toBeDefined();
    });

    it('should detect panic!() macro usage', async () => {
      const files: FileInfo[] = [{
        path: 'explicit_panic.rs',
        content: `fn will_panic() {
    if true {
        panic!("Explicit panic!");
    }
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const panicIssue = issues.find(i => i.title?.includes('Panic Risk'));
      expect(panicIssue).toBeDefined();
    });
  });

  describe('Tool Output Parsing', () => {
    it('should parse cargo-audit JSON output', () => {
      const output = JSON.stringify({
        vulnerabilities: {
          list: [{
            advisory: {
              id: 'RUSTSEC-2021-0001',
              package: 'vulnerable-crate',
              title: 'Buffer overflow in vulnerable-crate',
              description: 'A buffer overflow exists...',
              cvss: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
            },
            versions: {
              patched: ['>=1.0.2'],
              unaffected: []
            }
          }]
        }
      });

      const files: FileInfo[] = [];
      const issues = (agent as any).parseCargoAuditOutput(output, files);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].title).toContain('Buffer overflow');
      expect(issues[0].severity).toBe('critical');
    });

    it('should parse clippy JSON output', () => {
      const output = JSON.stringify([{
        reason: 'compiler-message',
        message: {
          code: {
            code: 'clippy::unwrap_used',
            explanation: null
          },
          level: 'warning',
          message: 'used unwrap() on an Option value',
          spans: [{
            file_name: 'src/main.rs',
            line_start: 10,
            line_end: 10,
            column_start: 5,
            column_end: 20
          }]
        }
      }]);

      const files: FileInfo[] = [];
      const issues = (agent as any).parseClippyOutput(output, files);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].line).toBe(10);
      expect(issues[0].title).toContain('unwrap');
    });

    it('should parse cargo-geiger output', () => {
      const output = `
Scanning dependencies...
Found 5 unsafe functions
Found 3 unsafe expressions
Found 2 unsafe traits
      `;

      const files: FileInfo[] = [];
      const issues = (agent as any).parseCargoGeigerOutput(output, files);
      
      expect(issues.length).toBeGreaterThan(0);
      const unsafeIssue = issues.find(i => i.title?.includes('Unsafe Code Usage'));
      expect(unsafeIssue).toBeDefined();
    });

    it('should parse rudra output', () => {
      const output = JSON.stringify({
        bugs: [{
          bug_type: 'UseAfterFree',
          file: 'src/lib.rs',
          line: 42,
          column: 8,
          message: 'Potential use-after-free detected',
          severity: 'High'
        }]
      });

      const files: FileInfo[] = [];
      const issues = (agent as any).parseRudraOutput(output, files);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].cwe).toBe('CWE-416');
      expect(issues[0].line).toBe(42);
    });
  });

  describe('Multiple File Analysis', () => {
    it('should analyze multiple Rust files', async () => {
      const files: FileInfo[] = [
        {
          path: 'unsafe.rs',
          content: 'unsafe { std::ptr::null_mut() }',
          branch: 'main'
        },
        {
          path: 'overflow.rs',
          content: 'let x: u8 = 255; let y = x + 1;',
          branch: 'main'
        },
        {
          path: 'panic.rs',
          content: 'None.unwrap()',
          branch: 'main'
        }
      ];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      // Should find unsafe code, overflow, and panic risks
      expect(issues.length).toBeGreaterThanOrEqual(3);
      
      const hasUnsafe = issues.some(i => i.cwe === 'CWE-242');
      const hasOverflow = issues.some(i => i.cwe === 'CWE-190');
      const hasPanic = issues.some(i => i.title?.includes('Panic'));
      
      expect(hasUnsafe).toBe(true);
      expect(hasOverflow).toBe(true);
      expect(hasPanic).toBe(true);
    });

    it('should handle Cargo.toml files', async () => {
      const files: FileInfo[] = [
        {
          path: 'Cargo.toml',
          content: `[dependencies]
vulnerable-crate = "0.1.0"
outdated-lib = "1.0.0"`,
          branch: 'main'
        }
      ];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      // Should trigger cargo-audit for dependency scanning
      expect(issues).toBeDefined();
    });
  });

  describe('FFI Safety Detection', () => {
    it('should detect FFI usage', async () => {
      const files: FileInfo[] = [{
        path: 'ffi.rs',
        content: `extern "C" {
    fn external_function(ptr: *mut i32);
}

fn call_ffi() {
    unsafe {
        let mut value = 42;
        external_function(&mut value as *mut i32);
    }
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const ffiIssue = issues.find(i => i.title?.includes('FFI'));
      expect(ffiIssue).toBeDefined();
    });
  });

  describe('Data Race Detection', () => {
    it('should detect potential data races', async () => {
      const files: FileInfo[] = [{
        path: 'data_race.rs',
        content: `use std::thread;
static mut COUNTER: i32 = 0;

fn data_race() {
    let handle = thread::spawn(|| {
        unsafe { COUNTER += 1; }
    });
    unsafe { COUNTER += 1; }  // Data race!
    handle.join().unwrap();
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const dataRaceIssue = issues.find(i => i.title?.includes('Data Race') || i.cwe === 'CWE-362');
      expect(dataRaceIssue).toBeDefined();
    });
  });

  describe('Issue Deduplication', () => {
    it('should deduplicate identical issues', async () => {
      const files: FileInfo[] = [{
        path: 'duplicate.rs',
        content: `fn duplicate_issues() {
    None.unwrap();
    None.unwrap();  // Same issue
    Some(1).unwrap();  // Different, safe unwrap
}`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      // Should report unique issues by line
      const panicIssues = issues.filter(i => 
        i.title?.includes('Panic') && 
        i.file === 'duplicate.rs'
      );
      
      // Check that duplicates are removed
      const uniqueLines = new Set(panicIssues.map(i => i.line));
      expect(uniqueLines.size).toBe(panicIssues.length);
    });
  });

  describe('Supply Chain Security', () => {
    it('should detect vulnerable dependencies', async () => {
      const files: FileInfo[] = [{
        path: 'Cargo.lock',
        content: `[[package]]
name = "vulnerable-crate"
version = "0.1.0"

[[package]]
name = "safe-crate"
version = "2.0.0"`,
        branch: 'main'
      }];

      // Mock cargo-audit to return vulnerability
      jest.spyOn(agent as any, 'executeTool').mockImplementation((tool: string) => {
        if (tool.includes('cargo audit')) {
          return JSON.stringify({
            vulnerabilities: {
              list: [{
                advisory: {
                  id: 'RUSTSEC-2021-0001',
                  package: 'vulnerable-crate',
                  title: 'Known vulnerability'
                }
              }]
            }
          });
        }
        return '';
      });

      const issues = await agent.analyzeBranch('main', files);
      
      const vulnIssue = issues.find(i => i.title?.includes('vulnerability'));
      expect(vulnIssue).toBeDefined();
    });
  });
});
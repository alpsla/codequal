/**
 * Unit tests for PHP Security Agent
 */

import { PHPSecurityAgent } from '../PHPSecurityAgent';
import { FileInfo, SecurityIssue } from '../../interfaces/agent-interfaces';

describe('PHPSecurityAgent', () => {
  let agent: PHPSecurityAgent;
  let mockMonitoring: any;

  beforeEach(() => {
    mockMonitoring = {
      trackCost: jest.fn(),
      startPerformance: jest.fn().mockReturnValue('perf-123'),
      endPerformance: jest.fn()
    };
    agent = new PHPSecurityAgent(mockMonitoring);
  });

  describe('analyzeBranch', () => {
    it('should return empty array for non-PHP files', async () => {
      const files: FileInfo[] = [
        { path: 'test.js', content: 'console.log("test");', branch: 'main' },
        { path: 'test.py', content: 'print("test")', branch: 'main' }
      ];

      const issues = await agent.analyzeBranch('main', files);
      expect(issues).toEqual([]);
    });

    it('should analyze PHP files', async () => {
      const files: FileInfo[] = [
        { 
          path: 'test.php', 
          content: '<?php echo "Hello"; ?>', 
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

  describe('SQL Injection Detection', () => {
    it('should detect SQL injection with direct $_GET usage', async () => {
      const files: FileInfo[] = [{
        path: 'vulnerable.php',
        content: `<?php
$id = $_GET['id'];
$query = "SELECT * FROM users WHERE id = '$id'";
mysql_query($query);
?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const sqlInjection = issues.find(i => i.cwe === 'CWE-89');
      expect(sqlInjection).toBeDefined();
      expect(sqlInjection?.severity).toBe('critical');
      expect(sqlInjection?.title).toContain('SQL Injection');
    });

    it('should detect SQL injection with mysqli', async () => {
      const files: FileInfo[] = [{
        path: 'mysqli_vulnerable.php',
        content: `<?php
$conn = new mysqli($host, $user, $pass, $db);
$id = $_POST['user_id'];
mysqli_query($conn, "DELETE FROM users WHERE id = $id");
?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const sqlInjection = issues.find(i => i.cwe === 'CWE-89');
      expect(sqlInjection).toBeDefined();
    });

    it('should detect SQL injection with PDO', async () => {
      const files: FileInfo[] = [{
        path: 'pdo_vulnerable.php',
        content: `<?php
$search = $_REQUEST['search'];
$pdo->query("SELECT * FROM products WHERE name LIKE '%$search%'");
?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const sqlInjection = issues.find(i => i.cwe === 'CWE-89');
      expect(sqlInjection).toBeDefined();
    });
  });

  describe('XSS Detection', () => {
    it('should detect XSS with echo $_GET', async () => {
      const files: FileInfo[] = [{
        path: 'xss.php',
        content: `<?php
echo $_GET['name'];
echo "Welcome " . $_POST['username'];
?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const xssIssues = issues.filter(i => i.cwe === 'CWE-79');
      expect(xssIssues.length).toBeGreaterThan(0);
      expect(xssIssues[0].severity).toBe('high');
    });

    it('should detect XSS with print', async () => {
      const files: FileInfo[] = [{
        path: 'print_xss.php',
        content: `<?php print $_COOKIE['session']; ?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const xss = issues.find(i => i.cwe === 'CWE-79');
      expect(xss).toBeDefined();
    });

    it('should detect XSS with PHP short tags', async () => {
      const files: FileInfo[] = [{
        path: 'short_tag_xss.php',
        content: `<?= $_REQUEST['data'] ?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const xss = issues.find(i => i.cwe === 'CWE-79');
      expect(xss).toBeDefined();
    });
  });

  describe('Command Injection Detection', () => {
    it('should detect command injection with exec', async () => {
      const files: FileInfo[] = [{
        path: 'cmd_injection.php',
        content: `<?php
$file = $_GET['file'];
exec("cat /var/log/" . $file);
?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const cmdInjection = issues.find(i => i.cwe === 'CWE-78');
      expect(cmdInjection).toBeDefined();
      expect(cmdInjection?.severity).toBe('critical');
    });

    it('should detect command injection with system', async () => {
      const files: FileInfo[] = [{
        path: 'system_cmd.php',
        content: `<?php system($_POST['command']); ?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const cmdInjection = issues.find(i => i.cwe === 'CWE-78');
      expect(cmdInjection).toBeDefined();
    });

    it('should detect command injection with backticks', async () => {
      const files: FileInfo[] = [{
        path: 'backtick_cmd.php',
        content: '<?php $output = `ls $_GET["dir"]`; ?>',
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const cmdInjection = issues.find(i => i.cwe === 'CWE-78');
      expect(cmdInjection).toBeDefined();
    });
  });

  describe('File Inclusion Detection', () => {
    it('should detect file inclusion with include', async () => {
      const files: FileInfo[] = [{
        path: 'file_inclusion.php',
        content: `<?php
$page = $_GET['page'];
include($page . '.php');
?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const fileInclusion = issues.find(i => i.cwe === 'CWE-98');
      expect(fileInclusion).toBeDefined();
      expect(fileInclusion?.severity).toBe('high');
    });

    it('should detect file inclusion with require', async () => {
      const files: FileInfo[] = [{
        path: 'require_vuln.php',
        content: `<?php require $_REQUEST['template']; ?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const fileInclusion = issues.find(i => i.cwe === 'CWE-98');
      expect(fileInclusion).toBeDefined();
    });
  });

  describe('Weak Cryptography Detection', () => {
    it('should detect MD5 usage', async () => {
      const files: FileInfo[] = [{
        path: 'weak_crypto.php',
        content: `<?php
$password = md5($_POST['password']);
$hash = sha1($data);
?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const weakCrypto = issues.filter(i => i.cwe === 'CWE-327');
      expect(weakCrypto.length).toBeGreaterThan(0);
      expect(weakCrypto[0].severity).toBe('medium');
    });

    it('should detect weak crypt function', async () => {
      const files: FileInfo[] = [{
        path: 'crypt.php',
        content: `<?php $encrypted = crypt($password); ?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      const weakCrypto = issues.find(i => i.cwe === 'CWE-327');
      expect(weakCrypto).toBeDefined();
    });
  });

  describe('Tool Output Parsing', () => {
    it('should parse PHPCS Security output', () => {
      const output = `FILE: /path/to/file.php
================================================================================
FOUND 2 ERRORS AFFECTING 2 LINES
--------------------------------------------------------------------------------
 45 | ERROR | Possible SQL injection detected
 89 | ERROR | XSS vulnerability found
--------------------------------------------------------------------------------`;

      const files: FileInfo[] = [];
      const issues = (agent as any).parsePHPCSSecurityOutput(output, files);
      
      expect(issues).toHaveLength(2);
      expect(issues[0].line).toBe(45);
      expect(issues[1].line).toBe(89);
    });

    it('should parse Psalm JSON output', () => {
      const output = JSON.stringify({
        issues: [{
          type: 'TaintedSql',
          severity: 'error',
          message: 'SQL injection vulnerability',
          file_path: 'test.php',
          line_from: 10,
          column_from: 5
        }]
      });

      const files: FileInfo[] = [];
      const issues = (agent as any).parsePsalmOutput(output, files);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].cwe).toBe('CWE-89');
      expect(issues[0].type).toBe('security');
    });

    it('should parse PHPStan JSON output', () => {
      const output = JSON.stringify({
        files: [{
          file: 'test.php',
          messages: [{
            message: 'Unsafe eval() usage detected',
            line: 25
          }]
        }]
      });

      const files: FileInfo[] = [];
      const issues = (agent as any).parsePHPStanOutput(output, files);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].line).toBe(25);
    });
  });

  describe('Multiple File Analysis', () => {
    it('should analyze multiple PHP files', async () => {
      const files: FileInfo[] = [
        {
          path: 'file1.php',
          content: '<?php echo $_GET["test"]; ?>',
          branch: 'main'
        },
        {
          path: 'file2.php',
          content: '<?php exec($_POST["cmd"]); ?>',
          branch: 'main'
        },
        {
          path: 'file3.inc',
          content: '<?php include($_GET["file"]); ?>',
          branch: 'main'
        }
      ];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      // Should find XSS, Command Injection, and File Inclusion
      expect(issues.length).toBeGreaterThanOrEqual(3);
      
      const hasXSS = issues.some(i => i.cwe === 'CWE-79');
      const hasCmdInj = issues.some(i => i.cwe === 'CWE-78');
      const hasFileInc = issues.some(i => i.cwe === 'CWE-98');
      
      expect(hasXSS).toBe(true);
      expect(hasCmdInj).toBe(true);
      expect(hasFileInc).toBe(true);
    });
  });

  describe('Issue Deduplication', () => {
    it('should deduplicate identical issues', async () => {
      const files: FileInfo[] = [{
        path: 'duplicate.php',
        content: `<?php
echo $_GET['test'];
echo $_GET['test'];  // Same vulnerability
?>`,
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool').mockResolvedValue('');
      const issues = await agent.analyzeBranch('main', files);
      
      // Should only report unique issues
      const xssIssues = issues.filter(i => 
        i.cwe === 'CWE-79' && 
        i.file === 'duplicate.php'
      );
      
      // Check that duplicates are removed
      const uniqueLines = new Set(xssIssues.map(i => i.line));
      expect(uniqueLines.size).toBe(xssIssues.length);
    });
  });
});
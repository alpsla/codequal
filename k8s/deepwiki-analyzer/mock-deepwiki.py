#!/usr/bin/env python3
"""
Mock DeepWiki Analyzer - Generates comprehensive production-like reports
This simulates the real DeepWiki analyzer output for testing purposes
"""

import json
import sys
import os
import random
import hashlib
from datetime import datetime, timezone
from pathlib import Path

class MockDeepWikiAnalyzer:
    def __init__(self):
        self.severity_distribution = {
            'critical': 0.04,  # 4% critical
            'high': 0.12,      # 12% high
            'medium': 0.34,    # 34% medium
            'low': 0.50        # 50% low
        }
        
        self.issue_templates = {
            'security': [
                {
                    'title': 'Hardcoded API Keys in Repository',
                    'cwe_id': 'CWE-798',
                    'cwe_name': 'Use of Hard-coded Credentials',
                    'cvss_score': 9.8,
                    'pattern': 'api_key|api_secret|password|token'
                },
                {
                    'title': 'SQL Injection Vulnerability',
                    'cwe_id': 'CWE-89',
                    'cwe_name': 'SQL Injection',
                    'cvss_score': 9.1,
                    'pattern': 'SELECT.*FROM.*WHERE.*='
                },
                {
                    'title': 'Cross-Site Scripting (XSS) Vulnerability',
                    'cwe_id': 'CWE-79',
                    'cwe_name': 'Cross-site Scripting',
                    'cvss_score': 7.5,
                    'pattern': 'innerHTML|dangerouslySetInnerHTML'
                },
                {
                    'title': 'Insecure Direct Object Reference',
                    'cwe_id': 'CWE-639',
                    'cwe_name': 'Authorization Bypass',
                    'cvss_score': 8.2,
                    'pattern': 'req.params.id|userId.*params'
                }
            ],
            'performance': [
                {
                    'title': 'N+1 Query Problem Detected',
                    'impact': 'Causes 3+ second load times',
                    'pattern': 'forEach.*await.*find'
                },
                {
                    'title': 'Large Bundle Size',
                    'impact': 'Slow initial page load',
                    'pattern': 'import.*from.*lodash'
                },
                {
                    'title': 'Inefficient Algorithm Complexity',
                    'impact': 'O(n²) complexity causing slowdowns',
                    'pattern': 'for.*for.*array'
                }
            ],
            'maintainability': [
                {
                    'title': 'High Cyclomatic Complexity',
                    'threshold': 15,
                    'pattern': 'if.*if.*if.*if'
                },
                {
                    'title': 'Code Duplication Detected',
                    'threshold': 50,
                    'pattern': 'function.*similar'
                },
                {
                    'title': 'Missing Type Annotations',
                    'impact': 'Reduced type safety',
                    'pattern': ': any|: unknown'
                }
            ]
        }

    def analyze(self, repo_path, output_format='json'):
        """Generate comprehensive analysis report"""
        
        # Count files
        file_stats = self._analyze_files(repo_path)
        
        # Generate issues
        issues = self._generate_issues(file_stats)
        
        # Generate comprehensive report
        report = {
            'scan_completed_at': datetime.now(timezone.utc).isoformat(),
            'scan_duration_ms': random.randint(45000, 65000),
            'repository': {
                'path': repo_path,
                'commit': self._get_git_commit(repo_path),
                'branch': self._get_git_branch(repo_path)
            },
            'scores': self._calculate_scores(issues),
            'statistics': {
                'files_analyzed': file_stats['total_files'],
                'total_issues': len(issues),
                'issues_by_severity': self._count_by_severity(issues),
                'languages': file_stats['languages']
            },
            'vulnerabilities': issues,
            'recommendations': self._generate_recommendations(issues),
            'dependencies': self._analyze_dependencies(repo_path),
            'testing': {
                'coverage_percent': random.randint(60, 85),
                'missing_tests': random.randint(15, 45)
            },
            'quality': {
                'metrics': {
                    'cyclomatic_complexity': round(random.uniform(8, 15), 1),
                    'cognitive_complexity': round(random.uniform(6, 12), 1),
                    'maintainability_index': random.randint(65, 85)
                },
                'duplicated_lines_percent': round(random.uniform(5, 20), 1),
                'technical_debt_hours': len(issues) * random.randint(2, 4)
            }
        }
        
        if output_format == 'json':
            return json.dumps(report, indent=2)
        return report

    def _analyze_files(self, repo_path):
        """Analyze repository files"""
        extensions = {
            '.ts': 'TypeScript',
            '.js': 'JavaScript',
            '.tsx': 'TypeScript',
            '.jsx': 'JavaScript',
            '.py': 'Python',
            '.java': 'Java',
            '.go': 'Go',
            '.rs': 'Rust',
            '.json': 'JSON',
            '.yaml': 'YAML',
            '.yml': 'YAML'
        }
        
        file_count = 0
        language_stats = {}
        
        try:
            for root, dirs, files in os.walk(repo_path):
                # Skip common directories
                dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'dist', 'build']]
                
                for file in files:
                    file_count += 1
                    ext = Path(file).suffix
                    if ext in extensions:
                        lang = extensions[ext]
                        language_stats[lang] = language_stats.get(lang, 0) + 1
        except:
            # Default stats if can't access directory
            file_count = random.randint(800, 1500)
            language_stats = {
                'TypeScript': 65,
                'JavaScript': 20,
                'JSON': 10,
                'Other': 5
            }
        
        # Convert to percentages
        total = sum(language_stats.values()) or 1
        languages = {k: int(v * 100 / total) for k, v in language_stats.items()}
        
        return {
            'total_files': file_count,
            'languages': languages
        }

    def _generate_issues(self, file_stats):
        """Generate realistic issues based on file stats"""
        total_issues = random.randint(200, 350)
        issues = []
        
        # Generate security issues (30%)
        security_count = int(total_issues * 0.3)
        for i in range(security_count):
            template = random.choice(self.issue_templates['security'])
            severity = self._get_random_severity()
            
            issue = {
                'id': f'SEC-{i+1:03d}',
                'severity': severity.upper(),
                'category': 'Security',
                'title': template['title'],
                'location': {
                    'file': self._generate_file_path(),
                    'line': random.randint(10, 500),
                    'column': random.randint(1, 80)
                },
                'impact': self._generate_impact(severity),
                'remediation': {
                    'immediate': f"Fix {template['title'].lower()}",
                    'steps': self._generate_remediation_steps(template['title'])
                }
            }
            
            if 'cwe_id' in template:
                issue['cwe'] = {
                    'id': template['cwe_id'],
                    'name': template['cwe_name']
                }
            
            if 'cvss_score' in template:
                issue['cvss'] = {
                    'score': template['cvss_score'] if severity == 'critical' else template['cvss_score'] - random.uniform(1, 3),
                    'vector': self._generate_cvss_vector(template['cvss_score'])
                }
            
            issue['evidence'] = {
                'snippet': self._generate_code_snippet(template.get('pattern', ''))
            }
            
            issues.append(issue)
        
        # Generate performance issues (25%)
        perf_count = int(total_issues * 0.25)
        for i in range(perf_count):
            template = random.choice(self.issue_templates['performance'])
            severity = random.choice(['high', 'medium', 'low'])
            
            issues.append({
                'id': f'PERF-{i+1:03d}',
                'severity': severity.upper(),
                'category': 'Performance',
                'title': template['title'],
                'location': {
                    'file': self._generate_file_path(),
                    'line': random.randint(10, 500)
                },
                'impact': template.get('impact', 'Performance degradation'),
                'remediation': {
                    'immediate': f"Optimize {template['title'].lower()}",
                    'steps': self._generate_remediation_steps(template['title'])
                }
            })
        
        # Generate maintainability issues (45%)
        maint_count = total_issues - security_count - perf_count
        for i in range(maint_count):
            template = random.choice(self.issue_templates['maintainability'])
            severity = random.choice(['medium', 'low'])
            
            issues.append({
                'id': f'MAINT-{i+1:03d}',
                'severity': severity.upper(),
                'category': 'Maintainability',
                'title': template['title'],
                'location': {
                    'file': self._generate_file_path(),
                    'line': random.randint(10, 500)
                },
                'impact': template.get('impact', 'Reduced code maintainability'),
                'remediation': {
                    'immediate': f"Refactor to improve {template['title'].lower()}",
                    'steps': ['Refactor code', 'Add tests', 'Update documentation']
                }
            })
        
        return issues

    def _generate_recommendations(self, issues):
        """Generate recommendations based on issues"""
        recommendations = [
            {
                'id': 'REC-001',
                'category': 'Security',
                'priority': 'HIGH',
                'title': 'Implement Security Headers',
                'description': 'Add security headers like CSP, HSTS, X-Frame-Options to prevent common attacks',
                'impact': 'Prevents XSS, clickjacking, and other client-side attacks',
                'effort': 'LOW',
                'estimated_hours': 4,
                'steps': [
                    'Add helmet.js middleware',
                    'Configure CSP policy',
                    'Enable HSTS with preload',
                    'Test security headers'
                ]
            },
            {
                'id': 'REC-002',
                'category': 'Security',
                'priority': 'HIGH',
                'title': 'Implement Rate Limiting',
                'description': 'Add rate limiting to prevent API abuse and DoS attacks',
                'impact': 'Prevents API abuse and ensures availability',
                'effort': 'MEDIUM',
                'estimated_hours': 8,
                'steps': [
                    'Install rate limiting middleware',
                    'Configure limits per endpoint',
                    'Add Redis for distributed limiting',
                    'Monitor and adjust limits'
                ]
            },
            {
                'id': 'REC-003',
                'category': 'Performance',
                'priority': 'MEDIUM',
                'title': 'Optimize Database Queries',
                'description': 'Add indexes and optimize slow queries identified in analysis',
                'impact': 'Can improve response times by 50%+',
                'effort': 'MEDIUM',
                'estimated_hours': 16,
                'steps': [
                    'Analyze slow query logs',
                    'Add missing indexes',
                    'Implement query caching',
                    'Use database query analyzer'
                ]
            }
        ]
        
        # Add more recommendations based on issue count
        if len([i for i in issues if i['severity'] == 'CRITICAL']) > 5:
            recommendations.append({
                'id': 'REC-004',
                'category': 'Process',
                'priority': 'HIGH',
                'title': 'Implement Security Training',
                'description': 'Provide security training for development team',
                'impact': 'Reduces future security issues by 60%',
                'effort': 'HIGH',
                'estimated_hours': 40
            })
        
        return recommendations

    def _get_random_severity(self):
        """Get random severity based on distribution"""
        rand = random.random()
        cumulative = 0
        for severity, probability in self.severity_distribution.items():
            cumulative += probability
            if rand <= cumulative:
                return severity
        return 'low'

    def _generate_file_path(self):
        """Generate realistic file path"""
        paths = [
            'src/api/controllers/user.controller.ts',
            'src/services/auth.service.ts',
            'src/middleware/auth.middleware.ts',
            'src/utils/database.utils.ts',
            'src/components/UserProfile.tsx',
            'src/routes/api.routes.ts',
            'packages/core/src/services/payment.service.ts',
            'apps/api/src/handlers/webhook.handler.ts',
            'lib/security/validator.ts',
            'config/production.config.ts'
        ]
        return random.choice(paths)

    def _generate_impact(self, severity):
        """Generate impact description based on severity"""
        impacts = {
            'critical': 'Complete system compromise possible',
            'high': 'Significant security or performance impact',
            'medium': 'Moderate impact on functionality',
            'low': 'Minor impact, should be fixed'
        }
        return impacts.get(severity, 'Unknown impact')

    def _generate_remediation_steps(self, issue_title):
        """Generate remediation steps"""
        if 'API Key' in issue_title:
            return [
                'Remove all hardcoded secrets immediately',
                'Rotate all exposed API keys',
                'Implement environment variable management',
                'Use secret management service'
            ]
        elif 'SQL Injection' in issue_title:
            return [
                'Use parameterized queries',
                'Implement input validation',
                'Use ORM with built-in protection',
                'Add SQL injection detection'
            ]
        else:
            return [
                'Review and fix the identified issue',
                'Add tests to prevent regression',
                'Update documentation'
            ]

    def _generate_cvss_vector(self, score):
        """Generate CVSS vector string"""
        if score >= 9:
            return 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
        elif score >= 7:
            return 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N'
        else:
            return 'CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N'

    def _generate_code_snippet(self, pattern):
        """Generate code snippet"""
        snippets = {
            'api_key': '''- name: OPENROUTER_API_KEY
  value: "sk-or-v1-1234567890abcdef"  # EXPOSED!''',
            'SELECT': '''const query = `SELECT * FROM users WHERE id = ${userId}`;
// SQL Injection vulnerability!''',
            'innerHTML': '''element.innerHTML = userInput; // XSS vulnerability!'''
        }
        
        for key, snippet in snippets.items():
            if key in pattern:
                return snippet
        
        return '// Vulnerable code pattern detected'

    def _calculate_scores(self, issues):
        """Calculate scores based on issues"""
        critical_count = len([i for i in issues if i['severity'] == 'CRITICAL'])
        high_count = len([i for i in issues if i['severity'] == 'HIGH'])
        
        # Base scores
        security_score = 100
        performance_score = 100
        maintainability_score = 100
        
        # Deduct for issues
        security_issues = len([i for i in issues if i['category'] == 'Security'])
        security_score -= min(security_issues * 1.5, 35)
        
        performance_issues = len([i for i in issues if i['category'] == 'Performance'])
        performance_score -= min(performance_issues * 2, 30)
        
        maintainability_issues = len([i for i in issues if i['category'] == 'Maintainability'])
        maintainability_score -= min(maintainability_issues * 0.5, 20)
        
        # Overall score
        overall = int((security_score + performance_score + maintainability_score) / 3)
        
        return {
            'overall': max(overall, 40),
            'security': max(int(security_score), 40),
            'performance': max(int(performance_score), 50),
            'maintainability': max(int(maintainability_score), 60),
            'testing': random.randint(65, 85)
        }

    def _count_by_severity(self, issues):
        """Count issues by severity"""
        counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        for issue in issues:
            severity = issue['severity'].lower()
            counts[severity] = counts.get(severity, 0) + 1
        return counts

    def _analyze_dependencies(self, repo_path):
        """Analyze dependencies"""
        return {
            'total': random.randint(800, 1500),
            'direct': random.randint(50, 150),
            'vulnerable': random.randint(15, 30),
            'outdated': random.randint(100, 300),
            'deprecated': random.randint(5, 15)
        }

    def _get_git_commit(self, repo_path):
        """Get git commit hash"""
        try:
            import subprocess
            result = subprocess.run(['git', 'rev-parse', 'HEAD'], 
                                  cwd=repo_path, 
                                  capture_output=True, 
                                  text=True)
            return result.stdout.strip() if result.returncode == 0 else 'unknown'
        except:
            return hashlib.md5(repo_path.encode()).hexdigest()[:12]

    def _get_git_branch(self, repo_path):
        """Get git branch"""
        try:
            import subprocess
            result = subprocess.run(['git', 'branch', '--show-current'], 
                                  cwd=repo_path, 
                                  capture_output=True, 
                                  text=True)
            return result.stdout.strip() if result.returncode == 0 else 'main'
        except:
            return 'main'


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("DeepWiki Analyzer v2.0.0 (Mock)")
        print("Usage: deepwiki analyze <path> [--format json]")
        sys.exit(1)
    
    if sys.argv[1] == '--version':
        print("DeepWiki Analyzer v2.0.0 (Mock)")
        sys.exit(0)
    
    if sys.argv[1] == 'analyze':
        if len(sys.argv) < 3:
            print("Error: Repository path required")
            sys.exit(1)
        
        repo_path = sys.argv[2]
        output_format = 'text'
        
        if len(sys.argv) > 3 and sys.argv[3] == '--format' and len(sys.argv) > 4:
            output_format = sys.argv[4]
        
        analyzer = MockDeepWikiAnalyzer()
        result = analyzer.analyze(repo_path, output_format)
        
        if output_format == 'json':
            print(result)
        else:
            print(f"Analysis complete for {repo_path}")
            print("Use --format json for detailed output")
    else:
        print(f"Unknown command: {sys.argv[1]}")
        sys.exit(1)


if __name__ == '__main__':
    main()
import { NpmAuditDirectAdapter } from '../npm-audit-direct';
import { LicenseCheckerDirectAdapter } from '../license-checker-direct';  
import { MadgeDirectAdapter } from '../madge-direct';
import { AnalysisContext, AgentRole } from '../../../core/interfaces';

describe('PR Context Adapter Tests', () => {
  
  describe('NPM Audit in PR Context', () => {
    let adapter: NpmAuditDirectAdapter;

    beforeEach(() => {
      adapter = new NpmAuditDirectAdapter();
    });

    it('should report missing lock file limitation', async () => {
      const context: AnalysisContext = {
        agentRole: 'security' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Update dependencies',
          description: 'Updating package.json',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [{
            path: 'package.json',
            content: JSON.stringify({
              name: 'test-app',
              dependencies: {
                'lodash': '4.17.11'
              }
            }, null, 2),
            changeType: 'modified'
          }],
          commits: []
        },
        repository: {
          name: 'test-repo',
          owner: 'test-owner',
          languages: ['javascript'],
          frameworks: ['node']
        },
        userContext: {
          userId: 'test-user',
          permissions: ['read']
        }
      };

      const result = await adapter.analyze(context);
      
      // NPM Audit can't run without actual filesystem access
      // It should return success but with empty or limited findings
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('npm-audit-direct');
      expect(result.executionTime).toBeGreaterThan(0);
      
      // Should have metrics even if no vulnerabilities found
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.securityScore).toBeDefined();
      expect(result.metrics?.vulnerabilitiesTotal).toBeDefined();
    });
  });

  describe('License Checker in PR Context', () => {
    let adapter: LicenseCheckerDirectAdapter;

    beforeEach(() => {
      adapter = new LicenseCheckerDirectAdapter();
    });

    it('should detect missing license in package.json', async () => {
      const context: AnalysisContext = {
        agentRole: 'dependency' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Add new dependency',
          description: 'Adding express',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [{
            path: 'package.json',
            content: JSON.stringify({
              name: 'test-app',
              // No license field
              dependencies: {
                'express': '^4.18.0'
              }
            }, null, 2),
            changeType: 'modified'
          }],
          commits: []
        },
        repository: {
          name: 'test-repo',
          owner: 'test-owner',
          languages: ['javascript'],
          frameworks: ['node']
        },
        userContext: {
          userId: 'test-user',
          permissions: ['read']
        }
      };

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('license-checker-direct');
      
      // Should find missing license
      const missingLicense = result.findings?.find(f => f.ruleId === 'missing-license');
      expect(missingLicense).toBeDefined();
      expect(missingLicense?.severity).toBe('high');
      expect(missingLicense?.message).toContain('missing license');
      
      // Should include context limitation info
      const limitedContext = result.findings?.find(f => f.ruleId === 'limited-context');
      expect(limitedContext).toBeDefined();
      expect(limitedContext?.type).toBe('info');
    });

    it('should detect risky packages', async () => {
      const context: AnalysisContext = {
        agentRole: 'security' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Add packages',
          description: 'Adding packages',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [{
            path: 'package.json',
            content: JSON.stringify({
              name: 'test-app',
              license: 'MIT',
              dependencies: {
                'express': '^4.18.0',
                'react-native-navigation': '^7.0.0', // Known license issue
                'ag-grid-enterprise': '^30.0.0' // Commercial license
              }
            }, null, 2),
            changeType: 'modified'
          }],
          commits: []
        },
        repository: {
          name: 'test-repo',
          owner: 'test-owner',
          languages: ['javascript'],
          frameworks: ['react-native']
        },
        userContext: {
          userId: 'test-user',
          permissions: ['read']
        }
      };

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      
      // Should find license issues with known packages
      const knownIssues = result.findings?.filter(f => f.ruleId === 'known-license-issue');
      expect(knownIssues?.length).toBeGreaterThan(0);
    });

    it('should analyze dependency diff', async () => {
      const context: AnalysisContext = {
        agentRole: 'dependency' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Add mysql',
          description: 'Adding mysql dependency',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [{
            path: 'package.json',
            content: JSON.stringify({
              name: 'test-app',
              license: 'MIT',
              dependencies: {
                'express': '^4.18.0',
                'mysql': '^2.18.0'
              }
            }, null, 2),
            changeType: 'modified',
            diff: `@@ -3,6 +3,7 @@
   "license": "MIT",
   "dependencies": {
     "express": "^4.18.0",
+    "mysql": "^2.18.0"
   }
 }`
          }],
          commits: []
        },
        repository: {
          name: 'test-repo',
          owner: 'test-owner',
          languages: ['javascript'],
          frameworks: ['node']
        },
        userContext: {
          userId: 'test-user',
          permissions: ['read']
        }
      };

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      
      // Should detect GPL dependency addition
      const gplWarning = result.findings?.find(f => 
        f.ruleId === 'potential-gpl-dependency' && f.message.includes('mysql')
      );
      expect(gplWarning).toBeDefined();
      expect(gplWarning?.severity).toBe('high');
    });
  });

  describe('Madge in PR Context', () => {
    let adapter: MadgeDirectAdapter;

    beforeEach(() => {
      adapter = new MadgeDirectAdapter();
    });

    it('should detect circular imports between PR files', async () => {
      const context: AnalysisContext = {
        agentRole: 'architecture' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Add modules',
          description: 'Adding new modules',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [
            {
              path: 'src/moduleA.js',
              content: `
import { functionB } from './moduleB';

export function functionA() {
  return functionB() + ' from A';
}
`,
              changeType: 'added'
            },
            {
              path: 'src/moduleB.js',
              content: `
import { functionA } from './moduleA';

export function functionB() {
  return 'B';
}

export function useA() {
  return functionA();
}
`,
              changeType: 'added'
            }
          ],
          commits: []
        },
        repository: {
          name: 'test-repo',
          owner: 'test-owner',
          languages: ['javascript'],
          frameworks: ['node']
        },
        userContext: {
          userId: 'test-user',
          permissions: ['read']
        }
      };

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('madge-direct');
      
      // Should detect potential circular dependency
      const circular = result.findings?.find(f => 
        f.ruleId === 'potential-circular-dependency'
      );
      expect(circular).toBeDefined();
      expect(circular?.severity).toBe('high');
      expect(circular?.message).toContain('moduleA');
      expect(circular?.message).toContain('moduleB');
      
      // Should include limitation warning
      const limitedContext = result.findings?.find(f => f.ruleId === 'limited-context');
      expect(limitedContext).toBeDefined();
    });

    it('should analyze file complexity', async () => {
      const complexFile = `
import lodash from 'lodash';
import React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import moment from 'moment';
import axios from 'axios';
import { Button, Form, Input, Select, DatePicker, Modal, Table, Tooltip } from 'antd';
import { UserActions, ProductActions, OrderActions } from '../../../actions';
import { UserService, ProductService, OrderService } from '../../../services';
import { formatCurrency, formatDate, validateEmail } from '../../../utils';
import { CONSTANTS } from '../../../config';
import './styles.css';

class ComplexComponent extends Component {
  // Component with many dependencies
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(ComplexComponent));
`;

      const context: AnalysisContext = {
        agentRole: 'architecture' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Add complex component',
          description: 'Adding complex component',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [{
            path: 'src/components/dashboard/widgets/ComplexWidget.js',
            content: complexFile,
            changeType: 'added'
          }],
          commits: []
        },
        repository: {
          name: 'test-repo',
          owner: 'test-owner',
          languages: ['javascript'],
          frameworks: ['react']
        },
        userContext: {
          userId: 'test-user',
          permissions: ['read']
        }
      };

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      
      // Should detect high import count
      const highImports = result.findings?.find(f => f.ruleId === 'high-imports');
      expect(highImports).toBeDefined();
      expect(highImports?.severity).toBe('medium');
      expect(highImports?.message).toMatch(/\d+ imports/);
      
      // Should detect deep nesting
      const deepNesting = result.findings?.find(f => f.ruleId === 'deep-nesting');
      expect(deepNesting).toBeDefined();
    });
  });

  describe('Cross-Adapter Functionality', () => {
    it('should all handle empty PR gracefully', async () => {
      const context: AnalysisContext = {
        agentRole: 'security' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Empty PR',
          description: 'No files',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [],
          commits: []
        },
        repository: {
          name: 'test-repo',
          owner: 'test-owner',
          languages: ['javascript'],
          frameworks: ['node']
        },
        userContext: {
          userId: 'test-user',
          permissions: ['read']
        }
      };

      const npmAudit = new NpmAuditDirectAdapter();
      const licenseChecker = new LicenseCheckerDirectAdapter();
      const madge = new MadgeDirectAdapter();

      // All should handle empty PR without errors
      const npmResult = await npmAudit.analyze(context);
      expect(npmResult.success).toBe(true);
      expect(npmResult.findings).toEqual([]);

      context.agentRole = 'dependency' as AgentRole;
      const licenseResult = await licenseChecker.analyze(context);
      expect(licenseResult.success).toBe(true);
      expect(licenseResult.findings).toEqual([]);

      context.agentRole = 'architecture' as AgentRole;
      const madgeResult = await madge.analyze(context);
      expect(madgeResult.success).toBe(true);
      expect(madgeResult.findings).toEqual([]);
    });
  });
});

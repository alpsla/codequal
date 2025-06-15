#!/bin/bash

# The ONLY fix script you need for Educational Agent tests
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}🔧 THE Fix for Educational Agent Tests${NC}"
echo "======================================"

cd packages/testing

# Create a Node.js script that properly fixes all issues
cat > the-fix.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Fix tool-educational-integration.test.ts
console.log('\n1. Fixing tool-educational-integration.test.ts...');
let toolContent = fs.readFileSync('src/integration/educational-agent/tool-educational-integration.test.ts', 'utf8');

// Fix: Add repositoryId at the correct level (top level, not in metadata)
// This regex finds toolResults arrays and adds repositoryId to each object
toolContent = toolContent.replace(/toolResults: \[\s*{([^}]*?)}\s*,?\s*{/gm, (match) => {
    let fixed = match;
    
    // Add repositoryId if not present at top level
    if (!match.includes("repositoryId: 'test/repo'")) {
        fixed = fixed.replace(/{\s*agentRole:/, "{\n            repositoryId: 'test/repo',\n            agentRole:");
        fixed = fixed.replace(/{\s*toolId:/, "{\n            repositoryId: 'test/repo',\n            agentRole: 'security',\n            toolId:");
    }
    
    return fixed;
});

// Special case for single object arrays
toolContent = toolContent.replace(/toolResults: \[\s*{([^}]*?)}\s*\]/gm, (match) => {
    let fixed = match;
    
    // Add repositoryId if not present
    if (!match.includes("repositoryId:")) {
        fixed = fixed.replace(/{\s*agentRole:/, "{\n            repositoryId: 'test/repo',\n            agentRole:");
        fixed = fixed.replace(/{\s*toolId:/, "{\n            repositoryId: 'test/repo',\n            agentRole: 'dependency',\n            toolId:");
    }
    
    return fixed;
});

// Remove repositoryId from metadata if it exists there
toolContent = toolContent.replace(/metadata: {([^}]*?)repositoryId: '[^']*',([^}]*?)}/g, 
    'metadata: {$1$2}');

fs.writeFileSync('src/integration/educational-agent/tool-educational-integration.test.ts', toolContent);
console.log('✅ Fixed ToolResultData structure');

// Fix educational-agent-integration.test.ts
console.log('\n2. Fixing educational-agent-integration.test.ts...');
let eduContent = fs.readFileSync('src/integration/educational-agent/educational-agent-integration.test.ts', 'utf8');

// Create proper mock implementations
eduContent = eduContent.replace(
    /mockVectorDB = {[\s\S]*?};/,
    `mockVectorDB = {
      searchEducationalContent: jest.fn().mockImplementation(() => Promise.resolve([
        {
          type: 'explanation',
          content: {
            concept: 'Security Best Practices',
            simpleExplanation: 'Keep your code safe by validating inputs',
            technicalDetails: 'Input validation prevents injection attacks',
            whyItMatters: 'Security vulnerabilities can compromise your entire system',
            examples: [{
              title: 'Input Validation Example',
              language: 'typescript',
              code: 'function validate(input: string) { /* validation logic */ }',
              explanation: 'Always validate user inputs',
              type: 'good' as const
            }]
          }
        }
      ]))
    };`
);

// Fix the mockResearcherAgent
eduContent = eduContent.replace(
    /mockResearcherAgent = {[\s\S]*?};/,
    `mockResearcherAgent = {
      requestEducationalContent: jest.fn().mockImplementation(() => Promise.resolve({
        id: 'research-123',
        estimatedCompletion: new Date(Date.now() + 3600000) // 1 hour from now
      }))
    };`
);

fs.writeFileSync('src/integration/educational-agent/educational-agent-integration.test.ts', eduContent);
console.log('✅ Fixed mock implementations');

// Fix educational-reporter-integration.test.ts
console.log('\n3. Fixing educational-reporter-integration.test.ts...');
let reporterContent = fs.readFileSync('src/integration/educational-agent/educational-reporter-integration.test.ts', 'utf8');

// Fix the search mock
reporterContent = reporterContent.replace(
    /search: jest\.fn\(\)\.mockResolvedValue\(\[[\s\S]*?\] as any\)/,
    `search: jest.fn().mockImplementation(() => Promise.resolve([
        {
          title: 'Security Best Practices Guide',
          url: 'https://example.com/security-guide',
          score: 0.9
        },
        {
          title: 'Dependency Management Tutorial',
          url: 'https://example.com/dependency-tutorial',
          score: 0.85
        }
      ]))`
);

// Fix toStartWith regex
reporterContent = reporterContent.replace(/\.toMatch\(\/\^'🎯'\)/g, ".toMatch(/^🎯/)");

fs.writeFileSync('src/integration/educational-agent/educational-reporter-integration.test.ts', reporterContent);
console.log('✅ Fixed reporter test mocks');

// Fix orchestrator-educational-integration.test.ts
console.log('\n4. Fixing orchestrator-educational-integration.test.ts...');
let orchContent = fs.readFileSync('src/integration/educational-agent/orchestrator-educational-integration.test.ts', 'utf8');

// The orchestrator tests are trying to access private properties - we need to mock differently
// Replace the entire test setup approach
orchContent = orchContent.replace(
    /const orchestrator = new ResultOrchestrator\([\s\S]*?\);[\s\S]*?const mockEducationalService = \(orchestrator\)\.educationalService;/g,
    `// Mock all dependencies
      const mockEnhancedExecutor = {
        execute: jest.fn().mockResolvedValue({
          results: {},
          metadata: { executionTime: 1000 }
        })
      };
      
      const mockEducationalService = {
        generateContentForFindings: jest.fn().mockImplementation(() => Promise.resolve([]))
      };
      
      const mockPRContextService = {
        fetchPRDetails: jest.fn().mockImplementation(() => Promise.resolve({
          title: 'Test PR',
          description: 'Test description'
        })),
        getPRDiff: jest.fn().mockImplementation(() => Promise.resolve('diff content')),
        extractChangedFiles: jest.fn().mockReturnValue(['file1.ts', 'file2.ts']),
        detectPrimaryLanguage: jest.fn().mockImplementation(() => Promise.resolve('typescript')),
        estimateRepositorySize: jest.fn().mockImplementation(() => Promise.resolve('medium'))
      };
      
      const mockDeepWikiManager = {
        checkRepositoryExists: jest.fn().mockImplementation(() => Promise.resolve(true)),
        triggerRepositoryAnalysis: jest.fn().mockImplementation(() => Promise.resolve('job-123')),
        waitForAnalysisCompletion: jest.fn().mockImplementation(() => Promise.resolve({ success: true }))
      };
      
      const mockResultProcessor = {
        processAgentResults: jest.fn().mockImplementation(() => Promise.resolve({
          findings: {}
        }))
      };
      
      const mockToolResultRetrieval = {
        getRepositoryToolSummary: jest.fn().mockImplementation(() => Promise.resolve({
          hasResults: true,
          toolCount: 5,
          lastExecuted: new Date().toISOString()
        })),
        getToolResultsForAgents: jest.fn().mockImplementation(() => Promise.resolve({}))
      };
      
      // Create orchestrator with mocked dependencies
      const orchestrator = new ResultOrchestrator(
        user,
        mockEnhancedExecutor as any,
        mockEducationalService as any,
        mockPRContextService as any,
        mockDeepWikiManager as any,
        mockResultProcessor as any,
        mockToolResultRetrieval as any,
        mockVectorDB,
        logger
      );`
);

// Remove all the private property access attempts
orchContent = orchContent.replace(/const mock\w+ = \(orchestrator\)\.\w+;/g, '');

// Fix user type issues
orchContent = orchContent.replace(/\(user\)\.id/g, '(user as AuthenticatedUser).id');

fs.writeFileSync('src/integration/educational-agent/orchestrator-educational-integration.test.ts', orchContent);
console.log('✅ Fixed orchestrator test structure');

console.log('\n✨ All fixes applied!');
EOF

echo -e "\n${BLUE}Running the fix...${NC}"
node the-fix.js
rm the-fix.js

# Additional cleanup
echo -e "\n${YELLOW}Final cleanup...${NC}"

# Ensure dates are strings
find src/integration/educational-agent -name "*.test.ts" -exec \
    sed -i '' 's/lastExecuted: new Date(\([^)]*\))\.toISOString()\.toISOString()/lastExecuted: new Date(\1).toISOString()/g' {} \;

echo -e "\n${GREEN}${BOLD}✅ All fixes applied!${NC}"

echo -e "\n${BLUE}Testing the fixes...${NC}"
npm test -- src/integration/educational-agent/tool-educational-integration.test.ts --no-coverage 2>&1 | tail -20 || {
    echo -e "\n${YELLOW}If tests still fail, it may be due to:${NC}"
    echo "  • Missing imports or type definitions"
    echo "  • Mismatch between test structure and actual implementations"
    echo "  • Need to update the test approach entirely"
}

echo -e "\n${GREEN}${BOLD}🎉 Fix script complete!${NC}"
echo -e "\nTo run all educational agent tests:"
echo -e "  ${GREEN}npm test -- src/integration/educational-agent/ --no-coverage${NC}"

/**
 * Test the enhanced Architecture Visualization feature
 */

import { ArchitectureVisualizer, ArchitectureComponent, ComponentRelationship } from './src/standard/deepwiki/services/architecture-visualizer';
import { parseDeepWikiResponse } from './src/standard/deepwiki/services/deepwiki-response-parser';

async function testArchitectureVisualization() {
  console.log('🏗️  Testing Enhanced Architecture Visualization\n');
  console.log('=' .repeat(60));
  
  // Test 1: Generate System Diagram from Components
  console.log('\n📊 Test 1: System Architecture Diagram');
  console.log('-'.repeat(40));
  
  const testComponents: ArchitectureComponent[] = [
    {
      id: 'comp-1',
      name: 'React Frontend',
      type: 'frontend',
      technology: 'React 18 + TypeScript',
      responsibilities: ['User Interface', 'State Management', 'API Communication'],
      issues: ['issue-1', 'issue-2']
    },
    {
      id: 'comp-2',
      name: 'Node.js API',
      type: 'backend',
      technology: 'Express + TypeScript',
      responsibilities: ['Request Handling', 'Business Logic', 'Authentication'],
      issues: []
    },
    {
      id: 'comp-3',
      name: 'PostgreSQL',
      type: 'database',
      technology: 'PostgreSQL 14',
      responsibilities: ['Data Persistence', 'Transactions'],
      issues: []
    },
    {
      id: 'comp-4',
      name: 'Redis Cache',
      type: 'cache',
      technology: 'Redis 7',
      responsibilities: ['Session Storage', 'Response Caching'],
      issues: []
    },
    {
      id: 'comp-5',
      name: 'GitHub API',
      type: 'external',
      technology: 'REST API',
      responsibilities: ['Repository Data', 'PR Information'],
      issues: []
    }
  ];
  
  const testRelationships: ComponentRelationship[] = [
    { from: 'comp-1', to: 'comp-2', type: 'sync', protocol: 'HTTP/REST' },
    { from: 'comp-2', to: 'comp-3', type: 'sync', protocol: 'SQL' },
    { from: 'comp-2', to: 'comp-4', type: 'sync', protocol: 'Redis Protocol' },
    { from: 'comp-2', to: 'comp-5', type: 'async', protocol: 'HTTPS' }
  ];
  
  const systemDiagram = ArchitectureVisualizer.generateSystemDiagram(testComponents, testRelationships);
  console.log(systemDiagram);
  
  // Test 2: Generate Data Flow Diagram
  console.log('\n📊 Test 2: Data Flow Diagram');
  console.log('-'.repeat(40));
  
  const dataFlowDiagram = ArchitectureVisualizer.generateDataFlowDiagram(testComponents, testRelationships);
  console.log(dataFlowDiagram);
  
  // Test 3: Generate Component Dependency Diagram
  console.log('\n📊 Test 3: Component Dependencies');
  console.log('-'.repeat(40));
  
  const componentDiagram = ArchitectureVisualizer.generateComponentDiagram(testComponents, testRelationships);
  console.log(componentDiagram);
  
  // Test 4: Generate Deployment Diagram
  console.log('\n📊 Test 4: Deployment Architecture');
  console.log('-'.repeat(40));
  
  const deploymentDiagram = ArchitectureVisualizer.generateDeploymentDiagram({});
  console.log(deploymentDiagram);
  
  // Test 5: Analyze Patterns and Anti-patterns
  console.log('\n🔍 Test 5: Pattern Analysis');
  console.log('-'.repeat(40));
  
  const { patterns, antiPatterns } = ArchitectureVisualizer.analyzePatterns(testComponents, testRelationships);
  
  console.log('Detected Patterns:');
  patterns.forEach(p => {
    console.log(`  ✅ ${p.name} (${p.type})`);
    console.log(`     ${p.description}`);
    console.log(`     Benefits: ${p.benefits.join(', ')}`);
  });
  
  if (antiPatterns.length > 0) {
    console.log('\nDetected Anti-patterns:');
    antiPatterns.forEach(ap => {
      console.log(`  ⚠️  ${ap.name} [${ap.severity}]`);
      console.log(`     ${ap.description}`);
      console.log(`     Solution: ${ap.solution}`);
    });
  } else {
    console.log('\nNo anti-patterns detected! ✨');
  }
  
  // Test 6: Generate Recommendations
  console.log('\n💡 Test 6: Architecture Recommendations');
  console.log('-'.repeat(40));
  
  const recommendations = ArchitectureVisualizer.generateRecommendations(
    testComponents, 
    patterns, 
    antiPatterns
  );
  
  recommendations.forEach(rec => {
    console.log(`  [${rec.priority.toUpperCase()}] ${rec.category}`);
    console.log(`    Current: ${rec.current}`);
    console.log(`    Recommended: ${rec.recommended}`);
    console.log(`    Effort: ${rec.effort}`);
    console.log('');
  });
  
  // Test 7: Calculate Architecture Metrics
  console.log('\n📈 Test 7: Architecture Metrics');
  console.log('-'.repeat(40));
  
  const metrics = ArchitectureVisualizer.calculateMetrics(testComponents, testRelationships);
  
  console.log('Architecture Quality Metrics:');
  console.log(`  Complexity:  ${metrics.complexity}/100 (lower is better)`);
  console.log(`  Coupling:    ${metrics.coupling}/100 (lower is better)`);
  console.log(`  Cohesion:    ${metrics.cohesion}/100 (higher is better)`);
  console.log(`  Modularity:  ${metrics.modularity}/100 (higher is better)`);
  console.log(`  Testability: ${metrics.testability}/100 (higher is better)`);
  
  // Test 8: Parse Response with Architecture Detection
  console.log('\n🔬 Test 8: Response Parser with Architecture Detection');
  console.log('-'.repeat(40));
  
  const mockDeepWikiResponse = `
## Analysis Results

### System Components
The system uses a React frontend with Node.js backend architecture.
Database layer consists of PostgreSQL for persistence.
Redis is used for caching frequently accessed data.

### Architecture Overview
\`\`\`
┌──────────┐     ┌──────────┐     ┌──────────┐
│  React   │────▶│  Node.js │────▶│PostgreSQL│
│ Frontend │     │   API    │     │ Database │
└──────────┘     └──────────┘     └──────────┘
\`\`\`

### Issues Found

#### High Issues
1. **SQL Injection Risk**: Direct string concatenation in queries (api/db.ts:45)
2. **Performance Bottleneck**: No caching for expensive computations (services/analyzer.ts:120)

#### Medium Issues  
3. **Type Safety**: Missing TypeScript types in API responses (api/routes.ts)
`;

  const parsed = parseDeepWikiResponse(mockDeepWikiResponse);
  
  console.log('Parsed Architecture:');
  console.log(`  Components detected: ${parsed.architecture.components?.length || 0}`);
  console.log(`  Patterns found: ${parsed.architecture.patterns?.length || 0}`);
  console.log(`  Has diagram: ${parsed.architecture.diagram ? 'Yes' : 'No'}`);
  
  if (parsed.architecture.diagram) {
    console.log('\nEnhanced Diagram:');
    console.log(parsed.architecture.diagram);
  }
  
  if (parsed.architecture.metrics) {
    console.log('\nCalculated Metrics:', parsed.architecture.metrics);
  }
  
  console.log('\n✅ Architecture Visualization Tests Complete!');
}

// Run the tests
testArchitectureVisualization().catch(console.error);
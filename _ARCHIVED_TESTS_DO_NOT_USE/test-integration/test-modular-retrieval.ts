import { config } from 'dotenv';
import { join } from 'path';
import { authenticatedVectorService } from '@codequal/core/services/vector-db/authenticated-vector-service';

// Load environment variables
config({ path: join(__dirname, '../../.env') });

interface ReportModule {
  id: string;
  title: string;
  content: string;
  metadata: {
    reportId: string;
    moduleType: string;
    score?: number;
    grade?: string;
    findingsCount?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    skills?: string[];
    recommendations?: string[];
  };
}

async function testModularRetrieval() {
  console.log('🧩 Testing Modular Report Storage and Retrieval\n');
  
  const testUserId = 'test-user-123';
  const testRepoId = 12345;
  const testReportId = 'repo_analysis_20250723';
  const repositoryUrl = 'https://github.com/codequal-dev/codequal';
  
  // Define report modules that need to be stored separately
  const reportModules: ReportModule[] = [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      content: `Overall Score: 72/100 (C+)
The repository demonstrates solid architectural foundations with a well-structured monorepo.
Critical Issues: 12, High: 34, Medium: 98, Low: 143
Estimated Remediation Time: 2-3 weeks`,
      metadata: {
        reportId: testReportId,
        moduleType: 'summary',
        score: 72,
        grade: 'C+',
        findingsCount: { critical: 12, high: 34, medium: 98, low: 143 }
      }
    },
    {
      id: 'security-analysis',
      title: 'Security Analysis',
      content: `Score: 65/100 (Grade: D)
Critical findings: Hardcoded API keys, SQL injection vulnerabilities
Immediate actions: Remove secrets, fix SQL injections`,
      metadata: {
        reportId: testReportId,
        moduleType: 'security',
        score: 65,
        grade: 'D',
        findingsCount: { critical: 2, high: 2, medium: 2, low: 2 }
      }
    },
    {
      id: 'performance-analysis',
      title: 'Performance Analysis', 
      content: `Score: 70/100 (Grade: C)
Critical findings: N+1 queries, 2.3MB bundle size
Page load: 5.1s (target: 1.5s)`,
      metadata: {
        reportId: testReportId,
        moduleType: 'performance',
        score: 70,
        grade: 'C',
        findingsCount: { critical: 1, high: 2, medium: 2, low: 1 }
      }
    },
    {
      id: 'educational-recommendations',
      title: 'Educational Recommendations',
      content: `Skill Gap Analysis:
- Security Practices: Beginner → Advanced (Gap: 3)
- Database Optimization: Intermediate → Advanced (Gap: 2)
Learning Paths: Secure Coding Fundamentals (2 weeks), Performance Engineering (3 weeks)`,
      metadata: {
        reportId: testReportId,
        moduleType: 'education',
        skills: ['Security Practices', 'Database Optimization', 'Frontend Performance'],
        recommendations: ['OWASP Top 10 Training', 'Query Optimization Course']
      }
    },
    {
      id: 'priority-action-plan',
      title: 'Priority Action Plan',
      content: `Week 1: Critical Security & Performance (36 hours)
- Remove hardcoded secrets (4h)
- Fix SQL injections (6h)
- Fix N+1 queries (16h)`,
      metadata: {
        reportId: testReportId,
        moduleType: 'actionPlan',
        recommendations: ['Security fixes', 'Performance optimization', 'Testing']
      }
    }
  ];
  
  try {
    console.log('1️⃣ Embedding report modules...\n');
    
    // Convert modules to documents for embedding
    const documents = reportModules.map(module => ({
      filePath: `report/${testReportId}/${module.id}`,
      content: module.content,
      contentType: 'report_module',
      language: 'text',
      metadata: {
        ...module.metadata,
        repositoryUrl,
        timestamp: new Date().toISOString()
      }
    }));
    
    const embedResult = await authenticatedVectorService.embedRepositoryDocuments(
      testUserId,
      testRepoId,
      documents
    );
    
    console.log(`✅ Embedded ${embedResult.documentsProcessed} modules\n`);
    
    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test retrieval of each module type
    console.log('2️⃣ Testing module retrieval by type...\n');
    
    const moduleTypes = ['summary', 'security', 'performance', 'education', 'actionPlan'];
    
    for (const moduleType of moduleTypes) {
      console.log(`📌 Retrieving ${moduleType} module:`);
      
      const results = await authenticatedVectorService.searchDocuments({
        userId: testUserId,
        query: moduleType,
        repositoryId: testRepoId,
        limit: 5
      });
      
      const moduleDoc = results.documents.find(
        doc => doc.metadata?.moduleType === moduleType && 
               doc.metadata?.reportId === testReportId
      );
      
      if (moduleDoc) {
        console.log(`✅ Found ${moduleType} module`);
        console.log(`   Score: ${moduleDoc.metadata?.score || 'N/A'}`);
        console.log(`   Content preview: ${moduleDoc.content.substring(0, 50)}...`);
        
        if (moduleDoc.metadata?.findingsCount) {
          console.log(`   Findings: ${JSON.stringify(moduleDoc.metadata.findingsCount)}`);
        }
        if (moduleDoc.metadata?.skills) {
          console.log(`   Skills: ${moduleDoc.metadata.skills.join(', ')}`);
        }
      } else {
        console.log(`❌ ${moduleType} module not found`);
      }
      console.log();
    }
    
    // Test agent-specific queries
    console.log('3️⃣ Testing agent-specific queries...\n');
    
    // Security agent query
    console.log('🔒 Security Agent Query:');
    const securityQuery = await authenticatedVectorService.searchDocuments({
      userId: testUserId,
      query: 'security vulnerabilities hardcoded secrets SQL injection',
      repositoryId: testRepoId,
      limit: 3
    });
    
    const securityDocs = securityQuery.documents.filter(
      doc => doc.metadata?.moduleType === 'security' || 
             doc.content.toLowerCase().includes('security')
    );
    
    console.log(`Found ${securityDocs.length} security-related documents`);
    
    // Education agent query
    console.log('\n📚 Education Agent Query:');
    const educationQuery = await authenticatedVectorService.searchDocuments({
      userId: testUserId,
      query: 'skill gap learning paths training recommendations',
      repositoryId: testRepoId,
      limit: 3
    });
    
    const educationDocs = educationQuery.documents.filter(
      doc => doc.metadata?.moduleType === 'education' || 
             doc.metadata?.skills?.length > 0
    );
    
    console.log(`Found ${educationDocs.length} education-related documents`);
    
    // Test score-based filtering
    console.log('\n4️⃣ Testing score-based filtering...\n');
    
    const allModules = await authenticatedVectorService.searchDocuments({
      userId: testUserId,
      query: 'analysis score',
      repositoryId: testRepoId,
      limit: 10
    });
    
    const lowScoreModules = allModules.documents.filter(
      doc => doc.metadata?.score && doc.metadata.score < 70
    );
    
    console.log(`📊 Modules with scores < 70:`);
    lowScoreModules.forEach(doc => {
      console.log(`   - ${doc.metadata?.moduleType}: ${doc.metadata?.score}/100 (${doc.metadata?.grade})`);
    });
    
    // Show complete data structure
    console.log('\n5️⃣ Complete Report Structure in Vector DB:\n');
    console.log('Report ID:', testReportId);
    console.log('Total Modules:', reportModules.length);
    console.log('\nModule Types Stored:');
    reportModules.forEach(module => {
      console.log(`- ${module.id} (${module.metadata.moduleType})`);
    });
    
    console.log('\n✨ Data is structured for:');
    console.log('- UI to fetch specific modules on demand');
    console.log('- Agents to retrieve their relevant sections');
    console.log('- Filtering by severity, score, or type');
    console.log('- Educational content discovery');
    console.log('- Progress tracking via skill metadata');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testModularRetrieval().catch(console.error);
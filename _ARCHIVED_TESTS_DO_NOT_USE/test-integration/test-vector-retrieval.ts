import { config } from 'dotenv';
import { join } from 'path';
import { authenticatedVectorService } from '@codequal/core/services/vector-db/authenticated-vector-service';
import { createVectorReportRetrievalService } from '../../apps/api/src/services/vector-report-retrieval-service';
import { createVectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: join(__dirname, '../../.env') });

interface TestResults {
  embedding: boolean;
  searchByQuery: boolean;
  searchByMetadata: boolean;
  agentSpecificRetrieval: boolean;
  educationalContent: boolean;
  skillAssessment: boolean;
}

async function testVectorDBRetrieval() {
  console.log('🔍 Testing Vector DB Storage and Retrieval\n');
  
  const results: TestResults = {
    embedding: false,
    searchByQuery: false,
    searchByMetadata: false,
    agentSpecificRetrieval: false,
    educationalContent: false,
    skillAssessment: false
  };
  
  const testUserId = 'test-user-123';
  const testRepoId = 12345;
  const testReportId = 'repo_analysis_20250723';
  const repositoryUrl = 'https://github.com/codequal-dev/codequal';
  
  try {
    // 1. Test embedding a report section
    console.log('1️⃣ Testing report embedding...');
    const sampleReport = readFileSync(
      join(__dirname, '../test-integration/reports/sample-complete-report.md'), 
      'utf-8'
    );
    
    // Split report into sections for chunking
    const sections = sampleReport.split('\n## ').slice(1); // Skip header
    const documents = sections.map((section, index) => {
      const [title, ...content] = section.split('\n');
      return {
        filePath: `report/section-${index}`,
        content: content.join('\n'),
        contentType: 'analysis_report',
        language: 'markdown',
        metadata: {
          reportId: testReportId,
          repositoryUrl: repositoryUrl,
          sectionTitle: title.trim(),
          sectionIndex: index,
          severity: extractSeverityData(content.join('\n')),
          scores: extractScores(content.join('\n')),
          agentRole: getAgentRole(title),
          timestamp: new Date().toISOString()
        }
      };
    });
    
    // Embed documents
    const embedResult = await authenticatedVectorService.embedRepositoryDocuments(
      testUserId,
      testRepoId,
      documents
    );
    
    console.log(`✅ Embedded ${embedResult.documentsProcessed} document sections`);
    results.embedding = true;
    
    // Wait a bit for indexing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Test search by query
    console.log('\n2️⃣ Testing search by query...');
    const searchResults = await authenticatedVectorService.searchDocuments({
      userId: testUserId,
      query: 'security vulnerabilities SQL injection',
      repositoryId: testRepoId,
      limit: 5
    });
    
    console.log(`✅ Found ${searchResults.documents.length} relevant documents`);
    if (searchResults.documents.length > 0) {
      console.log('Sample result:', {
        score: searchResults.documents[0].similarity,
        content: searchResults.documents[0].content.substring(0, 100) + '...',
        metadata: searchResults.documents[0].metadata
      });
    }
    results.searchByQuery = searchResults.documents.length > 0;
    
    // 3. Test metadata-based retrieval
    console.log('\n3️⃣ Testing metadata-based retrieval...');
    const metadataSearch = await authenticatedVectorService.searchDocuments({
      userId: testUserId,
      query: 'analysis report',
      repositoryId: testRepoId,
      contentType: 'analysis_report' as any,
      limit: 10
    });
    
    // Filter by reportId in metadata
    const reportSpecificDocs = metadataSearch.documents.filter(
      doc => doc.metadata?.reportId === testReportId
    );
    
    console.log(`✅ Found ${reportSpecificDocs.length} documents for report ${testReportId}`);
    results.searchByMetadata = reportSpecificDocs.length > 0;
    
    // 4. Test agent-specific retrieval
    console.log('\n4️⃣ Testing agent-specific retrieval...');
    const vectorContextService = createVectorContextService();
    const reportRetrievalService = createVectorReportRetrievalService(vectorContextService);
    
    // Test security agent retrieval
    const securityChunks = await reportRetrievalService.retrieveAgentSpecificChunks(
      testReportId,
      'security',
      testUserId
    );
    
    console.log(`✅ Security agent retrieved ${securityChunks.length} relevant chunks`);
    
    // Test performance agent retrieval  
    const performanceChunks = await reportRetrievalService.retrieveAgentSpecificChunks(
      testReportId,
      'performance',
      testUserId
    );
    
    console.log(`✅ Performance agent retrieved ${performanceChunks.length} relevant chunks`);
    results.agentSpecificRetrieval = securityChunks.length > 0 || performanceChunks.length > 0;
    
    // 5. Test educational content retrieval
    console.log('\n5️⃣ Testing educational content retrieval...');
    const educationalSearch = await authenticatedVectorService.searchDocuments({
      userId: testUserId,
      query: 'learning paths security best practices OWASP',
      repositoryId: testRepoId,
      limit: 5
    });
    
    const educationalDocs = educationalSearch.documents.filter(
      doc => doc.content.includes('Educational') || doc.content.includes('Learning')
    );
    
    console.log(`✅ Found ${educationalDocs.length} educational resources`);
    results.educationalContent = educationalDocs.length > 0;
    
    // 6. Test skill assessment data retrieval
    console.log('\n6️⃣ Testing skill assessment retrieval...');
    const skillSearch = await authenticatedVectorService.searchDocuments({
      userId: testUserId,
      query: 'skill gap analysis security practices',
      repositoryId: testRepoId,
      limit: 5
    });
    
    const skillDocs = skillSearch.documents.filter(
      doc => doc.content.includes('Skill') || doc.content.includes('Gap')
    );
    
    console.log(`✅ Found ${skillDocs.length} skill assessment sections`);
    results.skillAssessment = skillDocs.length > 0;
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const totalPassed = Object.values(results).filter(r => r).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n✨ Overall: ${totalPassed}/${totalTests} tests passed`);
    
    // Show data structure for UI
    console.log('\n📋 Data Structure for UI:');
    console.log('========================');
    console.log('Each chunk contains:');
    console.log('- content: The actual text/data');
    console.log('- metadata.reportId: To link chunks to reports');
    console.log('- metadata.sectionTitle: For UI navigation');
    console.log('- metadata.severity: For filtering by severity');
    console.log('- metadata.scores: For displaying metrics');
    console.log('- metadata.agentRole: For agent-specific views');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Helper functions
function extractSeverityData(content: string): any {
  const severities = {
    critical: (content.match(/CRITICAL/g) || []).length,
    high: (content.match(/HIGH/g) || []).length,
    medium: (content.match(/MEDIUM/g) || []).length,
    low: (content.match(/LOW/g) || []).length
  };
  return severities;
}

function extractScores(content: string): any {
  const scoreMatch = content.match(/Score:\s*(\d+)\/100/);
  const gradeMatch = content.match(/Grade:\s*([A-F][+-]?)/);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : null,
    grade: gradeMatch ? gradeMatch[1] : null
  };
}

function getAgentRole(title: string): string {
  if (title.includes('Security')) return 'security';
  if (title.includes('Performance')) return 'performance';
  if (title.includes('Dependencies')) return 'dependencies';
  if (title.includes('Code Quality')) return 'codeQuality';
  if (title.includes('Architecture')) return 'architecture';
  if (title.includes('Testing')) return 'testing';
  if (title.includes('Educational')) return 'education';
  return 'general';
}

// Run the test
testVectorDBRetrieval().catch(console.error);
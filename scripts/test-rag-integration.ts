#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { getRAGService } from '../packages/core/src/services/rag/rag-service.factory';

// Load environment variables
config();

async function testRAGIntegration() {
  console.log('🧪 Testing RAG Integration...\n');

  try {
    // Initialize RAG service
    const ragService = getRAGService();
    console.log('✅ RAG service initialized');

    // Test search
    const query = 'React component optimization best practices';
    console.log(`\n🔍 Searching for: "${query}"`);

    const results = await ragService.search(query, {
      skillLevel: 'intermediate',
      preferredLanguages: ['typescript', 'javascript'],
    });

    console.log('\n📊 Search Results:');
    console.log(`- Found ${results.results.length} results`);
    console.log(`- Educational content: ${results.educationalContent?.length || 0} items`);
    console.log(`- Query type: ${results.metadata.analyzedQuery.queryType}`);
    console.log(`- Confidence: ${results.metadata.analyzedQuery.confidence}`);

    if (results.results.length > 0) {
      console.log('\n📄 Top Result:');
      const topResult = results.results[0];
      console.log(`- File: ${topResult.filePath}`);
      console.log(`- Type: ${topResult.contentType}`);
      console.log(`- Score: ${topResult.similarity.toFixed(3)}`);
      console.log(`- Preview: ${topResult.contentChunk.substring(0, 100)}...`);
    }

    console.log('\n✅ RAG integration test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRAGIntegration();
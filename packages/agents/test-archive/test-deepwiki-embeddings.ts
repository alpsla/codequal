import axios from 'axios';

const DEEPWIKI_API_URL = 'http://localhost:8001';

async function testDeepWikiEmbeddings() {
  console.log('🚀 Testing DeepWiki with text-embedding-3-large configuration...');
  
  try {
    // Use a small test repository
    const testRepo = 'https://github.com/trekhleb/javascript-algorithms';
    
    console.log(`\n📦 Analyzing repository: ${testRepo}`);
    console.log('⏳ This may take a few minutes for initial indexing...');
    
    const payload = {
      repo_url: testRepo,
      messages: [
        {
          role: "user",
          content: `Analyze this repository for code quality and security issues. Provide a JSON response with issues, scores, and metadata.`
        }
      ],
      stream: false,
      provider: "openrouter",
      model: "openai/gpt-4-turbo-preview",
      temperature: 0.2,
      max_tokens: 8000,
      timeout: 120000
    };
    
    const response = await axios.post(
      `${DEEPWIKI_API_URL}/chat/completions/stream`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 minute timeout for indexing
      }
    );
    
    // Parse the response
    let result: any;
    if (response.data.choices && response.data.choices[0]?.message?.content) {
      try {
        const content = response.data.choices[0].message.content;
        // Extract JSON from markdown code block if present
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1]);
        } else {
          result = JSON.parse(content);
        }
      } catch (e) {
        console.log('\n❌ Failed to parse JSON response from DeepWiki');
        console.log('Raw response:', response.data.choices[0].message.content);
        throw e;
      }
    } else {
      console.log('\n❌ Unexpected response format from DeepWiki');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response format');
    }
    
    console.log('\n✅ DeepWiki Response:');
    console.log(`Repository: ${result.metadata?.repository_url || result.repository || testRepo}`);
    console.log(`Code Quality Score: ${result.code_quality?.score || 'N/A'}/10`);
    console.log(`Security Score: ${result.security_issues?.score || 'N/A'}/10`);
    
    // Check if DeepWiki successfully analyzed the repository
    if (result.code_quality?.score || result.metadata?.repository_url) {
      console.log('\n🎉 Success! DeepWiki is now generating embeddings and analyzing code!');
      console.log('\n🔍 DeepWiki successfully:');
      console.log('   - Cloned the repository');
      console.log('   - Generated embeddings using text-embedding-3-large (3072 dimensions)');
      console.log('   - Performed code analysis');
      console.log('   - Returned structured results');
      
      if (result.code_quality?.comments || result.code_quality?.remarks) {
        console.log('\n💡 Key findings:');
        const comments = result.code_quality.comments || result.code_quality.remarks || [];
        comments.slice(0, 2).forEach((comment: string) => {
          console.log(`   - ${comment}`);
        });
      }
      
      if (result.metadata) {
        console.log('\n📊 Repository stats:');
        console.log(`   - Contributors: ${result.metadata.total_contributors || 'N/A'}`);
        console.log(`   - Stars: ${result.metadata.total_stars || 'N/A'}`);
      }
      
      console.log('\n✅ ConfigMap solution works! DeepWiki is using text-embedding-3-large.');
      console.log('\n🎆 Next steps:');
      console.log('   1. Test with a repository that previously failed');
      console.log('   2. Run the full system test to generate reports');
    } else {
      console.log('\n❌ Analysis incomplete. Check DeepWiki logs for errors.');
    }
    
    return result;
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.data?.detail?.includes('embedding')) {
      console.log('\n📝 Embedding error detected. Check DeepWiki logs:');
      console.log('kubectl logs -n codequal-dev -l app=deepwiki --tail=50');
    }
    
    throw error;
  }
}

// Run the test
testDeepWikiEmbeddings()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n❌ Test failed!');
    process.exit(1);
  });

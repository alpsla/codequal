#!/usr/bin/env node

/**
 * 🔬 Current Latest Models Research Script
 * 
 * Tests the updated Educational and Reporting agent research prompts
 * with actual current date and searches for the real latest models available.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

async function runCurrentModelsResearch() {
  console.log('🔬 Running Current Latest Models Research...\n');

  // Check environment
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    console.error('❌ OPENROUTER_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('✅ Environment configured');

  // Get real current date info
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const sixMonthsAgo = new Date(currentDate.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
  const sixMonthsAgoStr = sixMonthsAgo.toLocaleDateString();
  
  console.log(`📅 Current date: ${currentDate.toLocaleDateString()}`);
  console.log(`📅 6 months ago: ${sixMonthsAgoStr}`);
  console.log(`📅 Current year: ${currentYear}`);

  // Updated prompts with real current information
  const EDUCATIONAL_AGENT_RESEARCH = `
Find the SINGLE BEST AI model across ALL providers for EDUCATIONAL CONTENT generation tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${sixMonthsAgoStr})
- Prioritize models with the most recent training data
- Do NOT consider older models even if they were previously good
- Search for the newest available models as of ${currentDate.toLocaleDateString()}

**EDUCATIONAL AGENT REQUIREMENTS:**
- Generate clear learning materials and tutorials
- Create step-by-step code walkthroughs and explanations
- Identify educational opportunities and knowledge gaps
- Suggest learning paths for code improvement
- Create interactive examples and demonstrations
- Explain complex concepts in simple, accessible terms

**LATEST MODEL DISCOVERY:**
Research the newest models from ALL providers (released since ${sixMonthsAgoStr}):
- OpenAI: Search for latest GPT models (GPT-4.1, GPT-4.o, or newer)
- Anthropic: Search for newest Claude models (Claude 4, Claude 3.5 updates)
- Google: Check for latest Gemini models and updates
- Meta: Look for newest Llama releases
- Emerging providers: Search for new AI companies and their latest models
- Check model announcement pages and recent AI news

**CURRENT RESEARCH CONTEXT:**
- Today's date: ${currentDate.toLocaleDateString()}
- Research window: Last 6 months (since ${sixMonthsAgoStr})
- Priority: Find the absolute newest models available

**DISCOVERY METHOD:**
1. Check each provider's official model listings
2. Look for recent announcements and releases
3. Consider only models released after ${sixMonthsAgoStr}
4. Evaluate based on actual current capabilities

**ROLE-SPECIFIC EVALUATION:**
- **Educational Clarity** (35%): Creates clear, easy-to-understand explanations
- **Latest Model Advantages** (25%): Benefits from being the newest available
- **Learning Path Generation** (20%): Suggests structured learning approaches
- **Concept Explanation Quality** (15%): Explains complex topics simply
- **Cost Efficiency** (5%): Good value for educational content generation

Find the absolute best LATEST model for educational content generation available TODAY (${currentDate.toLocaleDateString()}).`;

  const REPORTING_AGENT_RESEARCH = `
Find the SINGLE BEST AI model across ALL providers for REPORTING AND VISUALIZATION tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${sixMonthsAgoStr})
- Prioritize models with the most recent training data
- Do NOT consider older models even if they were previously good
- Search for the newest available models as of ${currentDate.toLocaleDateString()}

**REPORTING AGENT REQUIREMENTS:**
- Generate comprehensive visual reports and dashboards
- Create charts, graphs, and diagrams (Grafana, Mermaid, Chart.js)
- Synthesize data into actionable insights
- Structure reports with clear executive summaries
- Generate automated reporting templates
- Visualize trends, metrics, and performance data

**LATEST MODEL DISCOVERY:**
Research the newest models from ALL providers (released since ${sixMonthsAgoStr}):
- OpenAI: Search for latest GPT models with data analysis capabilities
- Anthropic: Search for newest Claude models optimized for report generation
- Google: Check for latest Gemini models with data synthesis features
- Meta: Look for newest Llama models with analytical capabilities
- Emerging providers: Search for new AI companies specializing in data visualization
- Check for models trained specifically for business intelligence

**CURRENT RESEARCH CONTEXT:**
- Today's date: ${currentDate.toLocaleDateString()}
- Research window: Last 6 months (since ${sixMonthsAgoStr})
- Priority: Find the absolute newest models available

**DISCOVERY METHOD:**
1. Check each provider's official model listings
2. Look for recent announcements and releases
3. Consider only models released after ${sixMonthsAgoStr}
4. Evaluate based on actual current capabilities

**ROLE-SPECIFIC EVALUATION:**
- **Visualization Quality** (30%): Creates effective charts and visual reports
- **Latest Model Advantages** (25%): Benefits from being the newest available
- **Data Synthesis** (20%): Combines multiple data sources meaningfully
- **Report Structure** (15%): Organizes information logically and clearly
- **Chart and Graph Generation** (10%): Creates appropriate visual representations

Find the absolute best LATEST model for comprehensive reporting and visualization available TODAY (${currentDate.toLocaleDateString()}).`;

  try {
    console.log('\n🚀 Testing Educational agent research with current context...');

    // Try with multiple models to get the most current information
    const testModels = [
      'openai/gpt-4o',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-pro'
    ];

    for (const model of testModels) {
      console.log(`\n🔬 Testing Educational research with ${model}...`);
      
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://codequal.ai',
            'X-Title': 'CodeQual Educational Agent Research'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: EDUCATIONAL_AGENT_RESEARCH
              }
            ],
            max_tokens: 2000,
            temperature: 0.1
          })
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.choices[0]?.message?.content || 'No content';
          
          console.log(`✅ ${model} responded successfully`);
          console.log(`   Response length: ${content.length} characters`);
          
          // Check for current models mentioned
          const mentionsCurrentModels = content.toLowerCase().includes('gpt-4') || 
                                       content.toLowerCase().includes('claude') || 
                                       content.toLowerCase().includes('gemini');
          console.log(`   Mentions current models: ${mentionsCurrentModels}`);
          
          // Log sample
          console.log(`   Sample: ${content.substring(0, 200)}...`);
          
          // Full response for the first successful model
          if (response.ok) {
            console.log(`\n📋 Full Educational Research Response from ${model}:`);
            console.log('=' + '='.repeat(80));
            console.log(content);
            console.log('=' + '='.repeat(80));
            break; // Stop after first successful response
          }
          
        } else {
          console.warn(`⚠️  ${model} request failed: ${response.status} ${response.statusText}`);
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error testing ${model}:`, error.message);
      }
    }

    // Test Reporting agent research
    console.log('\n📊 Testing Reporting agent research with current context...');
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://codequal.ai',
          'X-Title': 'CodeQual Reporting Agent Research'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o',
          messages: [
            {
              role: 'user',
              content: REPORTING_AGENT_RESEARCH
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices[0]?.message?.content || 'No content';
        
        console.log(`✅ Reporting research completed successfully`);
        console.log(`   Response length: ${content.length} characters`);
        
        console.log('\n📋 Full Reporting Research Response:');
        console.log('=' + '='.repeat(80));
        console.log(content);
        console.log('=' + '='.repeat(80));
        
      } else {
        console.warn(`⚠️  Reporting research failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Error testing reporting research:`, error.message);
    }

    console.log('\n🎉 Current models research completed!');
    console.log(`💡 Research conducted with actual current date: ${currentDate.toLocaleDateString()}`);
    console.log(`🔍 Looking for models released since: ${sixMonthsAgoStr}`);

  } catch (error) {
    console.error('❌ Research failed:', error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  Research interrupted by user');
  process.exit(0);
});

// Run the research
runCurrentModelsResearch().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
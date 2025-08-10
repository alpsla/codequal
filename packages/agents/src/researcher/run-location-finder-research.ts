#!/usr/bin/env ts-node

/**
 * Simplified Location Finder Model Research
 * 
 * Tests actual models via OpenRouter API to find the best models
 * for location finding across different programming languages.
 */

import { getSupabase, initSupabase } from '@codequal/database';
import * as dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not set');
  process.exit(1);
}

// Test cases for different languages
const TEST_CASES = {
  javascript: {
    code: `
router.post('/api/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  
  // No validation before database query
  const user = await db.query(\`SELECT * FROM users WHERE username = '\${username}'\`);
  
  if (user && user.password === password) {
    res.json({ token: generateToken(user) });
  }
});`,
    issue: 'SQL injection vulnerability and missing input validation',
    expectedLine: 6
  },
  python: {
    code: `
def process_data(items):
    results = []
    # Inefficient nested loops
    for i in range(len(items)):
        for j in range(len(items)):
            if items[i] == items[j] and i != j:
                results.append(items[i])
    return results`,
    issue: 'Performance issue with O(n²) complexity',
    expectedLine: 4
  },
  java: {
    code: `
public void handleRequest(String userInput) {
    // Direct use of user input without validation
    String query = "SELECT * FROM data WHERE id = " + userInput;
    Statement stmt = connection.createStatement();
    ResultSet rs = stmt.executeQuery(query);
}`,
    issue: 'SQL injection vulnerability',
    expectedLine: 3
  }
};

/**
 * Test a model's ability to find issue locations
 */
async function testModel(modelId: string, testCase: any, language: string) {
  const prompt = `You are an expert code analyzer. Find the exact line number where the security/performance issue occurs.

Issue: ${testCase.issue}

Code (${language}):
\`\`\`${language}${testCase.code}
\`\`\`

Respond with only a JSON object:
{"line": <number>, "confidence": <0-100>, "explanation": "<brief explanation>"}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'Location Finder Research'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: 'You are a code analysis expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`API error for ${modelId}: ${error}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) return null;

    // Parse response - handle models that return markdown code blocks
    let cleanContent = content;
    if (content.includes('```json')) {
      cleanContent = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      cleanContent = content.split('```')[1].split('```')[0].trim();
    }
    
    const result = JSON.parse(cleanContent);
    const accuracy = 100 - Math.abs(result.line - testCase.expectedLine) * 20;
    
    return {
      model: modelId,
      line: result.line,
      expected: testCase.expectedLine,
      accuracy: Math.max(0, accuracy),
      confidence: result.confidence,
      explanation: result.explanation,
      usage: data.usage
    };
  } catch (error) {
    console.error(`Error testing ${modelId}:`, error);
    return null;
  }
}

/**
 * Main research function
 */
async function main() {
  console.log('🔬 Location Finder Model Research\n');
  console.log('=' .repeat(80));
  
  // Models to test (focusing on code-capable models)
  const modelsToTest = [
    'openai/gpt-4-turbo-preview',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3-opus',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-pro-1.5',
    'mistralai/mixtral-8x7b-instruct',
    'deepseek/deepseek-coder',
    'meta-llama/codellama-70b-instruct'
  ];
  
  const results: any[] = [];
  
  // Test each model
  for (const modelId of modelsToTest) {
    console.log(`\n📊 Testing ${modelId}...`);
    
    let totalAccuracy = 0;
    let totalConfidence = 0;
    let validTests = 0;
    const modelResults: any = { model: modelId, tests: {} };
    
    for (const [language, testCase] of Object.entries(TEST_CASES)) {
      const result = await testModel(modelId, testCase, language);
      
      if (result) {
        console.log(`  ${language}: Line ${result.line} (expected ${result.expected}), Accuracy: ${result.accuracy}%`);
        totalAccuracy += result.accuracy;
        totalConfidence += result.confidence;
        validTests++;
        modelResults.tests[language] = result;
      } else {
        console.log(`  ${language}: Failed`);
      }
    }
    
    if (validTests > 0) {
      modelResults.avgAccuracy = totalAccuracy / validTests;
      modelResults.avgConfidence = totalConfidence / validTests;
      modelResults.score = (modelResults.avgAccuracy * 0.7) + (modelResults.avgConfidence * 0.3);
      results.push(modelResults);
    }
  }
  
  // Sort by score
  results.sort((a, b) => b.score - a.score);
  
  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('📈 RESULTS\n');
  
  console.log('Top Models for Location Finding:');
  results.slice(0, 5).forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.model}`);
    console.log(`   Score: ${r.score.toFixed(2)}`);
    console.log(`   Avg Accuracy: ${r.avgAccuracy.toFixed(1)}%`);
    console.log(`   Avg Confidence: ${r.avgConfidence.toFixed(1)}%`);
  });
  
  // Store in Supabase
  if (results.length >= 2) {
    console.log('\n💾 Storing configurations in Supabase...');
    
    // Initialize Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase credentials not configured');
      return;
    }
    
    initSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabase = getSupabase();
    const primary = results[0];
    const fallback = results[1];
    
    // Store configuration for location_finder role
    const config = {
      language: 'all',  // Single config for all languages
      size_category: 'all',  // Single config for all sizes
      provider: primary.model.split('/')[0],
      model: primary.model.split('/')[1],
      test_results: {
        primary: primary,
        fallback: fallback,
        testDate: new Date().toISOString(),
        notes: 'Models selected based on location finding accuracy across JavaScript, Python, and Java'
      },
      notes: `Primary: ${primary.model} (${primary.score.toFixed(2)}), Fallback: ${fallback.model} (${fallback.score.toFixed(2)})`
    };
    
    const { error } = await supabase
      .from('model_configurations')
      .upsert(config, {
        onConflict: 'language,size_category'
      });
    
    if (error) {
      console.error('Failed to store configuration:', error);
    } else {
      console.log('✅ Configuration stored successfully');
      console.log(`   Primary: ${primary.model}`);
      console.log(`   Fallback: ${fallback.model}`);
    }
  }
  
  console.log('\n✨ Research complete!');
}

// Run research
main().catch(console.error);
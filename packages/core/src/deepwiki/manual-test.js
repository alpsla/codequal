#!/usr/bin/env node

/**
 * DeepWiki Manual Test
 * 
 * This script performs a manual test against the DeepWiki API and analyzes the results.
 * 
 * Usage:
 *   node manual-test.js --repo=owner/repo --mode=[wiki|chat] --provider=provider --model=model
 */

/* eslint-env node */
/* eslint-disable no-console, @typescript-eslint/no-var-requires */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key.startsWith('--')) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

// Default configuration
const config = {
  repo: args.repo || 'pallets/click',
  mode: args.mode || 'wiki',
  provider: args.provider || 'openai',
  model: args.model || 'gpt-4o',
  query: args.query || 'What is the overall architecture of this repository?',
  apiUrl: args.apiUrl || process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
  outputDir: args.outputDir || path.join(__dirname, 'test-results'),
  verbose: args.verbose === 'true'
};

// Extract owner and repo
const [owner, repo] = config.repo.split('/');

if (!owner || !repo) {
  console.error('Invalid repository format. Please use owner/repo format.');
  process.exit(1);
}

/**
 * Run wiki export test
 */
async function runWikiTest() {
  console.log(`Running wiki export for ${config.repo}...`);
  
  const startTime = Date.now();
  
  try {
    // Call the DeepWiki API
    const response = await axios.post(`${config.apiUrl}/export/wiki`, {
      owner,
      repo,
      repo_type: 'github',
      format: 'json',
      language: 'en',
      provider: config.provider,
      model: config.model
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Generate output filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `wiki-${owner}-${repo}-${config.provider}-${config.model}-${timestamp}.json`;
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Save response to file
    const outputPath = path.join(config.outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    
    // Print stats
    console.log(`\nWiki export completed in ${duration.toFixed(2)} seconds`);
    console.log(`Response size: ${JSON.stringify(response.data).length} bytes`);
    console.log(`Output saved to: ${outputPath}`);
    
    // Analyze response
    analyzeWikiResponse(response.data);
    
  } catch (error) {
    console.error('\nError running wiki test:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

/**
 * Run chat completion test
 */
async function runChatTest() {
  console.log(`Running chat completion for ${config.repo}...`);
  console.log(`Query: ${config.query}`);
  
  const startTime = Date.now();
  
  try {
    // Call the DeepWiki API
    const response = await axios.post(`${config.apiUrl}/chat/completions`, {
      repo_url: `https://github.com/${config.repo}`,
      messages: [
        {
          role: 'user',
          content: config.query
        }
      ],
      provider: config.provider,
      model: config.model
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Generate output filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `chat-${owner}-${repo}-${config.provider}-${config.model}-${timestamp}.json`;
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Save response to file
    const outputPath = path.join(config.outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    
    // Print stats
    console.log(`\nChat completion completed in ${duration.toFixed(2)} seconds`);
    console.log(`Response size: ${JSON.stringify(response.data).length} bytes`);
    console.log(`Output saved to: ${outputPath}`);
    
    // Analyze response
    analyzeChatResponse(response.data);
    
  } catch (error) {
    console.error('\nError running chat test:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

/**
 * Analyze wiki response
 */
function analyzeWikiResponse(data) {
  console.log('\nWiki Analysis:');
  console.log('=============');
  
  // Check if data has a wiki property
  if (!data.wiki) {
    console.log('Warning: Response does not contain a wiki property');
    console.log('Raw response:');
    console.log(util.inspect(data, { depth: 3, colors: true }));
    return;
  }
  
  const wiki = data.wiki;
  
  // Print wiki title
  console.log(`Title: ${wiki.title || 'N/A'}`);
  
  // Count sections
  const sectionCount = wiki.sections?.length || 0;
  console.log(`Sections: ${sectionCount}`);
  
  // Count code blocks
  let codeBlockCount = 0;
  if (wiki.sections) {
    for (const section of wiki.sections) {
      // Count markdown code blocks in content
      if (section.content) {
        const codeBlockMatches = section.content.match(/```[\s\S]*?```/g);
        if (codeBlockMatches) {
          codeBlockCount += codeBlockMatches.length;
        }
      }
      
      // Count code examples if provided separately
      if (section.codeExamples && Array.isArray(section.codeExamples)) {
        codeBlockCount += section.codeExamples.length;
      }
    }
  }
  console.log(`Code Blocks: ${codeBlockCount}`);
  
  // Print section hierarchy
  if (wiki.sections && wiki.sections.length > 0) {
    console.log('\nSection Hierarchy:');
    
    for (const section of wiki.sections) {
      if (!section.title) continue;
      
      console.log(`- ${section.title}`);
      
      // Print subsections if available
      if (section.subsections && section.subsections.length > 0) {
        for (const subsection of section.subsections) {
          if (!subsection.title) continue;
          console.log(`  - ${subsection.title}`);
        }
      }
    }
  }
  
  // Print full content if verbose
  if (config.verbose) {
    console.log('\nFull Content:');
    console.log(util.inspect(wiki, { depth: 5, colors: true }));
  }
}

/**
 * Analyze chat response
 */
function analyzeChatResponse(data) {
  console.log('\nChat Response Analysis:');
  console.log('======================');
  
  // Check response structure
  if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    console.log('Warning: Response does not contain choices');
    console.log('Raw response:');
    console.log(util.inspect(data, { depth: 3, colors: true }));
    return;
  }
  
  // Extract content from first choice
  const choice = data.choices[0];
  const content = choice.message?.content;
  
  if (!content) {
    console.log('Warning: Response does not contain content');
    console.log('Raw response:');
    console.log(util.inspect(data, { depth: 3, colors: true }));
    return;
  }
  
  // Print usage information if available
  if (data.usage) {
    console.log('Token Usage:');
    console.log(`- Prompt tokens: ${data.usage.prompt_tokens || 'N/A'}`);
    console.log(`- Completion tokens: ${data.usage.completion_tokens || 'N/A'}`);
    console.log(`- Total tokens: ${data.usage.total_tokens || 'N/A'}`);
  }
  
  // Print model information
  console.log(`Model: ${data.model || config.model}`);
  
  // Calculate statistics
  const wordCount = content.split(/\s+/).length;
  const paragraphCount = content.split(/\n\s*\n/).length;
  
  console.log(`Word Count: ${wordCount}`);
  console.log(`Paragraph Count: ${paragraphCount}`);
  
  // Count code blocks
  const codeBlockMatches = content.match(/```[\s\S]*?```/g);
  const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;
  console.log(`Code Block Count: ${codeBlockCount}`);
  
  // Print content preview
  console.log('\nContent Preview:');
  console.log('---------------');
  console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
  
  // Print full content if verbose
  if (config.verbose) {
    console.log('\nFull Content:');
    console.log(content);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('DeepWiki Manual Test');
  console.log('===================');
  console.log(`Repository: ${config.repo}`);
  console.log(`Mode: ${config.mode}`);
  console.log(`Provider: ${config.provider}`);
  console.log(`Model: ${config.model}`);
  console.log(`API URL: ${config.apiUrl}`);
  console.log();
  
  if (config.mode === 'wiki') {
    await runWikiTest();
  } else if (config.mode === 'chat') {
    await runChatTest();
  } else {
    console.error(`Invalid mode: ${config.mode}. Must be "wiki" or "chat".`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

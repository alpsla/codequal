/**
 * Direct Provider Testing Script
 * 
 * This script tests all model providers directly, bypassing the DeepWiki API.
 * It uses the API keys from the environment to make direct calls to each
 * provider and reports on their functionality.
 */

require('dotenv').config();
const { performance } = require('perf_hooks');
const axios = require('axios');
const { createLogger } = require('../../dist/utils/logger');

// Create a logger
const logger = createLogger('DirectProviderTest');

// Test OpenAI
async function testOpenAI() {
  try {
    logger.info('Testing OpenAI API directly...');
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OPENAI_API_KEY not set in environment');
      return { success: false, error: 'API key not set' };
    }
    
    const startTime = performance.now();
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is the capital of France?' }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
      }
    );
    
    const endTime = performance.now();
    const responseTime = (endTime - startTime) / 1000;
    
    if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
      logger.info('OpenAI API test successful', {
        responseTime,
        response: response.data.choices[0].message.content
      });
      
      return {
        success: true,
        responseTime,
        response: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } else {
      logger.error('OpenAI API test failed with unexpected response', {
        status: response.status,
        data: response.data
      });
      
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    logger.error('OpenAI API test failed', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Test Anthropic
async function testAnthropic() {
  try {
    logger.info('Testing Anthropic API directly...');
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error('ANTHROPIC_API_KEY not set in environment');
      return { success: false, error: 'API key not set' };
    }
    
    const startTime = performance.now();
    
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 50,
        messages: [
          { role: 'user', content: 'What is the capital of France?' }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey
        },
        timeout: 30000
      }
    );
    
    const endTime = performance.now();
    const responseTime = (endTime - startTime) / 1000;
    
    if (response.status === 200 && response.data.content && response.data.content.length > 0) {
      logger.info('Anthropic API test successful', {
        responseTime,
        response: response.data.content[0].text
      });
      
      return {
        success: true,
        responseTime,
        response: response.data.content[0].text,
        usage: {
          input_tokens: response.data.usage?.input_tokens,
          output_tokens: response.data.usage?.output_tokens
        }
      };
    } else {
      logger.error('Anthropic API test failed with unexpected response', {
        status: response.status,
        data: response.data
      });
      
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    logger.error('Anthropic API test failed', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Test Google
async function testGoogle() {
  try {
    logger.info('Testing Google API directly...');
    
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      logger.error('GOOGLE_API_KEY not set in environment');
      return { success: false, error: 'API key not set' };
    }
    
    const startTime = performance.now();
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: 'What is the capital of France?' }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 50
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const endTime = performance.now();
    const responseTime = (endTime - startTime) / 1000;
    
    if (response.status === 200 && response.data.candidates && response.data.candidates.length > 0) {
      const textContent = response.data.candidates[0].content.parts[0].text;
      
      logger.info('Google API test successful', {
        responseTime,
        response: textContent
      });
      
      return {
        success: true,
        responseTime,
        response: textContent,
        usage: {
          input_tokens: response.data.usage?.promptTokenCount,
          output_tokens: response.data.usage?.candidatesTokenCount
        }
      };
    } else {
      logger.error('Google API test failed with unexpected response', {
        status: response.status,
        data: response.data
      });
      
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    logger.error('Google API test failed', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Test DeepSeek
async function testDeepSeek() {
  try {
    logger.info('Testing DeepSeek API directly...');
    
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      logger.error('DEEPSEEK_API_KEY not set in environment');
      return { success: false, error: 'API key not set' };
    }
    
    const startTime = performance.now();
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-coder',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is the capital of France?' }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
      }
    );
    
    const endTime = performance.now();
    const responseTime = (endTime - startTime) / 1000;
    
    if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
      logger.info('DeepSeek API test successful', {
        responseTime,
        response: response.data.choices[0].message.content
      });
      
      return {
        success: true,
        responseTime,
        response: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } else {
      logger.error('DeepSeek API test failed with unexpected response', {
        status: response.status,
        data: response.data
      });
      
      return { success: false, error: 'Unexpected response' };
    }
  } catch (error) {
    logger.error('DeepSeek API test failed', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Run all tests
async function testAllProviders() {
  console.log('\nDirect Provider Testing');
  console.log('======================\n');
  
  console.log('Testing OpenAI API...');
  const openaiResult = await testOpenAI();
  console.log(`OpenAI API: ${openaiResult.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
  if (!openaiResult.success) {
    console.log('Error:', openaiResult.error);
    if (openaiResult.data) {
      console.log('Details:', openaiResult.data.error?.message || JSON.stringify(openaiResult.data));
    }
  } else {
    console.log(`Response Time: ${openaiResult.responseTime.toFixed(2)}s`);
    console.log(`Response: "${openaiResult.response.trim()}"`);
  }
  
  console.log('\nTesting Anthropic API...');
  const anthropicResult = await testAnthropic();
  console.log(`Anthropic API: ${anthropicResult.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
  if (!anthropicResult.success) {
    console.log('Error:', anthropicResult.error);
    if (anthropicResult.data) {
      console.log('Details:', anthropicResult.data.error?.message || JSON.stringify(anthropicResult.data));
    }
  } else {
    console.log(`Response Time: ${anthropicResult.responseTime.toFixed(2)}s`);
    console.log(`Response: "${anthropicResult.response.trim()}"`);
  }
  
  console.log('\nTesting Google API...');
  const googleResult = await testGoogle();
  console.log(`Google API: ${googleResult.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
  if (!googleResult.success) {
    console.log('Error:', googleResult.error);
    if (googleResult.data) {
      console.log('Details:', googleResult.data.error?.message || JSON.stringify(googleResult.data));
    }
  } else {
    console.log(`Response Time: ${googleResult.responseTime.toFixed(2)}s`);
    console.log(`Response: "${googleResult.response.trim()}"`);
  }
  
  console.log('\nTesting DeepSeek API...');
  const deepseekResult = await testDeepSeek();
  console.log(`DeepSeek API: ${deepseekResult.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
  if (!deepseekResult.success) {
    console.log('Error:', deepseekResult.error);
    if (deepseekResult.data) {
      console.log('Details:', deepseekResult.data.error?.message || JSON.stringify(deepseekResult.data));
    }
  } else {
    console.log(`Response Time: ${deepseekResult.responseTime.toFixed(2)}s`);
    console.log(`Response: "${deepseekResult.response.trim()}"`);
  }
  
  console.log('\nProvider Testing Summary:');
  console.log('------------------------');
  console.log(`OpenAI API:    ${openaiResult.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
  console.log(`Anthropic API: ${anthropicResult.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
  console.log(`Google API:    ${googleResult.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
  console.log(`DeepSeek API:  ${deepseekResult.success ? '✅ WORKING' : '❌ NOT WORKING'}`);
  
  const workingCount = [openaiResult, anthropicResult, googleResult, deepseekResult]
    .filter(result => result.success).length;
  
  console.log(`\n${workingCount}/4 providers are working directly.\n`);
  
  if (workingCount === 0) {
    console.log('Recommendation: Check API keys in the environment and ensure they are valid.');
    console.log('All providers are failing, which suggests there may be an environment issue.');
  } else if (workingCount < 4) {
    console.log('Recommendation: Update calibration to use only the working providers:');
    const workingProviders = [];
    if (openaiResult.success) workingProviders.push('openai');
    if (anthropicResult.success) workingProviders.push('anthropic');
    if (googleResult.success) workingProviders.push('google');
    if (deepseekResult.success) workingProviders.push('deepseek');
    
    console.log(`./calibration-modes.sh full ${[
      'openai', 'anthropic', 'google', 'deepseek'
    ].filter(p => !workingProviders.includes(p)).join(',')}`);
  } else {
    console.log('Recommendation: All providers are working directly! You can proceed with full calibration:');
    console.log('./calibration-modes.sh full');
  }
}

// Execute if run directly
if (require.main === module) {
  testAllProviders().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
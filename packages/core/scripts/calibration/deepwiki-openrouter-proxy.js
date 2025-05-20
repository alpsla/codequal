/**
 * DeepWiki OpenRouter Proxy
 * 
 * This script creates a small HTTP server that acts as a proxy between DeepWiki and OpenRouter.
 * It provides the same endpoint as DeepWiki (/chat/completions/stream) but actually routes
 * directly to OpenRouter, bypassing DeepWiki's integration issues.
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 8002; // Use a different port from DeepWiki
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const REPORTS_DIR = path.join(__dirname, 'proxy-reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Create Express app
const app = express();
app.use(express.json());
app.use(cors());

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to DeepWiki OpenRouter Proxy',
    version: '1.0.0',
    endpoints: {
      Chat: [
        'POST /chat/completions/stream - Streaming chat completion (same as DeepWiki)'
      ]
    }
  });
});

// Main endpoint to mimic DeepWiki
app.post('/chat/completions/stream', async (req, res) => {
  console.log('Request received:', JSON.stringify(req.body, null, 2));
  
  // Extract parameters from the request
  const { model, repo_url, messages, max_tokens = 2000, temperature = 0.7, stream = false } = req.body;
  
  if (!model) {
    return res.status(400).json({ error: 'Model is required' });
  }
  
  if (!repo_url) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages must be an array' });
  }
  
  // Ensure OPENROUTER_API_KEY is set
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set' });
  }
  
  // Create enhanced messages with repo info
  const enhancedMessages = [
    ...messages,
    {
      role: 'user',
      content: `Please analyze this GitHub repository: ${repo_url}`
    }
  ];
  
  try {
    // Make request to OpenRouter
    const openRouterResponse = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: enhancedMessages,
        max_tokens,
        temperature,
        stream
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/deepwiki',
          'X-Title': 'DeepWiki Proxy'
        }
      }
    );
    
    const responseData = openRouterResponse.data;
    
    // Save the response to a file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const repoName = repo_url.split('/').pop().replace('.git', '');
    const modelName = model.replace('/', '-');
    const filename = `${repoName}-${modelName}-${timestamp}.json`;
    const filePath = path.join(REPORTS_DIR, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(responseData, null, 2));
    console.log(`Response saved to ${filePath}`);
    
    // Return the response in the same format as DeepWiki
    return res.json(responseData);
  } catch (error) {
    console.error('Error calling OpenRouter:', error.response?.data || error.message);
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message;
    
    return res.status(statusCode).json({ error: errorMessage });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`DeepWiki OpenRouter Proxy server running on port ${PORT}`);
  console.log(`Access the proxy at http://localhost:${PORT}`);
  console.log(`API key: ${OPENROUTER_API_KEY ? OPENROUTER_API_KEY.substring(0, 5) + '...' : 'Not set'}`);
  console.log(`Reports directory: ${REPORTS_DIR}`);
  console.log('');
  console.log('Usage example:');
  console.log(`curl -X POST http://localhost:${PORT}/chat/completions/stream -H 'Content-Type: application/json' -d '{"model":"anthropic/claude-3-7-sonnet","repo_url":"https://github.com/jpadilla/pyjwt","messages":[{"role":"system","content":"You are a helpful assistant."},{"role":"user","content":"Analyze this repository briefly."}],"max_tokens":100,"stream":false}'`);
});
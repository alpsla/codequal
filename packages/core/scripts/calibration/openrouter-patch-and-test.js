/**
 * OpenRouter Patch and Test for DeepWiki
 * 
 * This script patches the OpenRouter client in DeepWiki to handle model name formats
 * correctly, especially with provider/model notation like "anthropic/claude-3-7-sonnet".
 * It then tests the integration with a simple analysis.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Load environment variables
require('./load-env')();

// Configuration
const MODEL = process.env.MODEL || 'anthropic/claude-3-7-sonnet';
const TEST_REPO_URL = 'https://github.com/jpadilla/pyjwt';
const OUTPUT_DIR = path.join(__dirname, 'reports');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

/**
 * Apply the OpenRouter client patch to fix model name format handling
 */
async function applyOpenRouterPatch() {
  console.log('Applying OpenRouter client patch...');
  
  try {
    // Get the DeepWiki pod name
    const { stdout: podName } = await exec('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'');
    
    if (!podName.trim()) {
      throw new Error('DeepWiki pod not found');
    }
    
    console.log(`DeepWiki pod found: ${podName.trim()}`);
    
    // Create the Python patch script content
    const patchScript = `
#!/usr/bin/env python3

"""
Fix OpenRouter Client for DeepWiki
This script fixes the OpenRouter client in DeepWiki to handle model name formats correctly
"""

import sys
import os

# Define the Python code to add
PATCH_CODE = """
    def ensure_model_prefix(self, model_name):
        \"\"\"Ensure the model name has the provider prefix.\"\"\"
        if not model_name:
            return "openai/gpt-3.5-turbo"
        
        # If the model name already has a prefix (contains "/"), return it unchanged
        if "/" in model_name:
            return model_name
        
        # Default to OpenAI prefix
        return f"openai/{model_name}"
"""

def apply_patch(file_path):
    """Apply the patch to the OpenRouter client file"""
    print(f"Applying patch to: {file_path}")
    
    try:
        # Read the file
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Create a backup
        with open(f"{file_path}.bak", 'w') as file:
            file.write(content)
        
        # Check if the patch is already applied
        if "def ensure_model_prefix" in content:
            print("Patch already applied. Skipping.")
            return True
        
        # Find the appropriate place to add the patch (before convert_inputs_to_api_kwargs)
        patched_content = content.replace(
            "    def convert_inputs_to_api_kwargs",
            f"{PATCH_CODE}\\n    def convert_inputs_to_api_kwargs"
        )
        
        # Update the model name handling in the convert_inputs_to_api_kwargs method
        patched_content = patched_content.replace(
            "            # Ensure model is specified\\n"
            "            if \\"model\\" not in api_kwargs:\\n"
            "                api_kwargs[\\"model\\"] = \\"openai/gpt-3.5-turbo\\"",
            
            "            # Ensure model is specified and has proper prefix\\n"
            "            if \\"model\\" not in api_kwargs:\\n"
            "                api_kwargs[\\"model\\"] = \\"openai/gpt-3.5-turbo\\"\\n"
            "            else:\\n"
            "                api_kwargs[\\"model\\"] = self.ensure_model_prefix(api_kwargs[\\"model\\"])"
        )
        
        # Write the patched file
        with open(file_path, 'w') as file:
            file.write(patched_content)
        
        print("Patch applied successfully.")
        return True
    
    except Exception as e:
        print(f"Error applying patch: {e}")
        return False

# Apply the patch to the file given as argument
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 fix_openrouter.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
    
    if apply_patch(file_path):
        sys.exit(0)
    else:
        sys.exit(1)
`;
    
    // Create the Google model fix script content
    const googleModelFixScript = `
#!/usr/bin/env python3

"""
Fix Google Generative AI Model Initialization
This script fixes the issue with model name format when using Google Generative AI
"""

import sys
import os

def fix_google_model(file_path):
    """Fix the Google model initialization to handle OpenRouter model formats"""
    print(f"Fixing Google model initialization in {file_path}")
    
    try:
        # Read the file
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Create a backup
        with open(f"{file_path}.google.bak", 'w') as file:
            file.write(content)
        
        # Add a helper function to extract base model name without provider prefix
        helper_function = """
def extract_base_model_name(model_name):
    \"\"\"Extract the base model name without provider prefix.\"\"\"
    if not model_name:
        return "gemini-pro"
    
    # If the model name contains a provider prefix (e.g., 'openai/gpt-4'),
    # extract just the model part after the '/'
    if "/" in model_name:
        return model_name.split("/", 1)[1]
    
    return model_name

"""
        
        # Add the helper function after the imports
        modified_content = content.replace(
            "from api.config import get_model_config",
            "from api.config import get_model_config\\n" + helper_function
        )
        
        # Update the Google model initialization to use the helper function
        modified_content = modified_content.replace(
            "            # Initialize Google Generative AI model\\n"
            "            model = genai.GenerativeModel(\\n"
            "                model_name=model_config[\\"model\\"],",
            
            "            # Initialize Google Generative AI model\\n"
            "            # Extract base model name without provider prefix for Google AI\\n"
            "            base_model_name = extract_base_model_name(model_config[\\"model\\"])\\n"
            "            model = genai.GenerativeModel(\\n"
            "                model_name=base_model_name,"
        )
        
        # Also update the fallback initialization
        modified_content = modified_content.replace(
            "                            # Initialize Google Generative AI model\\n"
            "                            model_config = get_model_config(request.provider, request.model)\\n"
            "                            fallback_model = genai.GenerativeModel(\\n"
            "                                model_name=model_config[\\"model\\"],",
            
            "                            # Initialize Google Generative AI model\\n"
            "                            model_config = get_model_config(request.provider, request.model)\\n"
            "                            # Extract base model name without provider prefix for Google AI\\n"
            "                            base_model_name = extract_base_model_name(model_config[\\"model\\"])\\n"
            "                            fallback_model = genai.GenerativeModel(\\n"
            "                                model_name=base_model_name,"
        )
        
        # Write the modified file
        with open(file_path, 'w') as file:
            file.write(modified_content)
        
        print("Google model initialization fixed successfully.")
        return True
    
    except Exception as e:
        print(f"Error fixing Google model initialization: {e}")
        return False

# Main function
def main():
    if len(sys.argv) != 2:
        print("Usage: python fix_google_model.py <simple_chat.py_path>")
        return 1
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return 1
    
    if fix_google_model(file_path):
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())
`;
    
    // Write the patches to temporary files
    fs.writeFileSync('/tmp/fix_openrouter.py', patchScript);
    fs.writeFileSync('/tmp/fix_google_model.py', googleModelFixScript);
    
    // Copy the patch scripts to the pod
    await exec(`kubectl cp /tmp/fix_openrouter.py codequal-dev/${podName.trim()}:/tmp/fix_openrouter.py`);
    await exec(`kubectl cp /tmp/fix_google_model.py codequal-dev/${podName.trim()}:/tmp/fix_google_model.py`);
    
    // Make the scripts executable and run them
    await exec(`kubectl exec -n codequal-dev ${podName.trim()} -- bash -c "chmod +x /tmp/fix_openrouter.py && python3 /tmp/fix_openrouter.py /app/api/openrouter_client.py"`);
    await exec(`kubectl exec -n codequal-dev ${podName.trim()} -- bash -c "chmod +x /tmp/fix_google_model.py && python3 /tmp/fix_google_model.py /app/api/simple_chat.py"`);
    
    // Set the OpenRouter API key in the pod
    if (OPENROUTER_API_KEY) {
      await exec(`kubectl exec -n codequal-dev ${podName.trim()} -- bash -c "export OPENROUTER_API_KEY=${OPENROUTER_API_KEY}"`);
    }
    
    // Create OpenRouter configuration
    const openrouterConfig = `
enabled: true
api_key: ${OPENROUTER_API_KEY}
api_base: https://openrouter.ai/api/v1
embedding_model: text-embedding-ada-002
embedding_dimension: 1536

# Define models with correct naming format
models:
  - name: openai/gpt-4o
    max_tokens: 8192
    supports_functions: true
    supports_vision: true
  - name: anthropic/claude-3-7-sonnet
    max_tokens: 16384
    supports_functions: true
    supports_vision: true
  - name: anthropic/claude-3-opus
    max_tokens: 32768
    supports_functions: true
    supports_vision: true
  - name: deepseek/deepseek-coder
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
`;
    
    // Write the OpenRouter configuration to a temporary file
    fs.writeFileSync('/tmp/openrouter.yaml', openrouterConfig);
    
    // Copy the configuration to the pod
    await exec(`kubectl cp /tmp/openrouter.yaml codequal-dev/${podName.trim()}:/root/.adalflow/providers/openrouter.yaml`);
    
    // Reset the database to apply the new configuration
    await exec(`kubectl exec -n codequal-dev ${podName.trim()} -- bash -c "rm -rf /root/.adalflow/data/* || true; mkdir -p /root/.adalflow/data; touch /root/.adalflow/data/.reset_marker"`);
    
    // Restart the pod
    console.log('Restarting the DeepWiki pod...');
    await exec(`kubectl delete pod -n codequal-dev ${podName.trim()}`);
    
    // Wait for the pod to restart
    console.log('Waiting for the pod to restart...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    return true;
  } catch (error) {
    console.error('Error applying patches:', error.message);
    return false;
  }
}

/**
 * Check port forwarding and set it up if needed
 */
async function setupPortForwarding() {
  try {
    const { stdout: portForwardingCheck } = await exec('ps aux | grep "kubectl port-forward.*8001:8001" | grep -v grep');
    
    if (portForwardingCheck.trim() === '') {
      console.log('Setting up port forwarding...');
      
      // Get the DeepWiki pod name
      const { stdout: podName } = await exec('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'');
      
      if (!podName.trim()) {
        throw new Error('DeepWiki pod not found');
      }
      
      // Start port forwarding in the background
      execSync(`kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 > /dev/null 2>&1 &`);
      
      // Wait for port forwarding to be ready
      console.log('Waiting for port forwarding to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log('Port forwarding is already active');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up port forwarding:', error.message);
    return false;
  }
}

/**
 * Test the DeepWiki API with OpenRouter
 */
async function testDeepWikiAPI() {
  console.log('Testing DeepWiki API connection...');
  
  try {
    const response = await axios.get('http://localhost:8001', { timeout: 5000 });
    console.log('DeepWiki API is accessible');
    console.log('API info:', response.data);
    return true;
  } catch (error) {
    console.error('Error connecting to DeepWiki API:', error.message);
    return false;
  }
}

/**
 * Analyze a repository using DeepWiki with OpenRouter
 */
async function analyzeRepository() {
  console.log(`Analyzing repository: ${TEST_REPO_URL}`);
  console.log(`Using model: ${MODEL}`);
  
  // Format output filename
  const repoName = TEST_REPO_URL.split('/').pop().replace('.git', '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(OUTPUT_DIR, `${repoName}-openrouter-fixed-${timestamp}.md`);
  
  try {
    // Create a simple prompt
    const messages = [
      { role: 'system', content: 'You are an expert code analyzer powered by advanced AI.' },
      { role: 'user', content: `Analyze the GitHub repository at ${TEST_REPO_URL} and provide a brief summary (2-3 paragraphs) of what the repository does and its main components.` }
    ];
    
    console.log('Sending analysis request to DeepWiki...');
    
    // Try the non-streaming endpoint first
    const response = await axios.post('http://localhost:8001/chat/completions', {
      model: MODEL,
      repo_url: TEST_REPO_URL,
      messages: messages,
      max_tokens: 500,
      temperature: 0.3,
      stream: false
    }, {
      timeout: 300000 // 5 minute timeout
    });
    
    if (response.data && response.data.choices && response.data.choices[0].message.content) {
      const content = response.data.choices[0].message.content;
      console.log('Analysis completed successfully.');
      
      // Save the analysis to file
      fs.writeFileSync(outputFile, content);
      console.log(`Analysis saved to: ${outputFile}`);
      
      return true;
    } else {
      console.error('Unexpected response format:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error analyzing repository:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    console.log('Falling back to direct analysis with OpenRouter...');
    return await analyzeRepositoryDirect();
  }
}

/**
 * Analyze a repository directly with OpenRouter as a fallback
 */
async function analyzeRepositoryDirect() {
  console.log(`Analyzing repository directly with OpenRouter: ${TEST_REPO_URL}`);
  
  // Format output filename
  const repoName = TEST_REPO_URL.split('/').pop().replace('.git', '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(OUTPUT_DIR, `${repoName}-openrouter-direct-${timestamp}.md`);
  
  try {
    // Create a simple prompt
    const messages = [
      { role: 'system', content: 'You are an expert code analyzer with deep knowledge of software engineering.' },
      { role: 'user', content: `Please analyze this GitHub repository: ${TEST_REPO_URL} and provide a brief summary (2-3 paragraphs) of what it does and its main components.` }
    ];
    
    console.log('Sending analysis request directly to OpenRouter...');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: messages,
        max_tokens: 500,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com',
          'X-Title': 'Repository Analysis'
        }
      }
    );
    
    const content = response.data.choices[0].message.content;
    console.log('Direct analysis completed successfully.');
    
    // Save the analysis to file
    fs.writeFileSync(outputFile, content);
    console.log(`Analysis saved to: ${outputFile}`);
    
    return true;
  } catch (error) {
    console.error('Error with direct OpenRouter analysis:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('OpenRouter Patch and Test');
  console.log('=======================');
  
  // Apply the OpenRouter client patch
  console.log('\nStep 1: Applying OpenRouter client patch');
  const patchApplied = await applyOpenRouterPatch();
  
  if (!patchApplied) {
    console.error('Failed to apply OpenRouter client patch. Exiting.');
    process.exit(1);
  }
  
  // Set up port forwarding
  console.log('\nStep 2: Setting up port forwarding');
  const portForwardingSetup = await setupPortForwarding();
  
  if (!portForwardingSetup) {
    console.error('Failed to set up port forwarding. Exiting.');
    process.exit(1);
  }
  
  // Test the DeepWiki API
  console.log('\nStep 3: Testing DeepWiki API connection');
  const apiConnectionSuccessful = await testDeepWikiAPI();
  
  if (!apiConnectionSuccessful) {
    console.error('Failed to connect to DeepWiki API. Exiting.');
    process.exit(1);
  }
  
  // Analyze a repository
  console.log('\nStep 4: Testing repository analysis');
  const analysisSuccessful = await analyzeRepository();
  
  if (!analysisSuccessful) {
    console.error('Repository analysis failed. Tried direct OpenRouter as fallback.');
  }
  
  console.log('\nOpenRouter integration patch and test completed.');
}

// Run the main function
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
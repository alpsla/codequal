/**
 * DeepWiki Kubernetes Service
 * 
 * This service provides an interface to interact with DeepWiki running in a Kubernetes cluster.
 * It handles operations like analyzing repositories, fetching analysis results, and executing
 * targeted queries through the DeepWiki API.
 */

const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const config = require('./config');

const execFileAsync = promisify(execFile);

class DeepWikiKubernetesService {
  constructor(options = {}) {
    this.namespace = options.namespace || config.kubernetes.namespace;
    this.podSelector = options.podSelector || config.kubernetes.podSelector;
    this.port = options.port || config.kubernetes.port;
    this.timeout = options.timeout || config.kubernetes.timeout;
    
    this.baseUrl = `http://localhost:${this.port}`;
    this.portForwardingProcess = null;
  }

  /**
   * Initialize the service by setting up port forwarding to the DeepWiki pod
   */
  async initialize() {
    try {
      // Get the active pod name
      const { stdout } = await execFileAsync('kubectl', [
        'get', 'pods',
        '-n', this.namespace,
        '-l', `app=${this.podSelector}`,
        '-o', 'jsonpath={.items[0].metadata.name}'
      ]);
      
      const podName = stdout.trim();
      if (!podName) {
        throw new Error(`No DeepWiki pod found with selector: ${this.podSelector}`);
      }
      
      console.log(`Setting up port forwarding to DeepWiki pod: ${podName}`);
      
      // Set up port forwarding
      this.portForwardingProcess = execFile('kubectl', [
        'port-forward',
        '-n', this.namespace,
        `pod/${podName}`,
        `${this.port}:${this.port}`
      ]);
      
      // Wait for port forwarding to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test the connection
      try {
        await axios.get(`${this.baseUrl}/health`);
        console.log('Successfully connected to DeepWiki API');
      } catch (error) {
        console.warn('Could not verify DeepWiki API health endpoint, but continuing');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize DeepWiki Kubernetes service:', error.message);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Clean up resources when the service is no longer needed
   */
  cleanup() {
    if (this.portForwardingProcess) {
      console.log('Terminating port forwarding');
      this.portForwardingProcess.kill();
      this.portForwardingProcess = null;
    }
  }

  /**
   * Analyze a repository using DeepWiki
   * 
   * @param {Object} options - Analysis options
   * @param {string} options.repositoryUrl - URL of the repository to analyze
   * @param {string} options.primaryModel - Primary model to use
   * @param {string[]} options.fallbackModels - Fallback models to use if primary fails
   * @param {string} options.promptTemplate - Prompt template to use
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeRepository(options) {
    const {
      repositoryUrl,
      primaryModel = config.openRouter.defaultModel,
      fallbackModels = config.openRouter.fallbackModels,
      promptTemplate = 'standard'
    } = options;
    
    try {
      console.log(`Analyzing repository: ${repositoryUrl} with model: ${primaryModel}`);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions/stream`, 
        {
          repo_url: repositoryUrl,
          messages: [
            {
              role: "user",
              content: this._getPromptForTemplate(promptTemplate)
            }
          ],
          stream: false,
          provider: "openrouter",
          model: primaryModel,
          fallback_models: fallbackModels.join(',')
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        model_used: response.data.model || primaryModel,
        content: response.data.choices[0].message.content,
        raw_response: response.data
      };
    } catch (error) {
      console.error(`Repository analysis failed: ${error.message}`);
      
      // Try to extract error details from response if available
      let errorDetails = {};
      try {
        if (error.response && error.response.data) {
          errorDetails = error.response.data;
        }
      } catch (parseError) {
        console.warn('Could not parse error response:', parseError.message);
      }
      
      return {
        success: false,
        error: error.message,
        details: errorDetails
      };
    }
  }

  /**
   * Send a chat completion request related to a repository
   * 
   * @param {Object} options - Chat options
   * @param {string} options.repositoryUrl - URL of the repository
   * @param {Array} options.messages - Chat messages
   * @param {string} options.model - Model to use
   * @param {string[]} options.fallbackModels - Fallback models to use if primary fails
   * @returns {Promise<Object>} Chat completion response
   */
  async getChatCompletion(options) {
    const {
      repositoryUrl,
      messages,
      model = config.openRouter.defaultModel,
      fallbackModels = config.openRouter.fallbackModels
    } = options;
    
    try {
      console.log(`Sending chat completion request for repository: ${repositoryUrl}`);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`, 
        {
          repo_url: repositoryUrl,
          messages,
          provider: "openrouter",
          model,
          fallback_models: fallbackModels.join(',')
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        model_used: response.data.model || model,
        content: response.data.choices[0].message.content,
        raw_response: response.data
      };
    } catch (error) {
      console.error(`Chat completion failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a DeepWiki command directly in the pod
   * This is used for more advanced operations not exposed through the API
   * 
   * @param {string} command - Command to execute
   * @returns {Promise<Object>} Command execution results
   */
  async executeCommand(command) {
    try {
      // Get the active pod name
      const { stdout: podName } = await execFileAsync('kubectl', [
        'get', 'pods',
        '-n', this.namespace,
        '-l', `app=${this.podSelector}`,
        '-o', 'jsonpath={.items[0].metadata.name}'
      ]);
      
      if (!podName.trim()) {
        throw new Error(`No DeepWiki pod found with selector: ${this.podSelector}`);
      }
      
      // Execute the command in the pod
      const { stdout, stderr } = await execFileAsync('kubectl', [
        'exec',
        '-n', this.namespace,
        podName.trim(),
        '--',
        'sh', '-c', command
      ]);
      
      return {
        success: true,
        stdout,
        stderr
      };
    } catch (error) {
      console.error(`Command execution failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a prompt based on the template name
   * 
   * @param {string} templateName - Name of the prompt template
   * @returns {string} Prompt text
   * @private
   */
  _getPromptForTemplate(templateName) {
    const templates = {
      standard: `Please analyze this repository and provide a comprehensive overview that includes:
1. Main purpose and functionality
2. Architecture overview
3. Key components and their relationships
4. Code organization and structure
5. Important technologies and dependencies
6. Best practices followed and areas for improvement
7. Additional insights that would help understand this codebase

Format your response in clear sections with markdown headings.`,
      
      architecture: `Please analyze this repository's architecture in detail, focusing on:
1. High-level architecture patterns (e.g. MVC, microservices)
2. Component organization and dependencies
3. Data flow between components
4. API design and interface patterns
5. Scalability and performance considerations
6. Notable design patterns used
7. Architecture strengths and potential improvements

Include diagrams or visual descriptions where helpful.`,
      
      'code-quality': `Perform a comprehensive code quality assessment of this repository:
1. Code organization and maintainability
2. Adherence to language/framework best practices
3. Test coverage and testing approach
4. Documentation quality
5. Error handling and edge cases
6. Performance considerations
7. Security practices
8. Specific recommendations for improvement

Rate each area on a scale of 1-10 and provide specific examples.`,
      
      security: `Conduct a security analysis of this repository, addressing:
1. Authentication and authorization mechanisms
2. Data validation and sanitization
3. Sensitive data handling
4. Vulnerability to common attack vectors
5. Dependency security issues
6. Compliance with security best practices
7. Critical security vulnerabilities
8. Recommendations for security improvements

Prioritize your findings from most to least critical.`
    };
    
    return templates[templateName] || templates.standard;
  }
}

module.exports = DeepWikiKubernetesService;

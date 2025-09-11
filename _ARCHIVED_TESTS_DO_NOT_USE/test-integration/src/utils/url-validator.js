#!/usr/bin/env node
/**
 * URL Validator Utility
 * Validates educational resource URLs to ensure they're accessible
 */

const axios = require('axios');
const chalk = require('chalk');

class URLValidator {
  constructor(options = {}) {
    this.timeout = options.timeout || 5000;
    this.retries = options.retries || 2;
    this.cache = new Map();
    this.userAgent = 'CodeQual-Educational-Validator/1.0';
  }

  /**
   * Validate a single URL
   * @param {string} url - The URL to validate
   * @returns {Promise<{valid: boolean, status: number, error?: string}>}
   */
  async validateURL(url) {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    let lastError = null;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await axios.head(url, {
          timeout: this.timeout,
          validateStatus: () => true, // Don't throw on any status
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          maxRedirects: 5
        });

        const result = {
          valid: response.status >= 200 && response.status < 400,
          status: response.status,
          error: response.status >= 400 ? `HTTP ${response.status}` : undefined
        };

        this.cache.set(url, result);
        return result;
      } catch (error) {
        lastError = error;
        
        // If it's a network error, try GET as some servers don't support HEAD
        if (attempt === 0 && error.code === 'ECONNRESET') {
          try {
            const response = await axios.get(url, {
              timeout: this.timeout,
              validateStatus: () => true,
              headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              },
              maxRedirects: 5,
              maxContentLength: 1024 * 10 // Only read first 10KB
            });

            const result = {
              valid: response.status >= 200 && response.status < 400,
              status: response.status,
              error: response.status >= 400 ? `HTTP ${response.status}` : undefined
            };

            this.cache.set(url, result);
            return result;
          } catch (getError) {
            lastError = getError;
          }
        }

        // Wait before retry
        if (attempt < this.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // All attempts failed
    const result = {
      valid: false,
      status: 0,
      error: lastError.message || 'Unknown error'
    };

    this.cache.set(url, result);
    return result;
  }

  /**
   * Validate multiple URLs in parallel
   * @param {string[]} urls - Array of URLs to validate
   * @returns {Promise<Map<string, {valid: boolean, status: number, error?: string}>>}
   */
  async validateURLs(urls) {
    const results = new Map();
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async url => {
          const result = await this.validateURL(url);
          return { url, result };
        })
      );
      
      batchResults.forEach(({ url, result }) => {
        results.set(url, result);
      });
    }

    return results;
  }

  /**
   * Get alternative URLs for common broken patterns
   * @param {string} url - The broken URL
   * @returns {string[]} - Array of alternative URLs to try
   */
  getAlternatives(url) {
    const alternatives = [];

    // TypeScript documentation alternatives
    if (url.includes('typescriptlang.org/docs/handbook/solid.html')) {
      alternatives.push(
        'https://www.typescriptlang.org/docs/handbook/2/classes.html#solid-principles',
        'https://blog.logrocket.com/solid-principles-typescript/',
        'https://medium.com/@mathieu.breton/solid-principles-with-typescript-c8b146d8ed02'
      );
    }

    // GitHub raw content alternatives
    if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
      const rawUrl = url
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
      alternatives.push(rawUrl);
    }

    // MDN alternatives
    if (url.includes('developer.mozilla.org') && url.includes('/en-US/')) {
      // Try without locale
      alternatives.push(url.replace('/en-US/', '/'));
    }

    return alternatives;
  }

  /**
   * Clear the validation cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export for use in other modules
module.exports = { URLValidator };

// CLI usage
if (require.main === module) {
  const urls = process.argv.slice(2);
  
  if (urls.length === 0) {
    console.log(chalk.yellow('Usage: node url-validator.js <url1> [url2] [url3] ...'));
    process.exit(1);
  }

  const validator = new URLValidator();
  
  (async () => {
    console.log(chalk.bold.blue('🔍 Validating URLs...\n'));
    
    for (const url of urls) {
      const result = await validator.validateURL(url);
      
      if (result.valid) {
        console.log(chalk.green('✅'), chalk.white(url));
        console.log(chalk.gray(`   Status: ${result.status}`));
      } else {
        console.log(chalk.red('❌'), chalk.white(url));
        console.log(chalk.gray(`   Error: ${result.error}`));
        
        // Check for alternatives
        const alternatives = validator.getAlternatives(url);
        if (alternatives.length > 0) {
          console.log(chalk.yellow('   Alternatives:'));
          for (const alt of alternatives) {
            const altResult = await validator.validateURL(alt);
            if (altResult.valid) {
              console.log(chalk.green(`   ✓ ${alt}`));
            } else {
              console.log(chalk.gray(`   ✗ ${alt} (${altResult.error})`));
            }
          }
        }
      }
      console.log();
    }
  })();
}
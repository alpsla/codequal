/**
 * Utilities for handling API keys
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Load environment variables from .env file
 * @param envPath Path to .env file
 * @returns Whether the file was successfully loaded
 */
export function loadEnvFile(envPath: string): boolean {
  if (fs.existsSync(envPath)) {
    try {
      const result = dotenv.config({ path: envPath });
      return !result.error;
    } catch (error) {
      // Use logger instead of console once we have it properly set up
      if (error instanceof Error) {
        console.error(`Error loading .env file: ${error.message}`);
      } else {
        console.error('Unknown error loading .env file');
      }
      return false;
    }
  }
  return false;
}

/**
 * Get the Anthropic API key from environment variables or fallback methods
 * @returns The API key if found, null otherwise
 */
export function getAnthropicApiKey(): string | null {
  // Try to load .env file at project root if not already loaded
  const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '..', '.env');
  loadEnvFile(rootEnvPath);
  
  let apiKey = process.env.ANTHROPIC_API_KEY || null;
  
  // Try alternative variables
  if (!apiKey) {
    apiKey = process.env.ANTHROPIC_KEY || 
             process.env.CLAUDE_API_KEY || 
             process.env.CLAUDE_KEY || 
             null;
  }
  
  // Clean and validate
  if (apiKey) {
    apiKey = cleanApiKey(apiKey);
  }
  
  return apiKey;
}

/**
 * Get the GitHub token from environment variables
 * @returns The token if found, null otherwise
 */
export function getGitHubToken(): string | null {
  let token = process.env.GITHUB_TOKEN || null;
  
  // Try alternative variables
  if (!token) {
    token = process.env.GH_TOKEN || 
            process.env.GITHUB_API_TOKEN || 
            null;
  }
  
  // Clean and validate
  if (token) {
    token = cleanApiKey(token);
  }
  
  return token;
}

/**
 * Clean an API key to ensure it's properly formatted
 * @param key The API key to clean
 * @returns The cleaned API key
 */
export function cleanApiKey(key: string | unknown): string {
  if (typeof key !== 'string') {
    return String(key);
  }
  
  // Remove whitespace
  let cleanedKey = key.trim();
  
  // Remove quotes if present
  if ((cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) || 
      (cleanedKey.startsWith("'") && cleanedKey.endsWith("'"))) {
    cleanedKey = cleanedKey.slice(1, -1);
  }
  
  return cleanedKey;
}
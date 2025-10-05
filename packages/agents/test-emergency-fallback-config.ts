#!/usr/bin/env ts-node
/**
 * Test Emergency Fallback Configuration
 * Verifies that .env configuration is read correctly
 */

// Load .env
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import the emergency fallback provider
import { getEmergencyFallbackProvider } from './src/two-branch/services/emergency-fallback-provider';

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║  Emergency Fallback Configuration Test                        ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

const provider = getEmergencyFallbackProvider();

console.log("Environment Variables:");
console.log(`  EMERGENCY_FALLBACK_PROVIDER: ${process.env.EMERGENCY_FALLBACK_PROVIDER || '(default: gemini)'}`);
console.log(`  EMERGENCY_FALLBACK_MODEL: ${process.env.EMERGENCY_FALLBACK_MODEL || '(not set)'}`);
console.log(`  GEMINI_MODEL: ${process.env.GEMINI_MODEL || '(not set)'}`);
console.log(`  CLAUDE_MODEL: ${process.env.CLAUDE_MODEL || '(not set)'}`);
console.log(`  GPT_MODEL: ${process.env.GPT_MODEL || '(not set)'}`);
console.log(`  GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '✅ Set (' + process.env.GOOGLE_API_KEY.substring(0, 10) + '...)' : '❌ Not set'}`);
console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log();

const config = provider.getConfig();
const isAvailable = provider.isAvailable();

console.log("Resolved Configuration:");
console.log(`  Provider: ${config.provider}`);
console.log(`  Model: ${config.model}`);
console.log(`  API Key: ${config.apiKey ? '✅ Set (' + config.apiKey.substring(0, 10) + '...)' : '❌ Not set'}`);
console.log(`  Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);
console.log();

if (isAvailable) {
  console.log("✅ Emergency fallback is properly configured!");
  console.log(`   Will use: ${config.provider}/${config.model}`);
} else {
  console.log("⚠️  Emergency fallback is NOT configured");
  console.log("   Add API key to .env to enable fallback");
}

console.log();
console.log("Configuration Examples for Future Upgrades:");
console.log();
console.log("# Switch to Gemini 3.0 Flash (when available):");
console.log("GEMINI_MODEL=gemini-3.0-flash");
console.log();
console.log("# Switch to Claude Sonnet 4.5 (when available):");
console.log("EMERGENCY_FALLBACK_PROVIDER=anthropic");
console.log("CLAUDE_MODEL=claude-sonnet-4.5-20250701");
console.log();

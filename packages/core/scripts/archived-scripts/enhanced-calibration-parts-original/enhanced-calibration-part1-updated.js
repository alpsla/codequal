#!/usr/bin/env node
/**
 * Enhanced Calibration Script
 * 
 * This script addresses several issues with the previous calibration approach:
 * 1. Updates model list to include Gemini 2.5 models only (removes 1.5)
 * 2. Reduces the impact of speed on scoring (15% vs previous 30%)
 * 3. Adds price as a parameter (with 35% weight - comparable to quality)
 * 4. Provides manual API key override options for models with auth issues
 * 5. Implements more detailed error handling and reporting
 * 6. Generates a comprehensive CSV report for manual analysis
 */

// Load required modules
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');
// eslint-disable-next-line no-unused-vars
const axios = require('axios');
const { loadApiKeys, callModelApi, validateAllApiKeys } = require('../src/utils/api-utils');
const { createPrompts, evaluateQuality } = require('../src/utils/prompt-utils');
const { getRepositoryContext } = require('../src/utils/repository-utils');
const { generateModelConfig } = require('../src/utils/config-generator');
const { generateDetailedReport } = require('./generate-detailed-report');

// Load environment variables
dotenv.config();

// File paths
const RESULTS_DIR = path.join(__dirname, 'calibration-results');
const RESULTS_FILE = path.join(RESULTS_DIR, 'enhanced-calibration-results.json');
const CONFIG_OUTPUT_PATH = path.join(RESULTS_DIR, 'repository-model-config.ts');
const ERROR_LOG_PATH = path.join(RESULTS_DIR, 'calibration-errors.log');
const CSV_REPORT_PATH = path.join(RESULTS_DIR, 'detailed-calibration-report.csv');

// Create results directory if it doesn't exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Available categories
const CATEGORIES = [
  'architecture',
  'codeQuality',
  'security',
  'bestPractices',
  'performance'
];

// Available languages and sizes
const TEST_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'go',
  'ruby',
  'php',
  'rust',
  'kotlin'
];

const TEST_SIZES = ['small', 'medium', 'large'];

// Test repositories by language and size
const TEST_REPOSITORIES = {
  javascript: {
    small: ['lodash/lodash', 'axios/axios'],
    medium: ['facebook/react', 'expressjs/express'],
    large: ['microsoft/vscode', 'nodejs/node']
  },
  typescript: {
    small: ['typeorm/typeorm', 'nestjs/nest'],
    medium: ['microsoft/typescript', 'angular/angular'],
    large: ['microsoft/vscode', 'microsoft/TypeScript-Node-Starter']
  },
  python: {
    small: ['psf/requests', 'pallets/flask'],
    medium: ['django/django', 'pandas-dev/pandas'],
    large: ['tensorflow/tensorflow', 'scikit-learn/scikit-learn']
  },
  java: {
    small: ['junit-team/junit5', 'google/gson'],
    medium: ['spring-projects/spring-boot', 'iluwatar/java-design-patterns'],
    large: ['elastic/elasticsearch', 'apache/kafka']
  },
  go: {
    small: ['spf13/cobra', 'pkg/errors'],
    medium: ['gin-gonic/gin', 'kubernetes/minikube'],
    large: ['kubernetes/kubernetes', 'ethereum/go-ethereum']
  },
  rust: {
    small: ['BurntSushi/ripgrep', 'clap-rs/clap'],
    medium: ['tokio-rs/tokio', 'rust-lang/cargo'],
    large: ['rust-lang/rust', 'paritytech/substrate']
  },
  kotlin: {
    small: ['JetBrains/Exposed', 'InsertKoinIO/koin'],
    medium: ['detekt/detekt', 'ktorio/ktor'],
    large: ['JetBrains/kotlin', 'android/architecture-components-samples']
  },
  php: {
    small: ['guzzle/guzzle', 'briannesbitt/Carbon'],
    medium: ['laravel/laravel', 'symfony/symfony'],
    large: ['WordPress/WordPress', 'magento/magento2']
  }
};

// Pricing information by model (per 1M tokens)
const MODEL_PRICING = {
  // Removed older Claude models
  // 'anthropic/claude-3-opus-20240229': { input: 15, output: 75 },
  // 'anthropic/claude-3-sonnet-20240229': { input: 3, output: 15 },
  // 'anthropic/claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'anthropic/claude-3.5-sonnet-20240620': { input: 5, output: 25 },
  'anthropic/claude-3.7-sonnet': { input: 8, output: 24 },
  'openai/gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'openai/gpt-4o': { input: 5, output: 15 },
  'openai/gpt-4-turbo': { input: 10, output: 30 },
  // Added all Deepseek models
  'deepseek/deepseek-coder': { input: 0.7, output: 1.0 },
  'deepseek/deepseek-coder-v2': { input: 0.8, output: 1.2 },
  'deepseek/deepseek-chat-v2': { input: 0.5, output: 0.8 },
  'google/gemini-2.5-pro': { input: 1.75, output: 14.00 },
  'google/gemini-2.5-pro-preview-05-06': { input: 1.75, output: 14.00 },
  'google/gemini-2.5-flash': { input: 0.3, output: 1.25 },
  'openrouter/anthropic/claude-3.7-sonnet': { input: 8.5, output: 25 },
  'openrouter/nousresearch/deephermes-3-mistral-24b-preview:free': { input: 0, output: 0 }
};

// Manual API key registry
const manualApiKeys = {};
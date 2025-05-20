/**
 * Configuration for enhanced calibration
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// File paths
const RESULTS_DIR = path.join(__dirname, '../../calibration-results');
const RESULTS_FILE = path.join(RESULTS_DIR, 'enhanced-calibration-results.json');
const CONFIG_OUTPUT_PATH = path.join(RESULTS_DIR, 'repository-model-config.ts');
const ERROR_LOG_PATH = path.join(RESULTS_DIR, 'calibration-errors.log');
const CSV_REPORT_PATH = path.join(RESULTS_DIR, 'detailed-calibration-report.csv');

// Create results directory if it doesn't exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

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

module.exports = {
  RESULTS_DIR,
  RESULTS_FILE,
  CONFIG_OUTPUT_PATH,
  ERROR_LOG_PATH,
  CSV_REPORT_PATH,
  CATEGORIES,
  TEST_LANGUAGES,
  TEST_SIZES,
  TEST_REPOSITORIES,
  MODEL_PRICING
};
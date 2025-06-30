import { OpenAI } from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SDKConfig {
  language: string;
  packageName: string;
  outputDir: string;
  packageManager: string;
  fileExtension: string;
}

const SDK_CONFIGS: SDKConfig[] = [
  {
    language: 'python',
    packageName: 'codequal',
    outputDir: 'sdks/python',
    packageManager: 'pip',
    fileExtension: 'py'
  },
  {
    language: 'javascript',
    packageName: 'codequal',
    outputDir: 'sdks/javascript',
    packageManager: 'npm',
    fileExtension: 'js'
  },
  {
    language: 'typescript',
    packageName: 'codequal',
    outputDir: 'sdks/typescript',
    packageManager: 'npm',
    fileExtension: 'ts'
  },
  {
    language: 'go',
    packageName: 'github.com/codequal/codequal-go',
    outputDir: 'sdks/go',
    packageManager: 'go',
    fileExtension: 'go'
  },
  {
    language: 'java',
    packageName: 'com.codequal',
    outputDir: 'sdks/java',
    packageManager: 'maven',
    fileExtension: 'java'
  },
  {
    language: 'ruby',
    packageName: 'codequal',
    outputDir: 'sdks/ruby',
    packageManager: 'gem',
    fileExtension: 'rb'
  }
];

async function loadOpenAPISpec(): Promise<any> {
  const specPath = path.join(__dirname, '../apps/api/openapi.json');
  const spec = await fs.readFile(specPath, 'utf-8');
  return JSON.parse(spec);
}

async function generateSDKCode(config: SDKConfig, spec: any): Promise<string> {
  const prompt = `Generate a complete ${config.language} SDK for the CodeQual API.

OpenAPI Specification:
${JSON.stringify(spec, null, 2)}

Requirements:
1. Create a main client class called CodeQualClient
2. Implement all endpoints with proper types/classes
3. Include authentication via API key header (X-API-Key)
4. Add comprehensive error handling
5. Include retry logic with exponential backoff
6. Add rate limiting awareness
7. Use idiomatic ${config.language} patterns
8. Include docstrings/comments for all public methods
9. Add usage examples in comments

The SDK should be production-ready and follow ${config.language} best practices.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are an expert ${config.language} developer creating SDKs for REST APIs.`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.2, // Lower temperature for more consistent code
    max_tokens: 4000
  });

  return response.choices[0].message.content || '';
}

async function generatePackageFiles(config: SDKConfig, sdkCode: string): Promise<void> {
  // Create directory structure
  await fs.mkdir(config.outputDir, { recursive: true });

  // Write main SDK file
  const mainFile = path.join(config.outputDir, `codequal.${config.fileExtension}`);
  await fs.writeFile(mainFile, sdkCode);

  // Generate package configuration files
  switch (config.language) {
    case 'python':
      await generatePythonPackage(config, sdkCode);
      break;
    case 'javascript':
    case 'typescript':
      await generateNpmPackage(config, sdkCode);
      break;
    case 'go':
      await generateGoModule(config, sdkCode);
      break;
    case 'java':
      await generateMavenPackage(config, sdkCode);
      break;
    case 'ruby':
      await generateGemPackage(config, sdkCode);
      break;
  }
}

async function generatePythonPackage(config: SDKConfig, sdkCode: string): Promise<void> {
  const setupPy = `from setuptools import setup, find_packages

setup(
    name="${config.packageName}",
    version="1.0.0",
    author="CodeQual",
    author_email="support@codequal.com",
    description="Official Python SDK for CodeQual API",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/codequal/python-sdk",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
    install_requires=[
        "requests>=2.28.0",
        "typing-extensions>=4.0.0",
    ],
)`;

  await fs.writeFile(path.join(config.outputDir, 'setup.py'), setupPy);
  
  const readme = `# CodeQual Python SDK

Official Python SDK for the CodeQual API.

## Installation

\`\`\`bash
pip install codequal
\`\`\`

## Usage

\`\`\`python
from codequal import CodeQualClient

client = CodeQualClient(api_key="your-api-key")

# Analyze a pull request
result = client.analyze_pr(
    repository_url="https://github.com/user/repo",
    pr_number=123
)

print(result.findings)
\`\`\`
`;

  await fs.writeFile(path.join(config.outputDir, 'README.md'), readme);
}

async function generateNpmPackage(config: SDKConfig, sdkCode: string): Promise<void> {
  const packageJson = {
    name: config.packageName,
    version: "1.0.0",
    description: "Official JavaScript/TypeScript SDK for CodeQual API",
    main: `codequal.${config.fileExtension}`,
    types: config.language === 'typescript' ? "codequal.d.ts" : undefined,
    scripts: {
      test: "jest",
      build: config.language === 'typescript' ? "tsc" : undefined
    },
    keywords: ["codequal", "code-analysis", "api", "sdk"],
    author: "CodeQual",
    license: "MIT",
    dependencies: {
      "axios": "^1.5.0"
    },
    devDependencies: config.language === 'typescript' ? {
      "@types/node": "^20.0.0",
      "typescript": "^5.0.0"
    } : {}
  };

  await fs.writeFile(
    path.join(config.outputDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

async function validateSDK(config: SDKConfig): Promise<boolean> {
  console.log(`Validating ${config.language} SDK...`);
  
  try {
    switch (config.language) {
      case 'python':
        await execAsync(`cd ${config.outputDir} && python -m py_compile codequal.py`);
        break;
      case 'typescript':
        await execAsync(`cd ${config.outputDir} && npx tsc --noEmit codequal.ts`);
        break;
      case 'go':
        await execAsync(`cd ${config.outputDir} && go build codequal.go`);
        break;
      // Add more validation as needed
    }
    
    console.log(`✅ ${config.language} SDK validation passed`);
    return true;
  } catch (error) {
    console.error(`❌ ${config.language} SDK validation failed:`, error);
    return false;
  }
}

async function generateAllSDKs(): Promise<void> {
  console.log('🚀 Starting SDK generation...');
  
  // Load OpenAPI spec
  const spec = await loadOpenAPISpec();
  
  // Generate SDKs for each language
  for (const config of SDK_CONFIGS) {
    console.log(`\n📦 Generating ${config.language} SDK...`);
    
    try {
      // Generate SDK code
      const sdkCode = await generateSDKCode(config, spec);
      
      // Create package files
      await generatePackageFiles(config, sdkCode);
      
      // Validate generated SDK
      await validateSDK(config);
      
      console.log(`✅ ${config.language} SDK generated successfully`);
    } catch (error) {
      console.error(`❌ Failed to generate ${config.language} SDK:`, error);
    }
  }
  
  console.log('\n🎉 SDK generation complete!');
}

// Helper functions for other package managers
async function generateGoModule(config: SDKConfig, sdkCode: string): Promise<void> {
  const goMod = `module ${config.packageName}

go 1.20

require (
    github.com/go-resty/resty/v2 v2.7.0
)`;

  await fs.writeFile(path.join(config.outputDir, 'go.mod'), goMod);
}

async function generateMavenPackage(config: SDKConfig, sdkCode: string): Promise<void> {
  // Maven pom.xml generation
  const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.codequal</groupId>
    <artifactId>codequal-sdk</artifactId>
    <version>1.0.0</version>
    
    <dependencies>
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>okhttp</artifactId>
            <version>4.10.0</version>
        </dependency>
    </dependencies>
</project>`;

  await fs.writeFile(path.join(config.outputDir, 'pom.xml'), pomXml);
}

async function generateGemPackage(config: SDKConfig, sdkCode: string): Promise<void> {
  const gemspec = `Gem::Specification.new do |spec|
  spec.name          = "${config.packageName}"
  spec.version       = "1.0.0"
  spec.authors       = ["CodeQual"]
  spec.email         = ["support@codequal.com"]
  spec.summary       = "Official Ruby SDK for CodeQual API"
  spec.homepage      = "https://github.com/codequal/ruby-sdk"
  spec.license       = "MIT"
  
  spec.files         = ["lib/codequal.rb"]
  spec.require_paths = ["lib"]
  
  spec.add_dependency "faraday", "~> 2.0"
end`;

  await fs.writeFile(path.join(config.outputDir, 'codequal.gemspec'), gemspec);
}

// Run if called directly
if (require.main === module) {
  generateAllSDKs().catch(console.error);
}

export { generateAllSDKs, generateSDKCode };
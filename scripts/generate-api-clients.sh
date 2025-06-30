#!/bin/bash

echo "🚀 Generating API client SDKs from OpenAPI specification..."

# Check if openapi-generator is installed
if ! command -v openapi-generator &> /dev/null; then
  echo "❌ openapi-generator-cli not found!"
  echo "📦 Installing via npm..."
  npm install -g @openapitools/openapi-generator-cli
fi

# Output directory for generated clients
OUTPUT_DIR="packages/api-clients"
SPEC_FILE="apps/api/openapi.yaml"

# Create output directory
mkdir -p $OUTPUT_DIR

# Generate TypeScript/JavaScript SDK
echo "📦 Generating TypeScript SDK..."
openapi-generator generate \
  -i $SPEC_FILE \
  -g typescript-axios \
  -o $OUTPUT_DIR/typescript \
  --additional-properties=npmName=@codequal/api-client,npmVersion=1.0.0,supportsES6=true,withInterfaces=true

# Generate Python SDK
echo "🐍 Generating Python SDK..."
openapi-generator generate \
  -i $SPEC_FILE \
  -g python \
  -o $OUTPUT_DIR/python \
  --additional-properties=packageName=codequal_api,projectName=codequal-api-client

# Generate Go SDK
echo "🐹 Generating Go SDK..."
openapi-generator generate \
  -i $SPEC_FILE \
  -g go \
  -o $OUTPUT_DIR/go \
  --additional-properties=packageName=codequal

# Generate Ruby SDK
echo "💎 Generating Ruby SDK..."
openapi-generator generate \
  -i $SPEC_FILE \
  -g ruby \
  -o $OUTPUT_DIR/ruby \
  --additional-properties=gemName=codequal,moduleName=CodeQual

# Generate Java SDK
echo "☕ Generating Java SDK..."
openapi-generator generate \
  -i $SPEC_FILE \
  -g java \
  -o $OUTPUT_DIR/java \
  --additional-properties=groupId=com.codequal,artifactId=codequal-api-client,apiPackage=com.codequal.api,modelPackage=com.codequal.model

# Create README for each SDK
echo "📝 Creating SDK documentation..."

# TypeScript README
cat > $OUTPUT_DIR/typescript/README.md << 'EOF'
# CodeQual TypeScript API Client

Official TypeScript client for the CodeQual API.

## Installation

```bash
npm install @codequal/api-client
```

## Usage

```typescript
import { Configuration, AnalysisApi } from '@codequal/api-client';

const config = new Configuration({
  apiKey: 'ck_your_api_key_here',
  basePath: 'https://api.codequal.com/v1'
});

const api = new AnalysisApi(config);

// Analyze a pull request
const analysis = await api.analyzePR({
  repositoryUrl: 'https://github.com/owner/repo',
  prNumber: 123,
  analysisMode: 'comprehensive'
});

// Check progress
const progress = await api.getAnalysisProgress(analysis.data.analysisId);
```

## Features

- Full TypeScript support
- Promise-based API
- Automatic retry logic
- Request/response interceptors

## Documentation

See https://docs.codequal.com/api for full API documentation.
EOF

# Python README
cat > $OUTPUT_DIR/python/README.md << 'EOF'
# CodeQual Python API Client

Official Python client for the CodeQual API.

## Installation

```bash
pip install codequal-api
```

## Usage

```python
import codequal_api
from codequal_api.api import analysis_api
from codequal_api.model.pr_analysis_request import PRAnalysisRequest

# Configure API key
configuration = codequal_api.Configuration(
    host = "https://api.codequal.com/v1",
    api_key = {'ApiKeyAuth': 'ck_your_api_key_here'}
)

# Create API instance
with codequal_api.ApiClient(configuration) as api_client:
    api = analysis_api.AnalysisApi(api_client)
    
    # Analyze PR
    request = PRAnalysisRequest(
        repository_url="https://github.com/owner/repo",
        pr_number=123,
        analysis_mode="comprehensive"
    )
    
    analysis = api.analyze_pr(request)
    print(f"Analysis ID: {analysis.analysis_id}")
    
    # Check progress
    progress = api.get_analysis_progress(analysis.analysis_id)
    print(f"Status: {progress.status}")
```

## Documentation

See https://docs.codequal.com/api for full API documentation.
EOF

echo "✅ API clients generated successfully!"
echo ""
echo "📁 Generated SDKs in: $OUTPUT_DIR"
echo "   - TypeScript: $OUTPUT_DIR/typescript"
echo "   - Python: $OUTPUT_DIR/python"
echo "   - Go: $OUTPUT_DIR/go"
echo "   - Ruby: $OUTPUT_DIR/ruby"
echo "   - Java: $OUTPUT_DIR/java"
echo ""
echo "💡 To publish SDKs:"
echo "   - TypeScript: cd $OUTPUT_DIR/typescript && npm publish"
echo "   - Python: cd $OUTPUT_DIR/python && python setup.py sdist upload"
echo "   - Others: See respective package manager docs"
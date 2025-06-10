#!/bin/bash
# DeepWiki CLI Explorer
# This script examines the DeepWiki pod to understand available commands and parameters

# Default parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
OUTPUT_FILE="./deepwiki_cli_exploration.txt"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"
echo "Results will be saved to: $OUTPUT_FILE"

# Start recording results
echo "# DeepWiki CLI Exploration" > "$OUTPUT_FILE"
echo "Date: $(date)" >> "$OUTPUT_FILE"
echo "Pod: $ACTIVE_POD" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check the directory structure
echo "## Directory Structure" >> "$OUTPUT_FILE"
echo "### /app directory" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- ls -la /app 2>/dev/null >> "$OUTPUT_FILE" || echo "Cannot access /app directory" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Find Python files
echo "## Python Files" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "*.py" 2>/dev/null >> "$OUTPUT_FILE" || echo "No Python files found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Look for CLI files
echo "## Potential CLI Files" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "*cli*.py" 2>/dev/null >> "$OUTPUT_FILE" || echo "No CLI files found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check environment variables
echo "## Environment Variables" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- env 2>/dev/null | grep -v "SECRET\|KEY\|PASS\|TOKEN" >> "$OUTPUT_FILE" || echo "Cannot access environment variables" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check if there's a help command
echo "## DeepWiki Help Commands" >> "$OUTPUT_FILE"
echo "### Python -m deepwiki --help" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- python -m deepwiki --help 2>/dev/null >> "$OUTPUT_FILE" || echo "Command not found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### Python help(deepwiki)" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- python -c "import deepwiki; help(deepwiki)" 2>/dev/null >> "$OUTPUT_FILE" || echo "Module not found or cannot import" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check API documentation files
echo "## API Documentation" >> "$OUTPUT_FILE"
echo "### API Files" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "*api*.py" 2>/dev/null >> "$OUTPUT_FILE" || echo "No API files found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check if there are any README files
echo "## README Files" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "README*" 2>/dev/null >> "$OUTPUT_FILE" || echo "No README files found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Try to see if we can find API endpoints
echo "## API Endpoints Investigation" >> "$OUTPUT_FILE"
echo "### grep for route or endpoint" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- grep -r "route\|endpoint\|@app\.\|@blueprint" /app --include="*.py" 2>/dev/null | head -30 >> "$OUTPUT_FILE" || echo "No route/endpoint patterns found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### grep for chat completions" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- grep -r "chat.*completion" /app --include="*.py" 2>/dev/null >> "$OUTPUT_FILE" || echo "No chat completion patterns found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### openrouter client file" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "*openrouter*.py" 2>/dev/null >> "$OUTPUT_FILE" || echo "No OpenRouter files found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Attempt to examine the openrouter client
OPENROUTER_CLIENT=$(kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "*openrouter*.py" 2>/dev/null | head -1)
if [ ! -z "$OPENROUTER_CLIENT" ]; then
  echo "### OpenRouter Client Code" >> "$OUTPUT_FILE"
  echo '```python' >> "$OUTPUT_FILE"
  kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- cat "$OPENROUTER_CLIENT" 2>/dev/null >> "$OUTPUT_FILE" || echo "Cannot read file" >> "$OUTPUT_FILE"
  echo '```' >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
fi

echo "Exploration complete! Results saved to $OUTPUT_FILE"
echo "Review the file to understand DeepWiki's capabilities and available parameters."

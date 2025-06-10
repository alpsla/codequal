#!/bin/bash

# Simple Multi-Repository Test
# This script tests the performance of available models on a small set of repositories

echo "DeepWiki Simple Multi-Repository Test"
echo "===================================="
echo ""

# Configuration
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/simple-test-results"
API_URL="http://localhost:8001"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Handle alternative API key variable names
if [ -z "$GOOGLE_API_KEY" ] && [ -n "$GEMINI_API_KEY" ]; then
  echo "Using GEMINI_API_KEY for Google API"
  GOOGLE_API_KEY="$GEMINI_API_KEY"
fi

# Define a smaller set of test repositories
REPOSITORIES=(
  "pallets/flask,python,medium"
  "expressjs/express,javascript,medium"
  "microsoft/TypeScript,typescript,large"
)

# Check available API keys
echo "Checking available API keys..."
AVAILABLE_PROVIDERS=()

# Check for keys in environment
if [ -n "$OPENAI_API_KEY" ]; then
  AVAILABLE_PROVIDERS+=("openai")
  echo "✓ Found OpenAI API key"
fi

if [ -n "$GOOGLE_API_KEY" ]; then
  AVAILABLE_PROVIDERS+=("google")
  echo "✓ Found Google API key"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
  AVAILABLE_PROVIDERS+=("anthropic")
  echo "✓ Found Anthropic API key"
fi

if [ -n "$OPENROUTER_API_KEY" ]; then
  AVAILABLE_PROVIDERS+=("openrouter")
  echo "✓ Found OpenRouter API key"
fi

# Prompt for keys if not in environment
if [[ ! " ${AVAILABLE_PROVIDERS[*]} " =~ " openai " ]]; then
  echo -n "Enter OpenAI API key (or press Enter to skip): "
  read -s OPENAI_API_KEY
  echo ""
  if [ -n "$OPENAI_API_KEY" ]; then
    AVAILABLE_PROVIDERS+=("openai")
    echo "✓ Added OpenAI API key"
  fi
fi

if [[ ! " ${AVAILABLE_PROVIDERS[*]} " =~ " google " ]]; then
  echo -n "Enter Google API key (or press Enter to skip): "
  read -s GOOGLE_API_KEY
  echo ""
  if [ -n "$GOOGLE_API_KEY" ]; then
    AVAILABLE_PROVIDERS+=("google")
    echo "✓ Added Google API key"
  fi
fi

if [[ ! " ${AVAILABLE_PROVIDERS[*]} " =~ " anthropic " ]]; then
  echo -n "Enter Anthropic API key (or press Enter to skip): "
  read -s ANTHROPIC_API_KEY
  echo ""
  if [ -n "$ANTHROPIC_API_KEY" ]; then
    AVAILABLE_PROVIDERS+=("anthropic")
    echo "✓ Added Anthropic API key"
  fi
fi

if [[ ! " ${AVAILABLE_PROVIDERS[*]} " =~ " openrouter " ]]; then
  echo -n "Enter OpenRouter API key (or press Enter to skip): "
  read -s OPENROUTER_API_KEY
  echo ""
  if [ -n "$OPENROUTER_API_KEY" ]; then
    AVAILABLE_PROVIDERS+=("openrouter")
    echo "✓ Added OpenRouter API key"
  fi
fi

if [ ${#AVAILABLE_PROVIDERS[@]} -eq 0 ]; then
  echo "Error: No API keys provided. At least one API key is required."
  exit 1
fi

echo "Available providers: ${AVAILABLE_PROVIDERS[*]}"
echo ""

# Define test models based on available providers
MODELS=()

if [[ " ${AVAILABLE_PROVIDERS[*]} " =~ " openai " ]]; then
  MODELS+=("openai,gpt-4o")
  echo "✓ Will test OpenAI GPT-4o"
fi

if [[ " ${AVAILABLE_PROVIDERS[*]} " =~ " google " ]]; then
  MODELS+=("google,gemini-2.5-pro-preview-05-06")
  echo "✓ Will test Google Gemini 2.5 Pro"
fi

if [[ " ${AVAILABLE_PROVIDERS[*]} " =~ " anthropic " ]]; then
  MODELS+=("anthropic,claude-3-7-sonnet")
  echo "✓ Will test Anthropic Claude 3.7 Sonnet"
fi

if [[ " ${AVAILABLE_PROVIDERS[*]} " =~ " openrouter " ]]; then
  MODELS+=("openrouter,anthropic/claude-3.7-sonnet")
  echo "✓ Will test Claude 3.7 Sonnet via OpenRouter"
fi

# Define test query
QUERY="What is the overall architecture of this repository? Please explain the main components, their relationships, and how they work together."

# Function to run a test and record results
run_repository_test() {
  local repo=$1
  local language=$2
  local size=$3
  local provider=$4
  local model=$5
  
  # Extract owner and name from repo
  IFS='/' read -r owner name <<< "$repo"
  
  echo ""
  echo "Testing $provider/$model on $repo ($language, $size)"
  
  local output_file="$OUTPUT_DIR/${provider}-${model//\//-}-${owner}-${name}-$TIMESTAMP.json"
  local repo_url="https://github.com/$repo"
  
  echo "Repository URL: $repo_url"
  echo "Output file: $output_file"
  
  START_TIME=$(date +%s)
  
  # Create a temporary file for the request body
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOL
{
  "repo_url": "$repo_url",
  "messages": [
    {
      "role": "user",
      "content": "$QUERY"
    }
  ],
  "provider": "$provider",
  "model": "$model"
}
EOL
  
  # Get the appropriate API key
  API_KEY=""
  if [ "$provider" == "openai" ]; then
    API_KEY="$OPENAI_API_KEY"
  elif [ "$provider" == "google" ]; then
    API_KEY="$GOOGLE_API_KEY"
  elif [ "$provider" == "anthropic" ]; then
    API_KEY="$ANTHROPIC_API_KEY"
  elif [ "$provider" == "openrouter" ]; then
    API_KEY="$OPENROUTER_API_KEY"
  fi
  
  # Use curl to make the API call
  curl -s -X POST "$API_URL/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d @"$TEMP_FILE" > "$output_file"
  
  # Remove temporary file
  rm "$TEMP_FILE"
  
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  SIZE=$(wc -c < "$output_file" | xargs)
  
  echo "Completed in $DURATION seconds"
  echo "Response size: $SIZE bytes"
  
  # Check for potential errors in the response
  if [ "$SIZE" -lt 200 ]; then
    echo "WARNING: Response size is small, possible error. First 100 characters:"
    head -c 100 "$output_file"
    echo ""
  else
    # Show the first few lines of the response
    echo "Response preview:"
    head -n 5 "$output_file"
    echo "..."
  fi
  
  # Add to summary file
  echo "$provider,$model,$size,$language,$repo,$DURATION,$SIZE,$output_file" >> "$OUTPUT_DIR/summary-$TIMESTAMP.csv"
}

# Create summary CSV header
echo "provider,model,size,language,repository,duration_seconds,size_bytes,output_file" > "$OUTPUT_DIR/summary-$TIMESTAMP.csv"

# Run tests for each repository and model combination
echo "Starting tests for ${#REPOSITORIES[@]} repositories with ${#MODELS[@]} models..."
echo "This will run a total of $((${#REPOSITORIES[@]} * ${#MODELS[@]})) tests."
echo ""

TOTAL_TESTS=$((${#REPOSITORIES[@]} * ${#MODELS[@]}))
COMPLETED=0

for repo_info in "${REPOSITORIES[@]}"; do
  IFS=',' read -r repo language size <<< "$repo_info"
  
  for model_info in "${MODELS[@]}"; do
    IFS=',' read -r provider model <<< "$model_info"
    
    COMPLETED=$((COMPLETED + 1))
    echo "Test $COMPLETED of $TOTAL_TESTS ($(echo "scale=1; ($COMPLETED/$TOTAL_TESTS)*100" | bc)%)"
    
    run_repository_test "$repo" "$language" "$size" "$provider" "$model"
  done
done

echo ""
echo "All tests completed!"
echo "Summary CSV: $OUTPUT_DIR/summary-$TIMESTAMP.csv"
echo ""
echo "Results:"
echo "========"

# Display basic summary
echo "Provider,Model,Avg Time (s),Avg Size (bytes)"
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  # Calculate average time and size
  AVG_TIME=$(awk -F, -v p="$provider" -v m="$model" '
    BEGIN {total=0; count=0}
    NR>1 && $1 == p && $2 == m {total+=$6; count++}
    END {if(count>0) printf "%.1f", total/count; else print "N/A"}
  ' "$OUTPUT_DIR/summary-$TIMESTAMP.csv")
  
  AVG_SIZE=$(awk -F, -v p="$provider" -v m="$model" '
    BEGIN {total=0; count=0}
    NR>1 && $1 == p && $2 == m {total+=$7; count++}
    END {if(count>0) printf "%.0f", total/count; else print "N/A"}
  ' "$OUTPUT_DIR/summary-$TIMESTAMP.csv")
  
  echo "$provider,$model,$AVG_TIME,$AVG_SIZE"
done

# Display language-specific performance
echo ""
echo "Language-specific performance:"
echo "=============================="

for language in "python" "javascript" "typescript"; do
  echo ""
  echo "Language: $language"
  echo "Provider,Model,Avg Time (s),Avg Size (bytes)"
  
  for model_info in "${MODELS[@]}"; do
    IFS=',' read -r provider model <<< "$model_info"
    
    # Calculate average time and size for this language
    AVG_TIME=$(awk -F, -v p="$provider" -v m="$model" -v lang="$language" '
      BEGIN {total=0; count=0}
      NR>1 && $1 == p && $2 == m && $4 == lang {total+=$6; count++}
      END {if(count>0) printf "%.1f", total/count; else print "N/A"}
    ' "$OUTPUT_DIR/summary-$TIMESTAMP.csv")
    
    AVG_SIZE=$(awk -F, -v p="$provider" -v m="$model" -v lang="$language" '
      BEGIN {total=0; count=0}
      NR>1 && $1 == p && $2 == m && $4 == lang {total+=$7; count++}
      END {if(count>0) printf "%.0f", total/count; else print "N/A"}
    ' "$OUTPUT_DIR/summary-$TIMESTAMP.csv")
    
    echo "$provider,$model,$AVG_TIME,$AVG_SIZE"
  done
done

echo ""
echo "Testing complete! You can now proceed with:"
echo "1. Review the results in $OUTPUT_DIR"
echo "2. Update the DeepWikiClient.final.ts with optimal configurations"
echo "3. Proceed with integration with the multi-agent system"

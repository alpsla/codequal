# DeepWiki Repository Analysis Testing

This directory contains scripts for testing the DeepWiki integration with OpenRouter using various AI models across different repository sizes.

## Usage

1. Ensure that the DeepWiki pod is running in your Kubernetes cluster:

```bash
kubectl get pods -n codequal-dev | grep deepwiki-fixed
```

2. Run the analysis script:

```bash
# Make the script executable if needed
chmod +x run_deepwiki_analysis.sh

# Run the analysis
./run_deepwiki_analysis.sh
```

3. The script will:
   - Test 3 small repositories, 3 medium repositories, and 2 large repositories
   - Use the openai/gpt-4.1 model for all analyses
   - Save results in the `/Users/alpinro/Code Prjects/codequal/packages/testing/results/deepwiki_analysis` directory
   - Generate a summary markdown file with metadata and analysis details

## Customization

You can customize the script by modifying the following variables at the top of the file:

- `MODEL`: The AI model to use (default: openai/gpt-4.1)
- `PROMPT_TEMPLATE`: The prompt template to use (default: standard)
- `NAMESPACE`: Kubernetes namespace for DeepWiki (default: codequal-dev)
- `POD_SELECTOR`: Selector for DeepWiki pod (default: deepwiki-fixed)
- `PORT`: Port for the DeepWiki API (default: 8001)

## Results

Analysis results will be saved in timestamped directories with this format:
```
/Users/alpinro/Code Prjects/codequal/packages/testing/results/deepwiki_analysis/YYYYMMDD_HHMMSS/
```

Each directory will contain:
- JSON files with analysis results for each repository
- A markdown summary file with metadata and repository details

## Notes

- Large repositories may hit token limits, resulting in partial or incomplete analysis
- Each repository analysis creates a new port-forwarding session that is terminated after completion
- The script includes a 5-second delay between repository analyses to avoid rate limiting

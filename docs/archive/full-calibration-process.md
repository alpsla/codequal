# Full Model Calibration Process

> **DEPRECATED:** This document has been consolidated into the [Model Management Procedures](./model-management-procedures.md) document. Please refer to that document for the most up-to-date information on model calibration processes.

This document provides a detailed guide for conducting a comprehensive model calibration across all supported repository languages and sizes. This process optimizes the model selection for all possible repository contexts.

## When to Run Full Calibration

Full calibration should be performed:

1. After adding support for new AI models (e.g., DeepSeek)
2. Quarterly to ensure configurations remain optimal as models evolve
3. When significant model version updates are released by providers
4. When adding support for new programming languages

## Prerequisites

Before starting full calibration, ensure the following components are ready:

- DeepWiki server is running and accessible
- API keys for all model providers are configured
- Test repositories for each language and size category are available
- Enough token budget is allocated for comprehensive testing
- Supabase database is configured and accessible (for storing results)

Ensure you have the necessary environment variables set in your `.env` file:

```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DeepWiki
DEEPWIKI_API_KEY=your-deepwiki-api-key
DEEPWIKI_API_URL=https://api.deepwiki.io

# Model API Keys
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

## Calibration Checklist

### 1. Preparation Phase

- [ ] **Update Test Repository List**
  - Review `TEST_REPOSITORIES` in `run-comprehensive-calibration.js`
  - Ensure each language has at least one repository per size category
  - Verify repository access and availability

- [ ] **Update Model List**
  - Review `MODELS_TO_TEST` in `run-comprehensive-calibration.js`
  - Add any new models you want to evaluate
  - Remove deprecated models

- [ ] **Configure Test Parameters**
  - Adjust `TEST_PROMPTS` if necessary for thorough evaluation
  - Modify `SCORING_WEIGHTS` to prioritize response quality or speed
  - Set appropriate timeout values

- [ ] **Check API Environment**
  - Verify all API keys are set in environment variables
  - Ensure API rate limits are sufficient for testing volume
  - Consider applying for quota increases if needed

- [ ] **Prepare Output Storage**
  - Ensure calibration-results directory exists and is writable
  - Clear previous results if doing a fresh calibration
  - Configure database connection if storing results

### 2. Execution Phase

- [ ] **Run Initial Test**
  - Run a limited test first to verify setup:
    ```bash
    # Modify script to test just one repository and model
    node packages/core/scripts/run-comprehensive-calibration.js
    ```
  - Check output format and data quality

- [ ] **Run Full Calibration**
  ```bash
  # Run without database update first
  node packages/core/scripts/run-comprehensive-calibration.js
  ```

- [ ] **Monitor Progress**
  - Check log files regularly for errors
  - Monitor token usage across providers
  - Expect this to take several hours depending on the number of repositories and models

- [ ] **Handle Failures**
  - If specific model tests fail, note them but continue
  - If systematic failures occur, address them and restart
  - The script saves incremental results so you can resume

### 3. Analysis Phase

- [ ] **Review Results**
  - Examine `calibration-results/summary.md` for overview
  - Check `calibration-results/calibration-report.json` for detailed metrics
  - Look for patterns in model performance by language and size

- [ ] **Validate Configuration**
  - Review `calibration-results/repository-model-config.ts`
  - Verify recommended models match performance data
  - Make manual adjustments if necessary

- [ ] **Cross-reference with Previous Calibration**
  - Compare with previous calibration results
  - Note significant changes in model performance
  - Investigate unexpected performance regressions

### 4. Implementation Phase

You have two options for running calibration:

#### Option A: Full Reset and Calibration (Recommended for major updates)

- [ ] **Reset Previous Calibration Data**
  ```bash
  # Reset existing calibration data to start fresh
  ./reset-calibration.sh
  ```

- [ ] **Run Full Calibration Process**
  ```bash
  # This will run calibration and update the database automatically
  ./run-calibration.sh
  ```

#### Option B: Continued Calibration (For adding new models)

- [ ] **Continue Existing Calibration**
  ```bash
  # This will only test missing models and combinations
  ./continue-calibration.sh
  ```

This approach is more efficient as it:
- Only tests models that haven't been tested before
- Preserves existing calibration data
- Updates configurations with the new results
- Is ideal when adding new model versions or providers

- [ ] **Rebuild the Project**
  ```bash
  npm run build
  ```

- [ ] **Verify Changes**
  - Run test analyses with different repository types
  - Confirm the correct models are being selected
  - Verify performance metrics match expectations

- [ ] **Document Updates**
  - Update the calibration status document
  - Note any significant findings or changes
  - Document any manual adjustments made

### 5. Monitoring Phase

- [ ] **Monitor Production Performance**
  - Watch analysis performance for the first week after updating
  - Check error rates and response times
  - Compare token usage before and after calibration

- [ ] **Collect User Feedback**
  - Ask for feedback on analysis quality
  - Note any reported issues with specific languages
  - Use feedback to inform future calibrations

## Language-Specific Considerations

Different languages may require special attention during calibration:

### TypeScript/JavaScript
- Test with both frontend and backend frameworks
- Include both small libraries and large applications
- Consider testing with different bundlers and build tools

### Python
- Include both data science and web application repositories
- Test with different framework styles (Django, Flask, FastAPI)
- Consider testing notebook-heavy repositories separately

### Java/C#
- Test with both legacy and modern codebases
- Include repositories with heavy framework usage
- Consider testing with different build systems

### Rust/Go
- Focus on performance and memory safety aspects
- Include both application and library repositories
- Test with different concurrency patterns

## Troubleshooting

### Common Issues

#### API Rate Limits
- If hitting rate limits, increase delay between tests
- Consider using multiple API keys for the same provider
- Split testing across multiple runs

#### Memory Issues
- If the process uses too much memory, reduce parallel processing
- Save results more frequently
- Split calibration into smaller batches

#### Repository Access
- If repository access fails, check git credentials
- Use public repositories where possible
- Consider caching repositories locally

#### Scoring Anomalies
- If scores seem incorrect, review raw metrics
- Adjust scoring weights as needed
- Consider adding more test prompts for comprehensiveness

## Next Steps After Calibration

1. **Schedule Targeted Calibrations**: Plan for targeted calibrations for any languages with unusual results
2. **Update Documentation**: Document the new optimal model configuration
3. **Monitor Performance**: Set up ongoing monitoring to verify calibration benefits
4. **Plan Next Calibration**: Schedule the next full calibration (typically quarterly)

---

Last Updated: May 15, 2025

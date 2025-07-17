# E2E Test Guide

## Test Overview

The comprehensive E2E test (`test-e2e-complete.html`) validates the entire CodeQual flow:

### 1. **API Authentication** ✅
- Tests API key authentication via X-API-Key header
- Validates /api/health endpoint

### 2. **PR Analysis Flow** ✅
- Starts analysis via POST /api/analysis/start
- Tests with real repository (default: facebook/react PR #25000)
- Validates analysis modes: quick, comprehensive, deep

### 3. **Progress Polling** ✅
- Polls /api/analysis/progress/{analysisId}
- Handles async analysis with 5-second intervals
- Timeout after 5 minutes

### 4. **Results Retrieval** ✅
- Fetches results via /api/analysis/results/{analysisId}
- Displays metrics:
  - Total findings
  - Severity breakdown
  - Processing time
  - Agents used
  - Confidence score

### 5. **HTML Report Generation** ✅
- Generates report via /api/analysis-reports/{reportId}/html
- Tests API key authentication for report access
- Loads report in iframe for preview

### 6. **UI Validation** ✅
Tests report contains:
- Title (h1 element)
- Approval status (BLOCKED/CONDITIONALLY APPROVED/APPROVED)
- PR issues section
- Repository issues section
- Statistics
- Issue cards with details
- Severity badges

## How to Run

1. **Start the API server**:
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Open the test page**:
   - Open `apps/api/test-e2e-complete.html` in your browser
   - Or serve it locally: `npx http-server apps/api`

3. **Configure the test**:
   - API URL: `http://localhost:4000`
   - API Key: Your valid API key
   - Repository: Any public GitHub repo
   - PR Number: Valid PR number
   - Analysis Mode: quick/comprehensive/deep

4. **Run the test**:
   - Click "Run Complete E2E Test"
   - Watch the progress through all steps
   - Review the validation results

## Expected Results

### Successful Test:
- All 6 test steps show ✅
- HTML report loads with proper styling
- All UI elements are present
- Approval decision is calculated correctly
- Both PR and repository issues are displayed

### What's Being Validated:

1. **Authentication**: API key works correctly
2. **Analysis**: 
   - Models pulled from Vector DB
   - Real agent analysis (not mock data)
   - Proper error handling
3. **Report Generation**:
   - Enhanced template with two sections
   - Approval logic based on severity
   - Proper data formatting
4. **UI Elements**:
   - All required sections present
   - Interactive elements work
   - Responsive design

## Key Integration Points

1. **Vector DB**: Models are pulled dynamically
2. **OpenRouter**: Agents use configured models
3. **Supabase**: Real data from vector storage
4. **Multi-Agent**: All agents contribute to analysis
5. **Report Template**: Enhanced template with approval logic

## Troubleshooting

### If authentication fails:
- Check API key is valid
- Verify server is running on correct port

### If analysis returns 0 findings:
- Check Vector DB connection
- Verify model configurations exist
- Check OpenRouter API key

### If report doesn't load:
- Check browser console for errors
- Verify report ID is valid
- Check CORS settings

## Test Data

Default test uses:
- Repository: https://github.com/facebook/react
- PR: #25000 (or any valid PR)
- Mode: Comprehensive

This provides a good test case with:
- Large, complex codebase
- Multiple file types
- Various issue types
- Good performance baseline
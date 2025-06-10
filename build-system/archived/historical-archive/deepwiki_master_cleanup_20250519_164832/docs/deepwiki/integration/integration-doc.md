# DeepWiki Integration Documentation

## Overview
This document describes DeepWiki's capabilities, interface, and integration requirements for the CodeQual project.

## Current Status
We are encountering a 500 Internal Server Error when trying to analyze repositories with DeepWiki. The root cause has been identified: **"database or disk is full"**. This is causing the API to fail when attempting to analyze repositories.

## Troubleshooting Progress

### Deployed Components
- DeepWiki is deployed in Kubernetes (namespace: codequal-dev)
- The application consists of two main components:
  - Frontend (Next.js) running on port 3000
  - API (FastAPI) running on port 8001
- Services have been created to expose these components

### Environment Configuration
- DeepWiki is configured with:
  - GitHub Token: `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`
  - OpenAI API Key: `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`
  - Google API Key: `AIzaSyAx5Mj6YtrgnivkxUGqzAi1h_QxTX0HNWQ`

### URL Patterns
The URL format we've observed is:
```
/owner/repo?type=github&repo_url=https://github.com/owner/repo&provider=google&model=gemini-2.5-pro-preview-05-06...
```

### Current Issues
1. **Disk Space Issue**: The DeepWiki pod is running out of disk space, causing the 500 error
2. Persistent Volume Claim needs to be resized to accommodate repository analysis data
3. No cleanup routine for old analysis data

## Solution Plan

### Short-term Fix (1-2 days)

1. **Increase PVC Size**:
   - Create a larger PVC (we have prepared the YAML)
   - Update the deployment to use the new PVC
   - This will provide immediate relief for the disk space issue

2. **Clean Up Existing Data**:
   - Execute cleanup script to remove temporary or old files
   - Check for large files that can be safely removed
   - This may provide enough space for immediate testing

3. **Update GitHub Token**:
   - Create a new GitHub token with appropriate permissions
   - Update the Kubernetes secret with the new token
   - This ensures we don't have authentication issues once space is available

### Medium-term Solution (3-7 days)

1. **Implement Data Lifecycle Management**:
   - Create a scheduled job to clean up old analysis data
   - Implement retention policies based on access patterns
   - Add monitoring for disk usage to prevent future issues

2. **Optimize Storage Usage**:
   - Configure DeepWiki to use more efficient storage patterns
   - Implement compression for stored data where applicable
   - Consider external storage options for large repositories

3. **Add Monitoring**:
   - Set up alerts for disk usage thresholds
   - Monitor DeepWiki performance metrics
   - Create dashboards for observability

### Long-term Strategy (2-4 weeks)

1. **Stateless Architecture**:
   - Redesign DeepWiki deployment to be more stateless
   - Move persistent data to managed database services
   - Implement caching at appropriate levels

2. **Scalable Storage Solution**:
   - Evaluate cloud-native storage options
   - Implement tiered storage for different types of data
   - Set up automatic scaling for storage resources

3. **Integration with CodeQual**:
   - Develop robust API client that handles errors gracefully
   - Implement retry mechanisms and circuit breakers
   - Create fallback mechanisms when DeepWiki is unavailable

## Integration Requirements

Based on our analysis, integration with CodeQual will require:

1. **Robust Resource Management**:
   - Proper sizing of persistent volumes
   - Monitoring and alerting for resource usage
   - Cleanup routines for old or unused data

2. **Error Handling**:
   - Graceful handling of service unavailability
   - Retry mechanisms for transient errors
   - Clear error messages for debugging

3. **Data Processing Pipeline**:
   - Extract and parse DeepWiki outputs
   - Transform to format suitable for agent consumption
   - Store in Supabase for caching and retrieval

4. **Multi-Agent Integration**:
   - Context providers to enhance agent prompts
   - Knowledge extraction for targeted insights
   - Comprehensive repository understanding

---

*This document will be updated as we make progress with DeepWiki integration.*

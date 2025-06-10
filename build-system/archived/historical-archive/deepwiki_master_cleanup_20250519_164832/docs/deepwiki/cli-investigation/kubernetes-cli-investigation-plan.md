# DeepWiki Kubernetes CLI/Console Investigation Plan

## Overview

This document outlines the plan for investigating the DeepWiki CLI capabilities in our Kubernetes environment. This is the highest priority task for completing the DeepWiki integration with CodeQual.

## Investigation Goals

1. Access and explore the DeepWiki container deployed in our DigitalOcean Kubernetes cluster
2. Document all available CLI commands and their usage
3. Test running analysis commands and understand their output format
4. Document authentication and API key configuration
5. Create test scripts for interacting with the DeepWiki API
6. Prepare for implementing the DeepWikiKubernetesService

## Required Tools

- kubectl (Kubernetes command-line tool)
- Access to DigitalOcean Kubernetes cluster
- Existing scripts in `/Users/alpinro/Code Prjects/codequal/scripts/`

## Investigation Steps

### 1. Initial Exploration

**Goal**: Access the DeepWiki container and understand its environment

**Actions**:
- Run the exploration script to identify the DeepWiki pod and container
  ```
  ./scripts/explore_deepwiki_k8s.sh
  ```
- Review the generated report in `deepwiki_k8s_investigation/`
- Execute an interactive shell in the container
  ```
  kubectl exec -it <pod-name> -n <namespace> -c <container-name> -- /bin/bash
  ```

**Expected Outputs**:
- Initial understanding of the DeepWiki container
- List of potential CLI commands and entry points
- Location of configuration files

### 2. CLI Command Documentation

**Goal**: Document all available DeepWiki CLI commands

**Actions**:
- Attempt to run `--help` commands in the container
  ```
  kubectl exec <pod-name> -n <namespace> -c <container-name> -- deepwiki --help
  ```
- Explore all executables identified in the previous step
- Check for documentation files in the container
- Look for Python or JavaScript entry points in common directories

**Expected Outputs**:
- Complete list of available commands
- Command syntax and parameters
- Documentation of each command's purpose and output format

### 3. API Authentication Testing

**Goal**: Understand how API keys are configured and managed

**Actions**:
- Check environment variables in the container
- Look for configuration files that might contain API keys
- Test commands with various API key configurations
- Document the environment variables required for each provider

**Expected Outputs**:
- List of required API keys
- Configuration methods (environment variables, config files, etc.)
- Authentication workflow documentation

### 4. Analysis Command Testing

**Goal**: Test running repository analysis commands

**Actions**:
- Run comprehensive analysis on a small test repository
  ```
  kubectl exec <pod-name> -n <namespace> -c <container-name> -- <identified-command> <repository-url>
  ```
- Run concise analysis on the same repository
- Test with different model providers
- Analyze the output structure and format

**Expected Outputs**:
- Documented command syntax for analyses
- Comparison of comprehensive vs. concise analysis
- Output structure documentation
- Performance metrics (runtime, resource usage, etc.)

### 5. Chat API Testing

**Goal**: Test the DeepWiki chat capabilities

**Actions**:
- Test chat queries against analyzed repositories
- Experiment with different query formats
- Try different model providers

**Expected Outputs**:
- Chat command syntax documentation
- Query parameter documentation
- Output format documentation
- Performance metrics

### 6. Output Format Analysis

**Goal**: Understand and document all output formats

**Actions**:
- Collect sample outputs from various commands
- Identify JSON structures or other formats
- Document each field and its purpose
- Determine optimal chunking strategies for vectorization

**Expected Outputs**:
- Detailed documentation of output formats
- Field mappings and data types
- Chunking strategy recommendations

### 7. Test Script Creation

**Goal**: Create scripts for automated testing

**Actions**:
- Create a script to run comprehensive analysis
- Create a script to run concise analysis
- Create a script to run chat queries
- Document all scripts and their usage

**Expected Outputs**:
- Collection of test scripts
- Documentation of script usage
- Sample outputs from each script

### 8. Error Handling Investigation

**Goal**: Understand error reporting and handling

**Actions**:
- Test commands with invalid inputs
- Observe error messages and formats
- Document common error scenarios

**Expected Outputs**:
- Error message documentation
- Recommended error handling strategies
- Common failure scenarios

### 9. Performance Testing

**Goal**: Evaluate performance and resource usage

**Actions**:
- Test with repositories of different sizes
- Measure execution times
- Monitor resource usage (CPU, memory, etc.)

**Expected Outputs**:
- Performance metrics documentation
- Resource requirement recommendations
- Sizing guidelines for different repository types

### 10. Security and Authentication Documentation

**Goal**: Document security considerations

**Actions**:
- Review how API keys are used
- Check for any credential storage
- Document secure usage patterns

**Expected Outputs**:
- Security recommendations
- API key management guidelines
- Secure deployment documentation

## Deliverables

1. **Command Reference**:
   - Complete list of all DeepWiki CLI commands
   - Parameter documentation for each command
   - Usage examples

2. **Configuration Guide**:
   - API key requirements
   - Environment variable documentation
   - Configuration file documentation

3. **Output Format Documentation**:
   - Structure of analysis outputs
   - JSON schemas or other format definitions
   - Field descriptions and data types

4. **Test Scripts**:
   - Collection of shell scripts for testing
   - Usage documentation
   - Sample outputs

5. **Implementation Recommendations**:
   - Updates to the `DeepWikiKubernetesService` class
   - Error handling strategies
   - Performance optimization recommendations

## Timeline

- **Day 1**: Initial exploration and command discovery (Steps 1-2)
- **Day 2**: Authentication and analysis command testing (Steps 3-4)
- **Day 3**: Chat API and output format analysis (Steps 5-6)
- **Day 4**: Test script creation and error handling (Steps 7-8)
- **Day 5**: Performance testing and documentation finalization (Steps 9-10)

## Resources

- [DeepWiki GitHub Repository](https://github.com/AsyncFuncAI/deepwiki-open)
- [Kubernetes Documentation](https://kubernetes.io/docs/reference/kubectl/overview/)
- [Existing exploration script](/Users/alpinro/Code Prjects/codequal/scripts/explore_deepwiki_k8s.sh)
- [DeepWiki service skeleton](/Users/alpinro/Code Prjects/codequal/packages/core/src/services/deepwiki-kubernetes.service.ts)

## Success Criteria

The investigation will be considered successful when:

1. All DeepWiki CLI commands are documented
2. Authentication mechanisms are understood
3. Test scripts are created and functioning
4. Output formats are documented
5. Recommendations for implementation are provided

## Next Steps After Investigation

After completing this investigation, the focus will shift to:

1. Updating the `DeepWikiKubernetesService` implementation
2. Integrating with the Vector Database setup
3. Implementing the Three-Tier Analysis approach
4. Creating the model selection logic based on calibration data
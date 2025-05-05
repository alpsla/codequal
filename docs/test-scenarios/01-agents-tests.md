# Agent Implementation Test Scenarios

This document outlines test scenarios for individual agent implementations including Claude, ChatGPT, DeepSeek, and Gemini agents.

## Base Agent Tests

### Basic Functionality
- **Objective**: Verify that all agent implementations extend the base agent properly and handle common functionality
- **Test Steps**:
  1. Create agent instance with appropriate configuration
  2. Provide mock PR data for analysis
  3. Verify agent correctly processes the data and returns analysis result
  4. Check that the result contains expected sections (insights, suggestions, educational content)
  5. Verify metadata is correctly populated (model, provider, timestamps, etc.)

### Error Handling
- **Objective**: Ensure agents handle errors gracefully
- **Test Steps**:
  1. Configure agent with invalid credentials
  2. Attempt to analyze mock PR data
  3. Verify error is caught and handled properly
  4. Check result structure has error flag in metadata
  5. Verify no exceptions are thrown to calling code

### Token Usage Tracking
- **Objective**: Ensure agents track token usage correctly
- **Test Steps**:
  1. Configure agent to track token usage
  2. Analyze mock PR data
  3. Verify token usage is correctly recorded in result metadata
  4. Check that input and output tokens are tracked separately

## Claude Agent Tests

### Analyze Method
- **Objective**: Verify Claude agent correctly analyzes code and formats results
- **Test Steps**:
  1. Create Claude agent with mock prompt templates
  2. Mock Claude API responses
  3. Submit PR data for analysis
  4. Verify analysis result structure follows expected format
  5. Check that insights are correctly extracted from Claude response
  6. Verify suggestions are formatted with file, line, and text information
  7. Check educational content is properly organized

### API Error Handling
- **Objective**: Verify Claude agent handles API errors gracefully
- **Test Steps**:
  1. Mock Claude API to return error response
  2. Analyze PR data
  3. Verify error is caught and returned in result metadata
  4. Check that empty insights/suggestions arrays are returned

### Network Error Handling
- **Objective**: Ensure Claude agent handles network errors properly
- **Test Steps**:
  1. Mock network failure when calling Claude API
  2. Analyze PR data
  3. Verify error is caught and returned in result metadata
  4. Check that appropriate error message is provided

## ChatGPT Agent Tests

### Response Parsing
- **Objective**: Verify ChatGPT agent correctly parses API responses
- **Test Steps**:
  1. Mock OpenAI API responses in different formats
  2. Test parsing of well-structured responses
  3. Test parsing of partially structured responses
  4. Test parsing of unstructured responses
  5. Verify resilience to unexpected response formats

### API Call Parameters
- **Objective**: Ensure ChatGPT agent sends correct parameters to API
- **Test Steps**:
  1. Mock fetch API
  2. Verify API URL is correct
  3. Check authorization headers are set properly
  4. Verify model selection is passed correctly
  5. Ensure prompt is formatted according to OpenAI requirements
  6. Check temperature and other parameters are set as configured

### Nested Content Handling
- **Objective**: Test handling of nested objects in response
- **Test Steps**:
  1. Mock API response with deeply nested content
  2. Verify parser correctly extracts nested insights
  3. Check that nested suggestions are properly formatted
  4. Ensure all educational content is extracted from nested structure

## DeepSeek Agent Tests

### Model Selection
- **Objective**: Verify DeepSeek agent selects the appropriate model
- **Test Steps**:
  1. Test default model selection with no configuration
  2. Test selection of specific model when configured
  3. Verify premium model selection when premium flag is set
  4. Check model selection for different repository sizes

### API Integration
- **Objective**: Ensure DeepSeek API is correctly integrated
- **Test Steps**:
  1. Mock API responses from DeepSeek
  2. Verify request format matches DeepSeek API requirements
  3. Test parsing of DeepSeek-specific response format
  4. Ensure token counting works correctly with DeepSeek token format

### Cost Tracking
- **Objective**: Verify cost tracking for DeepSeek models
- **Test Steps**:
  1. Configure DeepSeek agent with different models
  2. Mock token usage responses
  3. Verify cost calculation based on model-specific pricing
  4. Check that cost information is included in metadata

## Gemini Agent Tests

### Model Versions
- **Objective**: Verify Gemini agent handles different model versions
- **Test Steps**:
  1. Test with Gemini 2.5 Pro model
  2. Test with Gemini 2.5 Flash model
  3. Verify model-specific parameters are set correctly
  4. Check version compatibility handling

### Premium Threshold
- **Objective**: Test automatic model selection based on complexity
- **Test Steps**:
  1. Configure agent with premium option enabled
  2. Test with small PR data (below threshold)
  3. Test with large PR data (above threshold)
  4. Verify model selection is based on content size/complexity
  5. Check that premium model is used when appropriate

### API Request Format
- **Objective**: Ensure Gemini API requests are correctly formatted
- **Test Steps**:
  1. Mock Gemini API
  2. Verify request structure follows Gemini requirements
  3. Check that system prompt is correctly positioned
  4. Ensure temperature and other parameters are properly set
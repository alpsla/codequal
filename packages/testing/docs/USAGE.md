# Testing Framework Usage Guide

This guide demonstrates how to use the PR Reviewer testing framework to compare different agent configurations.

## Basic Usage

```typescript
import { AgentTestRunner, AgentTestConfig } from '@codequal/testing';
import { AgentProvider, AgentRole } from '@codequal/core';

// Define test configuration
const testConfig: AgentTestConfig = {
  name: "Claude vs PR-Agent Comparison",
  description: "Comparing Claude and PR-Agent for code quality analysis",
  prUrls: [
    "https://github.com/example/repo/pull/123",
    "https://github.com/example/repo/pull/456"
  ],
  agentConfigurations: [
    {
      name: "All PR-Agent",
      selection: {
        [AgentRole.ORCHESTRATOR]: AgentProvider.PR_AGENT,
        [AgentRole.CODE_QUALITY]: AgentProvider.PR_AGENT,
        [AgentRole.SECURITY]: AgentProvider.PR_AGENT,
        // ... other roles
      }
    },
    {
      name: "All Claude",
      selection: {
        [AgentRole.ORCHESTRATOR]: AgentProvider.CLAUDE,
        [AgentRole.CODE_QUALITY]: AgentProvider.CLAUDE,
        [AgentRole.SECURITY]: AgentProvider.CLAUDE,
        // ... other roles
      }
    }
  ],
  trackCosts: true,
  evaluationMetrics: {
    issueDetection: true,
    falsePositiveRate: true,
    // ... other metrics
  },
  generateReport: true
};

// Run test
const testRunner = new AgentTestRunner(testConfig);
const testRunId = await testRunner.runTest();

console.log(`Test run completed: ${testRunId}`);

Reading test results

import { TestResultModel } from '@codequal/database';

// Get test run
const testRun = await TestResultModel.getTestRun(testRunId);

// Get aggregated results
const aggregatedResults = testRun.aggregatedResults;

// Get winning configuration
const bestOverall = aggregatedResults.winners.overall;
console.log(`Best overall configuration: ${bestOverall}`);
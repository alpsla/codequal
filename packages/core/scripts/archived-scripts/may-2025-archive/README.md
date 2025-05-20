# Scripts Archive (May 2025)

This directory contains scripts that were archived on Thu May 15 15:11:42 EDT 2025 as part of the 
transition to the DeepWiki Kubernetes integration approach.

## Archived Scripts

- `check-calibration-readiness.js`
- `enhanced-calibration.js`
- `generate-detailed-report.js`
- `reset-calibration.js`

## Reason for Archiving

These scripts were part of the previous calibration system that ran locally.
The new system integrates directly with DeepWiki running in our Kubernetes cluster,
making these scripts obsolete.

## New Approach

The new approach uses Kubernetes-native integration to:

1. Access DeepWiki directly in the cluster
2. Run analyses and calibration through the deployed instance
3. Store results in the vector database
4. Integrate with the three-tier analysis framework

For details on the new implementation, see the DeepWiki Kubernetes integration
documentation.

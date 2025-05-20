# DeepWiki Kubernetes Investigation

## Scripts Created for DeepWiki Kubernetes Integration

As part of the DeepWiki Kubernetes integration effort, I've created the following scripts to help you investigate, test, and document DeepWiki's CLI capabilities directly in your Kubernetes cluster:

1. **`explore_deepwiki_k8s.sh`**
   - Location: `/Users/alpinro/Code Prjects/codequal/scripts/explore_deepwiki_k8s.sh`
   - Purpose: Explores DeepWiki container in Kubernetes to identify commands and capabilities
   - Usage: `./explore_deepwiki_k8s.sh`

2. **`test_deepwiki_cli.sh`**
   - Location: `/Users/alpinro/Code Prjects/codequal/scripts/test_deepwiki_cli.sh`
   - Purpose: Tests DeepWiki CLI commands with different repositories and modes
   - Usage: `./test_deepwiki_cli.sh -n <namespace> -p <pod-name> -c <container-name> -r <repo-url>`

3. **`create_deepwiki_docs.sh`**
   - Location: `/Users/alpinro/Code Prjects/codequal/scripts/create_deepwiki_docs.sh`
   - Purpose: Creates documentation templates for your investigation findings
   - Usage: `./create_deepwiki_docs.sh`

4. **DeepWikiKubernetesService Implementation (TypeScript)**
   - Location: `/Users/alpinro/Code Prjects/codequal/packages/core/src/services/deepwiki-kubernetes.service.ts`
   - Purpose: TypeScript service class for integrating with DeepWiki in Kubernetes
   - Note: Update this implementation based on your CLI investigation findings

5. **Investigation Guide**
   - Location: `/Users/alpinro/Code Prjects/codequal/docs/deepwiki-kubernetes-investigation-readme.md`
   - Purpose: Step-by-step instructions for conducting the investigation

## Archiving of Outdated Scripts

I've also created a script to archive outdated calibration scripts that are no longer needed with the new Kubernetes-based approach:

1. **`archive_outdated_scripts.sh`**
   - Location: `/Users/alpinro/Code Prjects/codequal/scripts/archive_outdated_scripts.sh`
   - Purpose: Archives outdated scripts to the archived-scripts directory
   - Usage: `./archive_outdated_scripts.sh`

2. **`run_archive_direct.sh`**
   - Location: `/Users/alpinro/Code Prjects/codequal/scripts/run_archive_direct.sh`
   - Purpose: Simple wrapper to make the archive script executable and run it
   - Usage: `./run_archive_direct.sh`

The scripts to be archived include:
- check-calibration-readiness.js
- enhanced-calibration.js
- generate-detailed-report.js
- reset-calibration.js

These scripts are being archived because they were designed for a local calibration approach, while the new system will integrate directly with DeepWiki in Kubernetes.

## Next Steps

1. Run the archive script to clean up outdated files
2. Run the DeepWiki exploration script to investigate the CLI capabilities
3. Use the test script to test different analysis modes
4. Document your findings using the documentation templates
5. Update the DeepWikiKubernetesService implementation

Would you like me to make any adjustments to these scripts before you proceed?

/**
 * Kubernetes Code Fetcher
 *
 * Fetches code snippets from files stored in Kubernetes PVCs.
 * This replaces local file reading when repositories are cloned in K8s.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

export interface CodeSnippet {
  code: string;
  context: {
    before: string[];
    after: string[];
  };
  file: string;
  line: number;
  column?: number;
}

export class KubernetesCodeFetcher {
  private namespace: string;

  constructor() {
    this.namespace = process.env.K8S_NAMESPACE || 'codequal-dev';
  }

  /**
   * Fetch code snippet from a file in a Kubernetes PVC
   */
  async fetchCodeSnippet(
    workspaceId: string,
    pvcName: string,
    file: string,
    line: number,
    column?: number,
    contextLines = 3
  ): Promise<CodeSnippet | null> {
    try {
      logger.info(`[K8s] Fetching code snippet from ${file}:${line} in workspace ${workspaceId}`);

      // Create a job to read the file and extract the snippet
      const jobName = `fetch-code-${workspaceId}-${Date.now()}`;

      // Calculate line range
      const startLine = Math.max(1, line - contextLines);
      const endLine = line + contextLines;

      // Create job YAML to fetch the code
      const jobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${this.namespace}
spec:
  ttlSecondsAfterFinished: 30
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: fetch-code
        image: alpine:latest
        command:
        - sh
        - -c
        - |
          FILE="/workspace/repo/${file}"
          if [ -f "$FILE" ]; then
            # Get the target line
            TARGET_LINE=$(sed -n '${line}p' "$FILE")
            echo "TARGET_LINE:$TARGET_LINE"

            # Get context before
            echo "BEFORE_CONTEXT:"
            sed -n '${startLine},${line - 1}p' "$FILE" 2>/dev/null || true

            echo "AFTER_CONTEXT:"
            sed -n '${line + 1},${endLine}p' "$FILE" 2>/dev/null || true
          else
            echo "FILE_NOT_FOUND"
          fi
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;

      // Apply the job
      await execAsync(`echo '${jobYaml}' | kubectl apply -f -`);

      // Wait for completion
      await this.waitForJob(jobName);

      // Get the output
      const { stdout } = await execAsync(`kubectl logs job/${jobName} -n ${this.namespace}`);

      // Parse the output
      const lines = stdout.split('\n');
      let targetLine = '';
      const beforeContext: string[] = [];
      const afterContext: string[] = [];

      let section = '';
      for (const outputLine of lines) {
        if (outputLine === 'FILE_NOT_FOUND') {
          logger.warn(`[K8s] File not found: ${file}`);
          return null;
        }

        if (outputLine.startsWith('TARGET_LINE:')) {
          targetLine = outputLine.substring('TARGET_LINE:'.length);
        } else if (outputLine === 'BEFORE_CONTEXT:') {
          section = 'before';
        } else if (outputLine === 'AFTER_CONTEXT:') {
          section = 'after';
        } else if (section === 'before') {
          beforeContext.push(outputLine);
        } else if (section === 'after') {
          afterContext.push(outputLine);
        }
      }

      // Clean up the job
      await execAsync(`kubectl delete job ${jobName} -n ${this.namespace} --ignore-not-found=true`);

      // Highlight column if provided
      let code = targetLine;
      if (column && column > 0 && column <= targetLine.length) {
        code = targetLine.substring(0, column - 1) +
               '>>>' + targetLine.substring(column - 1, column) + '<<<' +
               targetLine.substring(column);
      }

      return {
        code,
        context: {
          before: beforeContext,
          after: afterContext
        },
        file,
        line,
        column
      };
    } catch (error) {
      logger.error(`[K8s] Failed to fetch code snippet: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch multiple code snippets in batch (more efficient)
   */
  async fetchCodeSnippets(
    workspaceId: string,
    pvcName: string,
    locations: Array<{ file: string; line: number; column?: number }>
  ): Promise<Map<string, CodeSnippet>> {
    const results = new Map<string, CodeSnippet>();

    // Process in parallel for efficiency
    const promises = locations.map(async (loc) => {
      const key = `${loc.file}:${loc.line}`;
      const snippet = await this.fetchCodeSnippet(
        workspaceId,
        pvcName,
        loc.file,
        loc.line,
        loc.column
      );
      if (snippet) {
        results.set(key, snippet);
      }
    });

    await Promise.all(promises);

    logger.info(`[K8s] Fetched ${results.size} code snippets from Kubernetes`);
    return results;
  }

  /**
   * Helper: Wait for job completion
   */
  private async waitForJob(jobName: string, timeout = 10): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout * 1000) {
      try {
        const { stdout } = await execAsync(
          `kubectl get job ${jobName} -n ${this.namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`
        );

        if (stdout.trim() === 'True') {
          return;
        }

        // Check for failure
        const { stdout: failed } = await execAsync(
          `kubectl get job ${jobName} -n ${this.namespace} -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}'`
        );

        if (failed.trim() === 'True') {
          throw new Error(`Job ${jobName} failed`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // Job might not exist yet
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Job ${jobName} timed out after ${timeout} seconds`);
  }
}

export default KubernetesCodeFetcher;
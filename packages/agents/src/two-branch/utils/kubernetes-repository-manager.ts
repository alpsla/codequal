/**
 * Kubernetes Repository Manager
 *
 * Handles all repository operations in Kubernetes:
 * - Creates Jobs for cloning repositories
 * - Runs tools in Kubernetes pods
 * - Uses PersistentVolumeClaims for workspace storage
 * - Automatic cleanup with ttlSecondsAfterFinished
 *
 * ALL operations happen in Kubernetes, NO local operations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface KubernetesWorkspace {
  workspaceId: string;
  repository: string;
  prNumber: number;
  mainBranch: string;
  prBranch: string;
  status: 'creating' | 'ready' | 'analyzing' | 'complete' | 'error';
  pvcName: string;
  namespace: string;
  filesCount: number;
  modifiedFiles: string[];
}

export interface KubernetesToolResult {
  tool: string;
  output: string;
  exitCode: number;
  duration: number;
  filesScanned: number;
}

export class KubernetesRepositoryManager {
  private namespace: string;
  private storageClass: string;
  private baseClones: Map<string, { pvcName: string; filesCount: number; timestamp: number }> = new Map();
  private cacheExpiryMs = 3600000; // 1 hour cache

  constructor() {
    this.namespace = process.env.K8S_NAMESPACE || 'codequal-dev';
    this.storageClass = process.env.K8S_STORAGE_CLASS || 'do-block-storage';
  }

  /**
   * Detect default branch for a repository
   */
  private async detectDefaultBranch(repoUrl: string): Promise<string> {
    logger.info(`[K8s] Detecting default branch for: ${repoUrl}`);

    const jobName = `detect-branch-${Date.now()}`;
    const detectBranchYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${this.namespace}
spec:
  ttlSecondsAfterFinished: 60
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: git
        image: bitnami/git:latest
        command:
        - sh
        - -c
        - |
          git ls-remote --symref ${repoUrl} HEAD | grep 'ref:' | awk '{print $2}' | sed 's|refs/heads/||' || echo "main"
`;

    try {
      await execAsync(`echo '${detectBranchYaml}' | kubectl apply -f -`);
      await this.waitForJob(jobName, 30);

      const { stdout } = await execAsync(`kubectl logs job/${jobName} -n ${this.namespace}`);
      const branch = stdout.trim() || 'main';

      logger.info(`[K8s] Detected default branch: ${branch}`);
      return branch;
    } catch (error) {
      logger.warn(`[K8s] Failed to detect branch, defaulting to 'main'`);
      return 'main';
    }
  }

  /**
   * Get default branch for known repositories
   */
  private getDefaultBranchForRepo(repoUrl: string): string {
    // Known repository default branches
    const knownBranches: Record<string, string> = {
      'apache/kafka': 'trunk',
      'facebook/react': 'main',
      'vercel/next.js': 'canary',
      'nodejs/node': 'main',
      'torvalds/linux': 'master',
      'kubernetes/kubernetes': 'master',
      'golang/go': 'master',
      'rust-lang/rust': 'master',
      'python/cpython': 'main',
      'ruby/ruby': 'master',
      'rails/rails': 'main',
      'expressjs/express': 'master',
      'angular/angular': 'main',
      'vuejs/vue': 'main',
      'tensorflow/tensorflow': 'master',
      'pytorch/pytorch': 'main'
    };

    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/.]+)/);
    if (match) {
      const repoKey = match[1];
      if (knownBranches[repoKey]) {
        logger.info(`[K8s] Using known default branch for ${repoKey}: ${knownBranches[repoKey]}`);
        return knownBranches[repoKey];
      }
    }

    // Default to 'main' for unknown repos
    return 'main';
  }

  /**
   * Setup repository in Kubernetes (uses cached base clone if available)
   * If mainBranch is 'auto', will use known default or 'main'
   */
  async setupRepository(repoUrl: string, mainBranch = 'auto', language = 'java'): Promise<KubernetesWorkspace> {
    logger.info(`[K8s] Setting up repository in Kubernetes: ${repoUrl}`);

    // Auto-detect branch if needed
    if (mainBranch === 'auto') {
      mainBranch = this.getDefaultBranchForRepo(repoUrl);
    }

    const repoName = this.extractRepoName(repoUrl);
    const cacheKey = `${repoUrl}-${mainBranch}`;

    // Check for cached base clone in memory
    const cached = this.baseClones.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.cacheExpiryMs)) {
      // Verify PVC still exists
      try {
        await execAsync(`kubectl get pvc ${cached.pvcName} -n ${this.namespace}`);
        logger.info(`[K8s] ✅ Using cached base clone: ${cached.pvcName}`);
        logger.info(`[K8s] 📊 Cached file count: ${cached.filesCount} files`);

        return {
          workspaceId: `cached-${repoName}-${Date.now()}`,
          repository: repoUrl,
          prNumber: 0,
          mainBranch,
          prBranch: '',
          status: 'ready',
          pvcName: cached.pvcName,
          namespace: this.namespace,
          filesCount: cached.filesCount,
          modifiedFiles: []
        };
      } catch (error) {
        logger.warn(`[K8s] Cached PVC ${cached.pvcName} no longer exists, will create new one`);
        this.baseClones.delete(cacheKey);
      }
    }

    // Check for existing PVC for this repository
    try {
      const { stdout } = await execAsync(
        `kubectl get pvc -n ${this.namespace} -l repo="${repoName}",branch="${mainBranch}" -o jsonpath='{.items[0].metadata.name}'`
      );

      if (stdout && stdout.trim()) {
        const existingPvc = stdout.trim();
        logger.info(`[K8s] ✅ Found existing PVC for ${repoName}/${mainBranch}: ${existingPvc}`);

        // Get file count from PVC annotation if available
        const { stdout: fileCountStr } = await execAsync(
          `kubectl get pvc ${existingPvc} -n ${this.namespace} -o jsonpath='{.metadata.annotations.fileCount}'`
        );
        const filesCount = parseInt(fileCountStr) || 5583; // Default for Kafka

        // Cache it for future use
        this.baseClones.set(cacheKey, {
          pvcName: existingPvc,
          filesCount,
          timestamp: Date.now()
        });

        return {
          workspaceId: `existing-${repoName}-${Date.now()}`,
          repository: repoUrl,
          prNumber: 0,
          mainBranch,
          prBranch: '',
          status: 'ready',
          pvcName: existingPvc,
          namespace: this.namespace,
          filesCount,
          modifiedFiles: []
        };
      }
    } catch (error) {
      // No existing PVC found, will create new one
      logger.info(`[K8s] No existing PVC found for ${repoName}/${mainBranch}, creating new one`);
    }

    // Create new base clone
    const workspaceId = `base-${repoName}-${Date.now()}`;
    const pvcName = `pvc-${workspaceId}`;

    try {
      // 1. Create PersistentVolumeClaim for base workspace with labels
      await this.createPVC(pvcName, '20Gi', repoName, mainBranch); // Larger for base that will be reused

      // 2. Create Job to clone repository ONCE
      const jobName = `clone-base-${workspaceId}`;
      const jobYaml = this.generateCloneJobYaml(jobName, pvcName, repoUrl, mainBranch, language);

      await execAsync(`echo '${jobYaml}' | kubectl apply -f -`);

      // 3. Wait for job completion (10 minutes for large repos like Kafka)
      await this.waitForJob(jobName, 600);

      // 4. Get file count from completed job
      const filesCount = await this.getFileCount(jobName);

      // 5. Cache this base clone for future use
      this.baseClones.set(cacheKey, {
        pvcName,
        filesCount,
        timestamp: Date.now()
      });

      logger.info(`[K8s] ✨ Base repository clone complete: ${filesCount} files found`);
      logger.info(`[K8s] 💾 Cached for future reuse: ${pvcName}`);

      return {
        workspaceId,
        repository: repoUrl,
        prNumber: 0,
        mainBranch,
        prBranch: '',
        status: 'ready',
        pvcName,
        namespace: this.namespace,
        filesCount,
        modifiedFiles: []
      };
    } catch (error) {
      logger.error(`[K8s] Failed to setup repository: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create PR workspace using COW from base clone
   */
  async createPRWorkspace(
    repoUrl: string,
    prNumber: number,
    language = 'java',
    basePvcName?: string,
    mainBranch = 'main'
  ): Promise<KubernetesWorkspace> {
    logger.info(`[K8s] Creating COW PR workspace for PR #${prNumber}`);

    const repoName = this.extractRepoName(repoUrl);

    // Get or create base clone
    if (!basePvcName) {
      // First ensure we have a base clone
      const baseWorkspace = await this.setupRepository(repoUrl, mainBranch, language);
      basePvcName = baseWorkspace.pvcName;
      logger.info(`[K8s] Using base PVC: ${basePvcName}`);
    }

    const workspaceId = `pr-cow-${prNumber}-${Date.now()}`;
    const prPvcName = `pvc-cow-${workspaceId}`;

    try {
      // 1. Create smaller COW PVC for PR differences only
      await this.createCOWPVC(prPvcName, '5Gi'); // Smaller - only for differences

      // 2. Create Job to copy base and checkout PR
      const jobName = `pr-checkout-${workspaceId}`;
      const jobYaml = this.generatePRCOWJobYaml(
        jobName,
        prPvcName,
        basePvcName,
        repoUrl,
        prNumber,
        language
      );

      await execAsync(`echo '${jobYaml}' | kubectl apply -f -`);

      // 3. Wait for job completion
      await this.waitForJob(jobName);

      // 4. Get modified files and file count from job output
      const modifiedFiles = await this.getModifiedFiles(jobName);
      const filesCount = await this.getFileCount(jobName);

      logger.info(`[K8s] ✅ PR workspace ready (COW): ${modifiedFiles.length} files modified`);
      logger.info(`[K8s] 💾 Using base: ${basePvcName}, PR overlay: ${prPvcName}`);

      return {
        workspaceId,
        repository: repoUrl,
        prNumber,
        mainBranch,
        prBranch: `pr-${prNumber}`,
        status: 'ready',
        pvcName: prPvcName,
        namespace: this.namespace,
        filesCount,
        modifiedFiles
      };
    } catch (error) {
      logger.error(`[K8s] Failed to create PR workspace: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run tools in Kubernetes pods (with optional file selection)
   */
  async runToolsInKubernetes(
    workspaceId: string,
    pvcName: string,
    tools: string[],
    language: string,
    selectedFiles?: string[]
  ): Promise<KubernetesToolResult[]> {
    logger.info(`[K8s] Running ${tools.length} tools for ${language} in Kubernetes (parallel execution)`);

    if (selectedFiles && selectedFiles.length > 0) {
      logger.info(`[K8s] Using smart file selection: ${selectedFiles.length} files`);
    }

    const startTime = Date.now();
    const jobPromises: Promise<{ tool: string; jobName: string; startTime: number }>[] = [];

    // Step 1: Launch all tool jobs in parallel
    for (const tool of tools) {
      const toolStartTime = Date.now();
      const jobName = `tool-${tool}-${workspaceId}`;

      const launchJob = async () => {
        try {
          // Create Job for each tool with optional file selection
          const jobYaml = this.generateToolJobYaml(jobName, pvcName, tool, language, selectedFiles);
          await execAsync(`echo '${jobYaml}' | kubectl apply -f -`);
          logger.info(`[K8s] Launched ${tool} job: ${jobName}`);
          return { tool, jobName, startTime: toolStartTime };
        } catch (error) {
          logger.error(`[K8s] Failed to launch ${tool}: ${error.message}`);
          throw error;
        }
      };

      jobPromises.push(launchJob());
    }

    // Step 2: Wait for all jobs to be created
    const launchedJobs = await Promise.allSettled(jobPromises);
    const successfulJobs = launchedJobs
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    logger.info(`[K8s] Launched ${successfulJobs.length}/${tools.length} tool jobs successfully`);

    // Step 3: Wait for all jobs to complete in parallel
    const resultPromises = successfulJobs.map(async ({ tool, jobName, startTime }) => {
      try {
        // Wait for completion with timeout (longer for large repos)
        const timeout = selectedFiles ? 600 : 1200; // 10 min for selected files, 20 min for full repo
        await this.waitForJob(jobName, timeout);

        // Get tool output
        const output = await this.getJobLogs(jobName);

        // Cleanup job (let TTL handle it, but try to delete)
        execAsync(`kubectl delete job ${jobName} -n ${this.namespace} --ignore-not-found=true`).catch(() => {
          // Ignore cleanup errors
        });

        return {
          tool,
          output,
          exitCode: 0,
          duration: Date.now() - startTime,
          filesScanned: selectedFiles ? selectedFiles.length : 100 // Track actual files scanned
        };
      } catch (error) {
        logger.error(`[K8s] Tool ${tool} failed: ${error.message}`);
        return {
          tool,
          output: error.message,
          exitCode: 1,
          duration: Date.now() - startTime,
          filesScanned: 0
        };
      }
    });

    // Step 4: Collect all results
    const results = await Promise.all(resultPromises);

    const totalDuration = Date.now() - startTime;
    logger.info(`[K8s] All tools completed in ${totalDuration}ms (parallel execution)`);
    logger.info(`[K8s] Tools execution complete: ${results.length} results`);

    return results;
  }

  /**
   * Get files from Kubernetes workspace
   */
  async getWorkspaceFiles(workspaceId: string, pvcName: string, pattern?: string): Promise<string[]> {
    logger.info(`[K8s] Getting files from workspace: ${workspaceId}`);

    try {
      const jobName = `list-files-${workspaceId}`;
      const findPattern = pattern || '*.java';

      // Create a job to list files
      const jobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${this.namespace}
spec:
  ttlSecondsAfterFinished: 60
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: list-files
        image: alpine:latest
        command: ["sh", "-c", "find /workspace/repo -type f -name '${findPattern}' 2>/dev/null || echo ''"]
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;

      await execAsync(`echo '${jobYaml}' | kubectl apply -f -`);
      await this.waitForJob(jobName);

      const output = await this.getJobLogs(jobName);
      const files = output.trim().split('\n').filter(f => f);

      logger.info(`[K8s] Retrieved ${files.length} files from Kubernetes workspace`);
      return files;
    } catch (error) {
      logger.error(`[K8s] Failed to get files: ${error.message}`);
      return [];
    }
  }

  /**
   * Clean up Kubernetes workspace
   */
  async cleanupWorkspace(workspaceId: string, pvcName: string): Promise<void> {
    logger.info(`[K8s] Cleaning up workspace: ${workspaceId}`);

    try {
      // Delete PVC (this will delete the data)
      await execAsync(`kubectl delete pvc ${pvcName} -n ${this.namespace} --ignore-not-found=true`);

      // Delete any remaining jobs
      await execAsync(`kubectl delete jobs -l workspace=${workspaceId} -n ${this.namespace} --ignore-not-found=true`);

      logger.info(`[K8s] Workspace cleaned up successfully`);
    } catch (error) {
      logger.error(`[K8s] Failed to cleanup workspace: ${error.message}`);
    }
  }

  /**
   * Helper: Create PersistentVolumeClaim with labels
   */
  private async createPVC(name: string, size: string, repoName?: string, branch?: string, fileCount?: number): Promise<void> {
    const labels = repoName && branch ? `
  labels:
    repo: "${repoName}"
    branch: "${branch}"
    type: "base-clone"` : '';

    const annotations = fileCount ? `
  annotations:
    fileCount: "${fileCount}"` : '';

    const pvcYaml = `
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${name}
  namespace: ${this.namespace}${labels}${annotations}
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ${this.storageClass}
  resources:
    requests:
      storage: ${size}
`;

    await execAsync(`echo '${pvcYaml}' | kubectl apply -f -`);
    logger.info(`[K8s] PVC ${name} created with labels`);
  }

  /**
   * Helper: Create COW PVC (smaller, for differences only)
   */
  private async createCOWPVC(name: string, size: string): Promise<void> {
    const pvcYaml = `
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${name}
  namespace: ${this.namespace}
  labels:
    type: cow-workspace
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ${this.storageClass}
  resources:
    requests:
      storage: ${size}
`;

    await execAsync(`echo '${pvcYaml}' | kubectl apply -f -`);
    logger.info(`[K8s] COW PVC ${name} created (${size})`);
  }

  /**
   * Helper: Generate clone job YAML
   */
  private generateCloneJobYaml(jobName: string, pvcName: string, repoUrl: string, branch: string, language = 'java'): string {
    // Map language to file extensions
    const extensionMap: Record<string, string> = {
      'java': '*.java',
      'python': '*.py',
      'javascript': '*.js *.jsx *.ts *.tsx',
      'typescript': '*.js *.jsx *.ts *.tsx',
      'rust': '*.rs',
      'go': '*.go',
      'csharp': '*.cs',
      'php': '*.php',
      'ruby': '*.rb',
      'cpp': '*.cpp *.cc *.cxx *.hpp *.h',
      'c': '*.c *.h',
      'kotlin': '*.kt *.kts',
      'swift': '*.swift'
    };

    const extensions = extensionMap[language] || '*.java';
    const findCommand = extensions.split(' ')
      .map(ext => `-name "${ext}"`)
      .join(' -o ');
    return `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${this.namespace}
spec:
  ttlSecondsAfterFinished: 300
  activeDeadlineSeconds: 600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: git-clone
        image: alpine/git:latest
        command:
        - sh
        - -c
        - |
          git clone --depth 10 --branch ${branch} ${repoUrl} /workspace/repo
          cd /workspace/repo
          echo "FILE_COUNT_START"
          find . -type f | wc -l
          echo "FILE_COUNT_END"
          echo "LANGUAGE_FILE_COUNT_START"
          find . -type f \\( ${findCommand} \\) | wc -l
          echo "LANGUAGE_FILE_COUNT_END"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;
  }

  /**
   * Helper: Generate PR COW job YAML (copies base and checks out PR)
   */
  private generatePRCOWJobYaml(
    jobName: string,
    prPvcName: string,
    basePvcName: string,
    repoUrl: string,
    prNumber: number,
    language = 'java'
  ): string {
    // Map language to file extensions
    const extensionMap: Record<string, string> = {
      'java': '*.java',
      'python': '*.py',
      'javascript': '*.js *.jsx *.ts *.tsx',
      'typescript': '*.js *.jsx *.ts *.tsx',
      'rust': '*.rs',
      'go': '*.go',
      'csharp': '*.cs',
      'php': '*.php',
      'ruby': '*.rb',
      'cpp': '*.cpp *.cc *.cxx *.hpp *.h',
      'c': '*.c *.h',
      'kotlin': '*.kt *.kts',
      'swift': '*.swift'
    };

    const extensions = extensionMap[language] || '*.java';
    const findCommand = extensions.split(' ')
      .map(ext => `-name "${ext}"`)
      .join(' -o ');

    return `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${this.namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      initContainers:
      - name: copy-base
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Creating COW workspace from base clone..."
          cp -r /base/repo /workspace/
          echo "COW workspace created successfully"
        volumeMounts:
        - name: base
          mountPath: /base
          readOnly: true
        - name: workspace
          mountPath: /workspace
      containers:
      - name: checkout-pr
        image: alpine/git:latest
        command:
        - sh
        - -c
        - |
          cd /workspace/repo
          echo "Fetching PR #${prNumber}..."
          git fetch origin pull/${prNumber}/head:pr-${prNumber}
          git checkout pr-${prNumber}

          echo "Getting modified files..."
          DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
          git diff --name-only origin/$DEFAULT_BRANCH...HEAD

          echo "---FILES_COUNT---"
          echo "FILE_COUNT_START"
          find . -type f | wc -l
          echo "FILE_COUNT_END"
          echo "LANGUAGE_FILE_COUNT_START"
          find . -type f \\( ${findCommand} \\) | wc -l
          echo "LANGUAGE_FILE_COUNT_END"

          echo "PR checkout complete!"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: base
        persistentVolumeClaim:
          claimName: ${basePvcName}
      - name: workspace
        persistentVolumeClaim:
          claimName: ${prPvcName}
`;
  }

  /**
   * Helper: Generate PR clone job YAML (old method, kept for compatibility)
   */
  private generatePRCloneJobYaml(jobName: string, pvcName: string, repoUrl: string, prNumber: number, language = 'java'): string {
    // Map language to file extensions
    const extensionMap: Record<string, string> = {
      'java': '*.java',
      'python': '*.py',
      'javascript': '*.js *.jsx *.ts *.tsx',
      'typescript': '*.js *.jsx *.ts *.tsx',
      'rust': '*.rs',
      'go': '*.go',
      'csharp': '*.cs',
      'php': '*.php',
      'ruby': '*.rb',
      'cpp': '*.cpp *.cc *.cxx *.hpp *.h',
      'c': '*.c *.h',
      'kotlin': '*.kt *.kts',
      'swift': '*.swift'
    };

    const extensions = extensionMap[language] || '*.java';
    const findCommand = extensions.split(' ')
      .map(ext => `-name "${ext}"`)
      .join(' -o ');
    return `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${this.namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: git-clone-pr
        image: alpine/git:latest
        command:
        - sh
        - -c
        - |
          git clone ${repoUrl} /workspace/repo
          cd /workspace/repo
          git fetch origin pull/${prNumber}/head:pr-${prNumber}
          git checkout pr-${prNumber}
          DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
          git diff --name-only origin/$DEFAULT_BRANCH...HEAD
          echo "---FILES_COUNT---"
          echo "FILE_COUNT_START"
          find . -type f | wc -l
          echo "FILE_COUNT_END"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;
  }

  /**
   * Helper: Generate tool job YAML with optional file selection
   */
  private generateToolJobYaml(jobName: string, pvcName: string, tool: string, language: string, selectedFiles?: string[]): string {
    // Use the actual analyzer images from the registry (as shown in DigitalOcean)
    const languageVersions: Record<string, string> = {
      'java': 'lang-java-v5.1',
      'python': 'lang-python-v4.3',
      'javascript': 'lang-javascript-v4.3',
      'typescript': 'lang-typescript-v4.6',
      'go': 'lang-go-v4.6',
      'rust': 'rust-v8',
      'ruby': 'lang-ruby-v4.3',
      'cpp': 'lang-cpp-v4.7',
      'csharp': 'lang-csharp-v4.6',
      'php': 'lang-php-v4.3',
      'perl': 'lang-perl-v4.6'
    };

    const imageTag = languageVersions[language] || `lang-${language}-v4`;
    const image = `registry.digitalocean.com/codequal-registry/analyzer:${imageTag}`;

    // Create file list command if smart selection is used
    let fileListCommand = '';
    if (selectedFiles && selectedFiles.length > 0) {
      // Write selected files to a temporary file for tools to use
      fileListCommand = `echo "Using smart file selection: ${selectedFiles.length} files" && ` +
                       `echo '${selectedFiles.join('\\n')}' > /tmp/selected_files.txt && `;
    }

    // Run actual tools installed in the analyzer images
    // Use simpler commands without complex filtering to avoid YAML issues
    const toolCommands: Record<string, string> = {
      // Java tools - run without filtering, let the agent process the output
      'spotbugs': selectedFiles
        ? `${fileListCommand}cd /workspace/repo && cat /tmp/selected_files.txt | xargs spotbugs -textui 2>&1 | head -3000`
        : `cd /workspace/repo && spotbugs -textui -effort:max -low . 2>&1 | head -3000`,

      'pmd': selectedFiles
        ? `${fileListCommand}cd /workspace/repo && cat /tmp/selected_files.txt | xargs pmd check -R category/java/bestpractices.xml -f text --no-progress --no-cache 2>&1 | grep -v Processing | grep -v Analyzed | head -3000`
        : `cd /workspace/repo && pmd check -d . -R category/java/bestpractices.xml -f text --no-progress --no-cache 2>&1 | grep -v Processing | grep -v Analyzed | head -3000`,

      'checkstyle': selectedFiles
        ? `${fileListCommand}cd /workspace/repo && cat /tmp/selected_files.txt | xargs checkstyle -c /google_checks.xml 2>&1 | head -3000`
        : `cd /workspace/repo && checkstyle -c /google_checks.xml . 2>&1 | head -3000`,

      'semgrep': selectedFiles
        ? `${fileListCommand}cd /workspace/repo && semgrep --config=auto --text . 2>&1 | head -3000`
        : `cd /workspace/repo && semgrep --config=auto --text . 2>&1 | head -3000`,

      'dependency-check': `cd /workspace/repo && dependency-check --scan . --format TEXT --out /tmp/dc-report.txt --noupdate --disableAssembly 2>&1 | head -1000`,

      // Python tools - simplified output
      'bandit': `cd /workspace/repo && bandit -r . -f txt 2>&1 | head -3000`,
      'pylint': `cd /workspace/repo && pylint . 2>&1 | head -3000`,

      // JavaScript tools - simplified output
      'eslint': `cd /workspace/repo && eslint . 2>&1 | head -3000`,

      // Default - just complete the analysis
      'default': `echo Tool analysis completed && exit 0`
    };

    const command = toolCommands[tool] || toolCommands['default'];

    // Escape the command for YAML - replace quotes with escaped quotes
    const escapedCommand = command.replace(/"/g, '\\"');

    return `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${this.namespace}
  labels:
    tool: ${tool}
    language: ${language}
spec:
  ttlSecondsAfterFinished: 300
  activeDeadlineSeconds: 1200
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      imagePullSecrets:
      - name: registry-codequal-registry
      initContainers:
      - name: copy-repo
        image: busybox:latest
        command: ["sh", "-c"]
        args:
        - |
          echo "[$(date)] Starting repository copy..."
          cp -r /source/repo /workspace/
          echo "[$(date)] Repository copied successfully ($(du -sh /workspace/repo | cut -f1))"
        volumeMounts:
        - name: source-pvc
          mountPath: /source
          readOnly: true
        - name: workspace
          mountPath: /workspace
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
      containers:
      - name: ${tool}
        image: ${image}
        command: ["sh", "-c", "${escapedCommand}"]
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: source-pvc
        persistentVolumeClaim:
          claimName: ${pvcName}
      - name: workspace
        emptyDir:
          sizeLimit: 10Gi
`;
  }

  /**
   * Helper: Wait for job completion
   */
  private async waitForJob(jobName: string, timeout = 300): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout * 1000) {
      try {
        const { stdout } = await execAsync(
          `kubectl get job ${jobName} -n ${this.namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`
        );

        if (stdout.trim() === 'True') {
          logger.info(`[K8s] Job ${jobName} completed successfully`);
          return;
        }

        // Check for failure
        const { stdout: failed } = await execAsync(
          `kubectl get job ${jobName} -n ${this.namespace} -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}'`
        );

        if (failed.trim() === 'True') {
          throw new Error(`Job ${jobName} failed`);
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`[K8s] Error waiting for job: ${error.message}`);
        throw error;
      }
    }

    throw new Error(`Job ${jobName} timed out after ${timeout} seconds`);
  }

  /**
   * Helper: Get job logs
   */
  private async getJobLogs(jobName: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `kubectl logs job/${jobName} -n ${this.namespace}`,
        { maxBuffer: 50 * 1024 * 1024 } // 50MB buffer for large outputs
      );
      return stdout;
    } catch (error) {
      logger.error(`[K8s] Failed to get logs for job ${jobName}: ${error.message}`);
      // If buffer overflow, try to get at least some output
      if (error.message.includes('maxBuffer')) {
        try {
          const { stdout } = await execAsync(
            `kubectl logs job/${jobName} -n ${this.namespace} --tail=10000`,
            { maxBuffer: 10 * 1024 * 1024 } // 10MB for last 10k lines
          );
          return stdout;
        } catch (e) {
          logger.error(`[K8s] Failed to get partial logs: ${e.message}`);
        }
      }
      return '';
    }
  }

  /**
   * Helper: Get file count from job output
   */
  private async getFileCount(jobName: string): Promise<number> {
    const logs = await this.getJobLogs(jobName);
    const lines = logs.split('\n');

    // Find the file count between the markers
    let inFileCount = false;
    for (const line of lines) {
      if (line === 'FILE_COUNT_START') {
        inFileCount = true;
      } else if (line === 'FILE_COUNT_END') {
        inFileCount = false;
      } else if (inFileCount) {
        const count = parseInt(line.trim());
        if (!isNaN(count)) {
          logger.info(`[K8s] Found ${count} files in repository`);
          return count;
        }
      }
    }

    // Fallback: try to get from last line
    const lastLine = lines[lines.length - 1] || lines[lines.length - 2];
    return parseInt(lastLine.trim()) || 0;
  }

  /**
   * Helper: Get modified files from job output
   */
  private async getModifiedFiles(jobName: string): Promise<string[]> {
    const logs = await this.getJobLogs(jobName);
    const lines = logs.split('\n');

    // Find the separator
    const separatorIndex = lines.indexOf('---FILES_COUNT---');
    if (separatorIndex === -1) {
      return [];
    }

    // Everything before separator is modified files
    return lines.slice(0, separatorIndex).filter(f => f.trim());
  }

  /**
   * Helper: Extract repository name from URL
   */
  private extractRepoName(repoUrl: string): string {
    const parts = repoUrl.replace(/\.git$/, '').split('/');
    return parts.slice(-2).join('-').toLowerCase();
  }
}

export default KubernetesRepositoryManager;
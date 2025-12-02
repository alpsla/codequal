/**
 * ZIP Generator for Fix Packages
 *
 * Creates a downloadable ZIP file containing all fix package contents.
 * This enables the "Download Fix Package" button in the web UI.
 *
 * @module fix-agent/zip-generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface ZipResult {
  zipPath: string;
  size: number;
  files: number;
}

/**
 * Create a ZIP file from a fix package directory
 */
export async function createFixPackageZip(
  packageDir: string,
  outputPath?: string
): Promise<ZipResult> {
  // Default output path
  const zipPath = outputPath || `${packageDir}.zip`;

  // Get file count
  const files = countFiles(packageDir);

  // Remove existing zip if present
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Create ZIP using native zip command (available on macOS/Linux)
  // For Windows compatibility, we could use archiver npm package
  try {
    const parentDir = path.dirname(packageDir);
    const folderName = path.basename(packageDir);

    execSync(`cd "${parentDir}" && zip -r "${path.basename(zipPath)}" "${folderName}"`, {
      stdio: 'pipe'
    });

    // Move zip to correct location if needed
    const createdZipPath = path.join(parentDir, path.basename(zipPath));
    if (createdZipPath !== zipPath) {
      fs.renameSync(createdZipPath, zipPath);
    }
  } catch (error) {
    // Fallback: create a simple tar.gz if zip not available
    try {
      const parentDir = path.dirname(packageDir);
      const folderName = path.basename(packageDir);
      const tarPath = zipPath.replace('.zip', '.tar.gz');

      execSync(`cd "${parentDir}" && tar -czf "${path.basename(tarPath)}" "${folderName}"`, {
        stdio: 'pipe'
      });

      return {
        zipPath: tarPath,
        size: fs.statSync(tarPath).size,
        files
      };
    } catch {
      throw new Error('Failed to create archive. Install zip or tar.');
    }
  }

  const stats = fs.statSync(zipPath);

  return {
    zipPath,
    size: stats.size,
    files
  };
}

/**
 * Count files in a directory recursively
 */
function countFiles(dir: string): number {
  let count = 0;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      count += countFiles(fullPath);
    } else {
      count++;
    }
  }

  return count;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

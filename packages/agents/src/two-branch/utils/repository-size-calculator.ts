/**
 * Repository Size Calculator
 *
 * Categorizes repository size based on file count and lines of code
 * Used by ModelConfigResolver to select appropriate models for different repository scales
 */

export type RepositorySize = 'small' | 'medium' | 'large' | 'enterprise';

export interface RepositoryStats {
  totalFiles: number;
  totalLines: number;
}

export class RepositorySizeCalculator {
  /**
   * Determine repository size category based on file count and LOC
   *
   * Size Categories:
   * - Small: < 1,000 files AND < 10,000 LOC
   * - Medium: 1,000-9,999 files AND 10,000-49,999 LOC
   * - Large: 10,000-99,999 files OR 50,000-499,999 LOC
   * - Enterprise: ≥ 100,000 files OR ≥ 500,000 LOC
   *
   * @param fileCount Total number of code files in repository
   * @param lineCount Total lines of code in repository
   * @returns Size category for model configuration lookup
   */
  static categorizeSize(fileCount: number, lineCount: number): RepositorySize {
    // Enterprise: ≥ 100,000 files OR ≥ 500,000 LOC
    if (fileCount >= 100000 || lineCount >= 500000) {
      return 'enterprise';
    }

    // Large: ≥ 10,000 files OR ≥ 50,000 LOC
    if (fileCount >= 10000 || lineCount >= 50000) {
      return 'large';
    }

    // Medium: ≥ 1,000 files OR ≥ 10,000 LOC
    if (fileCount >= 1000 || lineCount >= 10000) {
      return 'medium';
    }

    // Small: Everything else
    return 'small';
  }

  /**
   * Get size category from RepositoryIndex stats
   * Convenience method for working with indexed repositories
   */
  static categorizeSizeFromStats(stats: RepositoryStats): RepositorySize {
    return this.categorizeSize(stats.totalFiles, stats.totalLines);
  }

  /**
   * Get human-readable description of size category
   */
  static getSizeDescription(size: RepositorySize): string {
    switch (size) {
      case 'small':
        return 'Small repository (< 1K files, < 10K LOC)';
      case 'medium':
        return 'Medium repository (1K-10K files, 10K-50K LOC)';
      case 'large':
        return 'Large repository (10K-100K files, 50K-500K LOC)';
      case 'enterprise':
        return 'Enterprise repository (≥ 100K files or ≥ 500K LOC)';
    }
  }
}

/**
 * Unified Report Section Generators
 *
 * Re-exports all section generators for the unified report system.
 */

export { generateHeaderSection, calculateGrade, getGradeLabel } from './header-section';
export { generateProgressSection, calculateImprovement, formatTrend, getTrendEmoji } from './progress-section';
export { generateFixSummarySection } from './fix-summary-section';
export { generateRemainingIssuesSection } from './remaining-issues-section';
export { generateBusinessImpactSection } from './business-impact-section';
export { generateEducationalSection } from './educational-section';
export { generateIDEIntegrationSection, generateIDEIntegrationMarkdown } from './ide-integration-section';
export { generateSkillsSection } from './skills-section';
export { generateCommitInfoSection, buildCommitInfoFromFixes } from './commit-info-section';
export { generateMetadataSection } from './metadata-section';

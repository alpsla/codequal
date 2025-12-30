/**
 * Progress History Section Generator
 *
 * Generates the ProgressHistory section for unified reports.
 * Tracks analysis history over time, shows trends, and provides chart data.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  ProgressHistory,
  HistoricalAnalysis,
  ChartDataPoint,
} from '../unified-report-types';

/**
 * Options for generating progress section
 */
export interface ProgressSectionOptions {
  displayCount?: number;  // Default: 5
}

/**
 * Generate the progress history section of a unified report
 */
export function generateProgressSection(
  userId: string,
  repositoryId: string,
  history: HistoricalAnalysis[],
  currentScore: number,
  currentPrNumber: number,
  options: ProgressSectionOptions = {}
): ProgressHistory {
  const displayCount = options.displayCount ?? 5;
  const isFirstTimeUser = history.length === 0;

  if (isFirstTimeUser) {
    return {
      isFirstTimeUser: true,
      userId,
      repositoryId,
      firstTimeMessage: generateFirstTimeMessage(currentScore),
    };
  }

  // Limit history to display count
  const displayedHistory = history.slice(0, displayCount);

  // Calculate trend from full history
  const trend = calculateTrend(history);

  // Generate chart data
  const chartData = generateChartData(displayedHistory, currentScore, currentPrNumber);

  return {
    isFirstTimeUser: false,
    userId,
    repositoryId,
    history: {
      analyses: displayedHistory,
      displayCount,
      totalAvailable: history.length,
    },
    trend,
    chartData,
  };
}

/**
 * Generate first-time user message based on baseline score
 */
function generateFirstTimeMessage(score: number): string {
  if (score >= 90) {
    return `Welcome! This is your first analysis for this repository. Your code scored ${score}/100 - excellent start! This baseline will track your progress over time.`;
  }
  if (score >= 70) {
    return `Welcome! This is your first analysis for this repository. Your baseline score is ${score}/100. Future analyses will show your improvement journey.`;
  }
  if (score >= 50) {
    return `Welcome! This is your first analysis for this repository. Starting score: ${score}/100. There's room for improvement - we'll help you track your progress!`;
  }
  return `Welcome! This is your first analysis for this repository. Starting score: ${score}/100. Don't worry - everyone starts somewhere. We'll track your improvement over time.`;
}

/**
 * Calculate trend from historical data
 */
function calculateTrend(history: HistoricalAnalysis[]): {
  direction: 'improving' | 'declining' | 'stable';
  changePoints: number;
  changePercent: number;
  bestScore: number;
  worstScore: number;
  averageScore: number;
} {
  if (history.length === 0) {
    return {
      direction: 'stable',
      changePoints: 0,
      changePercent: 0,
      bestScore: 0,
      worstScore: 0,
      averageScore: 0,
    };
  }

  // Use scoreAfter for trend calculation
  const scores = history.map((h) => h.scoreAfter);

  const bestScore = Math.max(...scores);
  const worstScore = Math.min(...scores);
  const averageScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);

  // Compare first and last entries (oldest vs newest)
  // History should be sorted newest first
  const oldestScore = history[history.length - 1].scoreAfter;
  const newestScore = history[0].scoreAfter;
  const changePoints = newestScore - oldestScore;

  let changePercent = 0;
  if (oldestScore > 0) {
    changePercent = Math.round((changePoints / oldestScore) * 100);
  }

  // Determine direction (threshold of 5 points)
  let direction: 'improving' | 'declining' | 'stable';
  if (changePoints >= 5) {
    direction = 'improving';
  } else if (changePoints <= -5) {
    direction = 'declining';
  } else {
    direction = 'stable';
  }

  return {
    direction,
    changePoints,
    changePercent,
    bestScore,
    worstScore,
    averageScore,
  };
}

/**
 * Generate chart data for visualization
 */
function generateChartData(
  history: HistoricalAnalysis[],
  currentScore: number,
  currentPrNumber: number
): ChartDataPoint[] {
  // Reverse to show oldest first (left to right on chart)
  const reversed = [...history].reverse();

  const chartData: ChartDataPoint[] = reversed.map((h) => ({
    x: `PR #${h.prNumber}`,
    y: h.scoreAfter,
    label: `${h.prTitle || `PR #${h.prNumber}`}: ${h.scoreAfter}/100 (${h.grade})`,
    isCurrent: false,
  }));

  // Add current analysis as the rightmost point
  chartData.push({
    x: `PR #${currentPrNumber}`,
    y: currentScore,
    label: `Current Analysis: ${currentScore}/100`,
    isCurrent: true,
  });

  return chartData;
}

/**
 * Calculate improvement metrics between two analyses
 */
export function calculateImprovement(
  previousScore: number,
  currentScore: number
): {
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'same';
} {
  const change = currentScore - previousScore;
  let changePercent = 0;
  if (previousScore > 0) {
    changePercent = Math.round((change / previousScore) * 100);
  }

  let direction: 'up' | 'down' | 'same';
  if (change > 0) {
    direction = 'up';
  } else if (change < 0) {
    direction = 'down';
  } else {
    direction = 'same';
  }

  return { change, changePercent, direction };
}

/**
 * Get trend emoji for display
 */
export function getTrendEmoji(direction: 'improving' | 'declining' | 'stable'): string {
  switch (direction) {
    case 'improving':
      return '\u{1F4C8}'; // Chart increasing
    case 'declining':
      return '\u{1F4C9}'; // Chart decreasing
    case 'stable':
      return '\u{2796}';  // Heavy minus sign
  }
}

/**
 * Format trend for display
 */
export function formatTrend(trend: {
  direction: 'improving' | 'declining' | 'stable';
  changePoints: number;
  changePercent: number;
}): string {
  const emoji = getTrendEmoji(trend.direction);
  const sign = trend.changePoints >= 0 ? '+' : '';

  switch (trend.direction) {
    case 'improving':
      return `${emoji} Improving: ${sign}${trend.changePoints} points (${sign}${trend.changePercent}%)`;
    case 'declining':
      return `${emoji} Declining: ${trend.changePoints} points (${trend.changePercent}%)`;
    case 'stable':
      return `${emoji} Stable: ${sign}${trend.changePoints} points`;
  }
}

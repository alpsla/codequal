/**
 * Model Selection Scoring Formula
 * 
 * This module defines the formula used to score and rank different AI models
 * based on their performance characteristics during calibration.
 * 
 * You can modify the weights and calculation methods in this file to change
 * how models are scored without modifying the main calibration code.
 */

// Default weights for different factors (must sum to 1.0)
const DEFAULT_WEIGHTS = {
  quality: 0.50,  // Quality of model responses (higher is better)
  cost: 0.35,     // Cost efficiency (lower cost is better)
  speed: 0.15     // Response time (faster is better)
};

/**
 * Calculate a weighted score for a model based on its performance metrics
 * 
 * @param {Object} metrics - Performance metrics of the model
 * @param {number} metrics.qualityScore - Quality score (0-1)
 * @param {number} metrics.responseTime - Response time in ms
 * @param {Object} metrics.costEstimate - Cost estimation data
 * @param {number} metrics.costEstimate.totalCost - Estimated cost per request
 * @param {Object} weights - Optional custom weights (defaults to DEFAULT_WEIGHTS)
 * @returns {number} The weighted score (higher is better)
 */
function calculateScore(metrics, weights = DEFAULT_WEIGHTS) {
  // Normalize or prepare the raw values
  const quality = metrics.qualityScore || 0.5; // Quality score directly (higher is better)
  const cost = metrics.costEstimate ? (1 / (metrics.costEstimate.totalCost * 10000 || 1)) : 0; // Invert cost (lower is better)
  const speed = 1 / (metrics.responseTime || 1); // Invert response time (lower is better)
  
  // Calculate the weighted score
  const weightedScore = 
    (quality * weights.quality) + 
    (cost * weights.cost) + 
    (speed * weights.speed);
  
  // Return the components for analysis along with the final score
  return {
    weightedScore,
    components: {
      qualityComponent: quality * weights.quality,
      costComponent: cost * weights.cost,
      speedComponent: speed * weights.speed
    },
    weights,
    normalizedValues: {
      quality,
      cost,
      speed
    }
  };
}

// Export the scoring function and default weights
module.exports = {
  calculateScore,
  DEFAULT_WEIGHTS
};
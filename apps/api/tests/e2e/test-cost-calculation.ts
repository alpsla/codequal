#!/usr/bin/env ts-node

// Test cost calculation

const testCases = [
  {
    model: 'gemini-2.0-flash-lite',
    inputPrice: 0.00019,  // per token
    outputPrice: 0.00057, // per token
    tokens: 100000,       // 100k tokens for large comprehensive
    inputRatio: 0.7,
    outputRatio: 0.3
  },
  {
    model: 'gemini-2.0-flash-lite',
    inputPrice: 0.00019,
    outputPrice: 0.00057,
    tokens: 10000,       // 10k tokens for medium standard
    inputRatio: 0.7,
    outputRatio: 0.3
  },
  {
    model: 'gemini-2.0-flash-lite',
    inputPrice: 0.00019,
    outputPrice: 0.00057,
    tokens: 2500,        // 2.5k tokens for small quick
    inputRatio: 0.7,
    outputRatio: 0.3
  }
];

console.log('Cost Calculation Test\n');

for (const test of testCases) {
  const inputTokens = test.tokens * test.inputRatio;
  const outputTokens = test.tokens * test.outputRatio;
  
  const inputCost = (inputTokens / 1_000_000) * test.inputPrice * 1_000_000;
  const outputCost = (outputTokens / 1_000_000) * test.outputPrice * 1_000_000;
  const totalCost = inputCost + outputCost;
  
  console.log(`Tokens: ${test.tokens.toLocaleString()}`);
  console.log(`  Input: ${inputTokens.toLocaleString()} tokens @ $${test.inputPrice}/token = $${inputCost.toFixed(4)}`);
  console.log(`  Output: ${outputTokens.toLocaleString()} tokens @ $${test.outputPrice}/token = $${outputCost.toFixed(4)}`);
  console.log(`  Total: $${totalCost.toFixed(4)}\n`);
}

// Correct calculation
console.log('Correct calculation for Gemini 2.0 Flash Lite:');
console.log('Pricing: $0.19/1M input tokens, $0.57/1M output tokens\n');

for (const test of testCases) {
  const inputTokens = test.tokens * test.inputRatio;
  const outputTokens = test.tokens * test.outputRatio;
  
  // Correct: price is per million tokens, not per token
  const inputCost = (inputTokens / 1_000_000) * 0.19;
  const outputCost = (outputTokens / 1_000_000) * 0.57;
  const totalCost = inputCost + outputCost;
  
  console.log(`${test.tokens.toLocaleString()} tokens: $${totalCost.toFixed(4)}`);
}
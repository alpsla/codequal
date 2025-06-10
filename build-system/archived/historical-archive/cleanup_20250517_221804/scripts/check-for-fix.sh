#!/bin/bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

echo "Running the Claude agent test to check if our fix works..."
npx jest tests/claude-agent.test.ts -t "analyze method calls Claude API and formats result" --silent
if [ $? -eq 0 ]; then
  echo "✅ TEST PASSED! The fix has resolved the issue."
else
  echo "❌ TEST FAILED. The issue is still present."
  exit 1
fi

echo "Verifying message formatting changes in all agent files..."
echo "Claude agent message regex:" 
grep -n "replace(/^\\\s\*-\\\s\*/," src/claude/claude-agent.ts || echo "Not found"
echo "Claude agent suggestion regex:"
grep -n "replace(/^\[\\\\s,-\]*/," src/claude/claude-agent.ts || echo "Not found"

echo "Gemini agent message regex:"
grep -n "replace(/^\\\s\*-\\\s\*/," src/gemini/gemini-agent.ts || echo "Not found"
echo "Gemini agent suggestion regex:"
grep -n "replace(/^\[\\\\s,-\]*/," src/gemini/gemini-agent.ts || echo "Not found"

echo "DeepSeek agent message regex:"
grep -n "replace(/^\\\s\*-\\\s\*/," src/deepseek/deepseek-agent.ts || echo "Not found"
echo "DeepSeek agent suggestion regex:"
grep -n "replace(/^\[\\\\s,-\]*/," src/deepseek/deepseek-agent.ts || echo "Not found"

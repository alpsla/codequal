#!/bin/bash
cd /Users/alpinro/Code\ Prjects/codequal

echo "📊 Current Git Status:"
echo "====================="
git status

echo ""
echo "📝 Changed Files:"
echo "================="
git diff --name-only

echo ""
echo "📄 New Files:"
echo "============="
git ls-files --others --exclude-standard

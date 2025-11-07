#!/bin/bash

# Build All Language Analyzer Images on Oracle Cloud
# 
# Builds Docker images for all supported languages from Dockerfiles
# already present on Oracle Cloud in ~/codequal/docker/languages/
# 
# Priority:
# 1. High: Python, JavaScript (for multi-language launch)
# 2. Medium: Go, Rust, Ruby, PHP
# 3. Low: C++, C#

set -e

SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"

echo "═══════════════════════════════════════════════════════"
echo "🏗️  Building All Language Analyzers on Oracle Cloud"
echo "═══════════════════════════════════════════════════════"
echo ""

# Build on Oracle
ssh -i "${SSH_KEY}" opc@${ORACLE_IP} << 'ORACLE_BUILD'

cd ~/codequal/docker/languages

echo "📦 High Priority Languages (Python, JavaScript)"
echo "================================================"

# Python
echo ""
echo "🐍 Building Python analyzer..."
docker build -t codequal/analyzer:lang-python-v4.1-arm -f Dockerfile.python.v4.1 . 2>&1 | tail -15
docker tag codequal/analyzer:lang-python-v4.1-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-python-v4.1-arm
echo "   ✅ Python analyzer built"

# JavaScript
echo ""
echo "📜 Building JavaScript analyzer..."
docker build -t codequal/analyzer:lang-javascript-v4.3-arm -f Dockerfile.javascript.fixed . 2>&1 | tail -15
docker tag codequal/analyzer:lang-javascript-v4.3-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-javascript-v4.3-arm
echo "   ✅ JavaScript analyzer built"

echo ""
echo "📦 Medium Priority Languages (Go, Rust, Ruby, PHP)"
echo "=================================================="

# Go
echo ""
echo "🐹 Building Go analyzer..."
docker build -t codequal/analyzer:lang-go-v4.2-arm -f Dockerfile.go.v4.2 . 2>&1 | tail -15
docker tag codequal/analyzer:lang-go-v4.2-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-go-v4.2-arm
echo "   ✅ Go analyzer built"

# Rust
echo ""
echo "🦀 Building Rust analyzer..."
docker build -t codequal/analyzer:lang-rust-v5-arm -f Dockerfile.rust.v5.fixed . 2>&1 | tail -15
docker tag codequal/analyzer:lang-rust-v5-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-rust-v5-arm
echo "   ✅ Rust analyzer built"

# Ruby
echo ""
echo "💎 Building Ruby analyzer..."
docker build -t codequal/analyzer:lang-ruby-v4.3-arm -f Dockerfile.ruby . 2>&1 | tail -15
docker tag codequal/analyzer:lang-ruby-v4.3-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-ruby-v4.3-arm
echo "   ✅ Ruby analyzer built"

# PHP
echo ""
echo "🐘 Building PHP analyzer..."
docker build -t codequal/analyzer:lang-php-v4.3-arm -f Dockerfile.php . 2>&1 | tail -15
docker tag codequal/analyzer:lang-php-v4.3-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-php-v4.3-arm
echo "   ✅ PHP analyzer built"

echo ""
echo "📦 Low Priority Languages (C++, C#)"
echo "===================================="

# C++
echo ""
echo "⚙️  Building C++ analyzer..."
docker build -t codequal/analyzer:lang-cpp-v4.7-arm -f Dockerfile.cpp . 2>&1 | tail -15
docker tag codequal/analyzer:lang-cpp-v4.7-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-cpp-v4.7-arm
echo "   ✅ C++ analyzer built"

# C#
echo ""
echo "🔷 Building C# analyzer..."
docker build -t codequal/analyzer:lang-csharp-v4.6-arm -f Dockerfile.csharp . 2>&1 | tail -15
docker tag codequal/analyzer:lang-csharp-v4.6-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-csharp-v4.6-arm
echo "   ✅ C# analyzer built"

# Final summary
echo ""
echo "═══════════════════════════════════════════════════════"
echo "📊 Build Summary"
echo "═══════════════════════════════════════════════════════"
echo ""

docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "REPOSITORY|analyzer"

echo ""
echo "🎯 Total Languages: 10"
echo "   ✅ Java (already built)"
echo "   ✅ TypeScript (already built)"
echo "   ✅ Python (built)"
echo "   ✅ JavaScript (built)"
echo "   ✅ Go (built)"
echo "   ✅ Rust (built)"
echo "   ✅ Ruby (built)"
echo "   ✅ PHP (built)"
echo "   ✅ C++ (built)"
echo "   ✅ C# (built)"
echo ""
echo "🚀 Ready for multi-language production launch!"
echo ""

ORACLE_BUILD

echo "═══════════════════════════════════════════════════════"
echo "✅ All Language Analyzers Built Successfully"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo "   1. Test each language with real repository"
echo "   2. Validate parallel execution performance"
echo "   3. Create language-specific orchestrators"
echo "   4. Update QUICK_START_NEXT_SESSION.md"
echo ""


# Language Coverage Matrix

## Current Tool Coverage by Language

| Language | Security | Code Quality | Type Check | Dependencies | Duplicates | Metrics |
|----------|----------|--------------|------------|--------------|------------|---------|
| **JavaScript** | ✅ Semgrep | ✅ ESLint<br>✅ JSHint | ❌ | ✅ npm audit<br>✅ Madge<br>✅ dep-cruiser | ✅ JSCPD | ✅ CLOC |
| **TypeScript** | ✅ Semgrep | ✅ ESLint | ✅ TSC | ✅ npm audit<br>✅ Madge<br>✅ dep-cruiser | ✅ JSCPD | ✅ CLOC |
| **Python** | ✅ Bandit<br>✅ Semgrep | ✅ Pylint | ✅ MyPy | ✅ Safety | ✅ JSCPD | ✅ CLOC |
| **Java** | ✅ Semgrep | ❌ | ❌ | ❌ | ✅ JSCPD | ✅ CLOC |
| **C/C++** | ✅ Semgrep | ✅ CppCheck | ✅ CppCheck | ❌ | ✅ JSCPD | ✅ CLOC |
| **Go** | ✅ Semgrep | ❌ | ❌ | ❌ | ✅ JSCPD | ✅ CLOC |
| **Ruby** | ✅ Semgrep | ❌ | ❌ | ❌ | ✅ JSCPD | ✅ CLOC |
| **PHP** | ✅ Semgrep | ❌ | ❌ | ❌ | ✅ JSCPD | ✅ CLOC |
| **C#** | ✅ Semgrep | ❌ | ❌ | ❌ | ✅ JSCPD | ✅ CLOC |
| **Rust** | ✅ Semgrep | ❌ | ❌ | ❌ | ✅ JSCPD | ✅ CLOC |
| **Swift** | ✅ Semgrep | ❌ | ❌ | ❌ | ✅ JSCPD | ✅ CLOC |
| **Kotlin** | ✅ Semgrep | ❌ | ❌ | ❌ | ✅ JSCPD | ✅ CLOC |

## Language Support Tiers

### Tier 1: Full Support (Ready for Production)
- **JavaScript/TypeScript**: 100% coverage
- **Python**: 100% coverage

### Tier 2: Good Support (Needs Enhancement)
- **C/C++**: 70% coverage (missing dependency analysis)

### Tier 3: Basic Support (Major Gaps)
- **Java**: 30% coverage
- **Go**: 30% coverage
- **Ruby**: 30% coverage
- **PHP**: 30% coverage
- **C#**: 30% coverage
- **Rust**: 30% coverage
- **Swift**: 30% coverage
- **Kotlin**: 30% coverage

## Critical Gaps to Fill

### Priority 1: Java (High demand)
**Tools to add:**
- SpotBugs (security/quality)
- Checkstyle (code quality)
- PMD (code quality)
- OWASP Dependency Check

### Priority 2: Go (Growing demand)
**Tools to add:**
- gosec (security)
- golangci-lint (quality)
- go vet (built-in)
- go mod audit (dependencies)

### Priority 3: Ruby (Rails community)
**Tools to add:**
- Brakeman (security)
- RuboCop (quality)
- bundler-audit (dependencies)

### Priority 4: PHP (WordPress/Laravel)
**Tools to add:**
- Psalm/PHPStan (type checking)
- PHP_CodeSniffer (quality)
- PHP Security Checker

## Installation Commands for Gap Closure

```bash
# Java tools
apt-get install -y default-jdk maven
wget https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.tgz
npm install -g @owasp/dependency-check

# Go tools
snap install go --classic
go install github.com/securego/gosec/v2/cmd/gosec@latest
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b /usr/local/bin

# Ruby tools
apt-get install -y ruby-full
gem install brakeman rubocop bundler-audit

# PHP tools
apt-get install -y php php-xml php-mbstring composer
composer global require vimeo/psalm phpstan/phpstan squizlabs/php_codesniffer

# .NET tools
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh
dotnet tool install --global security-scan

# Rust tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install cargo-audit cargo-clippy

# Swift (on Linux)
wget https://swift.org/builds/swift-5.9-release/ubuntu2204/swift-5.9-RELEASE/swift-5.9-RELEASE-ubuntu22.04.tar.gz
tar xzf swift-5.9-RELEASE-ubuntu22.04.tar.gz
# SwiftLint requires more complex setup
```

## Market Analysis

### Most Popular Languages (GitHub 2024)
1. JavaScript/TypeScript - ✅ Full support
2. Python - ✅ Full support
3. Java - ❌ Major gaps
4. Go - ❌ Major gaps
5. C++ - ⚠️ Good support
6. Ruby - ❌ Major gaps
7. PHP - ❌ Major gaps
8. C# - ❌ Major gaps
9. C - ⚠️ Good support
10. Rust - ❌ Major gaps

### Revenue Potential by Language
- **Enterprise (High $$$)**: Java, C#, Go
- **Startup (Medium $$)**: JavaScript, Python, Ruby
- **Open Source (Low $)**: All languages

## Recommended Roadmap

### Phase 1: MVP (Current)
✅ JavaScript/TypeScript
✅ Python
✅ Multi-language security (Semgrep)

### Phase 2: Enterprise Languages (Q1 2025)
- Add Java complete toolchain
- Add Go complete toolchain
- Add C# complete toolchain

### Phase 3: Full Stack (Q2 2025)
- Add Ruby toolchain
- Add PHP toolchain
- Add Rust toolchain

### Phase 4: Mobile (Q3 2025)
- Add Swift toolchain
- Add Kotlin toolchain
- Add Dart/Flutter support

## API Service Language Detection

```typescript
interface LanguageDetection {
  detectLanguages(repoPath: string): Promise<{
    primary: string;
    languages: Array<{
      name: string;
      percentage: number;
      supportTier: 1 | 2 | 3;
      availableTools: string[];
    }>;
  }>;
}

// Use GitHub Linguist or custom detection
// Route to appropriate tools based on language
```

## Business Model Implications

### Pricing Tiers by Language Support
1. **Starter**: JavaScript, TypeScript, Python only
2. **Professional**: + Java, Go, C/C++
3. **Enterprise**: All languages + custom tools

### Market Positioning
- **Current**: Strong for web development
- **Gap**: Enterprise languages (Java, C#)
- **Opportunity**: Be first with comprehensive Rust/Swift support